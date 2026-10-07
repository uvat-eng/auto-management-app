import hashlib
import hmac
import json
import os
import re
import secrets
from datetime import datetime, timedelta

import psycopg2

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
    "Access-Control-Max-Age": "86400",
}
SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
LOGIN_RE = re.compile(r"^[a-zA-Z0-9_.@\-]{3,64}$")
ITER = 120000


def reply(code: int, data: dict) -> dict:
    return {"statusCode": code, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(data, ensure_ascii=False)}


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), ITER).hex()
    return f"pbkdf2${ITER}${salt}${digest}"


def check_password(password: str, stored: str) -> bool:
    _, it, salt, digest = stored.split("$")
    calc = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), int(it)).hex()
    return hmac.compare_digest(calc, digest)


def new_recovery() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    raw = "".join(secrets.choice(alphabet) for _ in range(12))
    return f"{raw[:4]}-{raw[4:8]}-{raw[8:]}"


def norm_code(code: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", str(code or "").upper())


def new_session(cur, user_id: int) -> str:
    token = secrets.token_hex(32)
    cur.execute(
        f"INSERT INTO {SCHEMA}.sessions (token, user_id, expires_at) VALUES (%s, %s, %s)",
        (token, user_id, datetime.utcnow() + timedelta(days=180)),
    )
    return token


def handler(event: dict, context) -> dict:
    """Регистрация, вход, выход, удаление аккаунта, обращения в поддержку и проверка сессии."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    token = headers.get("x-auth-token", "")
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    cur = conn.cursor()

    try:
        if event.get("httpMethod") == "GET":
            if not token:
                return reply(401, {"error": "Нужно войти"})
            cur.execute(
                f"SELECT u.id, u.login FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id "
                f"WHERE s.token = %s AND s.expires_at > NOW()",
                (token,),
            )
            row = cur.fetchone()
            if not row:
                return reply(401, {"error": "Сессия истекла, войдите снова"})
            return reply(200, {"user": {"id": row[0], "login": row[1]}})

        body = json.loads(event.get("body") or "{}")
        action = body.get("action")

        if action == "new_code":
            cur.execute(f"SELECT user_id FROM {SCHEMA}.sessions WHERE token = %s AND expires_at > NOW()", (token,))
            row = cur.fetchone()
            if not row:
                return reply(401, {"error": "Нужно войти"})
            code = new_recovery()
            cur.execute(f"UPDATE {SCHEMA}.users SET recovery_hash = %s WHERE id = %s", (hash_password(norm_code(code)), row[0]))
            return reply(200, {"recovery": code})

        if action == "logout":
            if token:
                cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at = NOW() WHERE token = %s", (token,))
            return reply(200, {"ok": True})

        if action == "support":
            contact = str(body.get("contact") or "").strip()[:200]
            message = str(body.get("message") or "").strip()[:5000]
            if len(contact) < 3 or len(message) < 5:
                return reply(400, {"error": "Укажите контакт для ответа и опишите вопрос"})
            cur.execute(
                f"INSERT INTO {SCHEMA}.support_requests (name, contact, message) VALUES (%s, %s, %s)",
                (str(body.get("name") or "").strip()[:120], contact, message),
            )
            return reply(200, {"ok": True})

        if action == "delete_account":
            cur.execute(
                f"SELECT u.id, u.password_hash FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id = s.user_id "
                f"WHERE s.token = %s AND s.expires_at > NOW()",
                (token,),
            )
            row = cur.fetchone()
            if not row:
                return reply(401, {"error": "Нужно войти"})
            if not check_password(str(body.get("password") or ""), row[1]):
                return reply(403, {"error": "Неверный пароль"})
            cur.execute(f"DELETE FROM {SCHEMA}.sessions WHERE user_id = %s", (row[0],))
            cur.execute(f"DELETE FROM {SCHEMA}.cars WHERE user_id = %s", (row[0],))
            cur.execute(f"DELETE FROM {SCHEMA}.users WHERE id = %s", (row[0],))
            return reply(200, {"ok": True})

        login = str(body.get("login") or "").strip().lower()
        password = str(body.get("password") or "")

        if action == "reset":
            if len(password) < 6:
                return reply(400, {"error": "Новый пароль должен быть не короче 6 символов"})
            cur.execute(f"SELECT id, recovery_hash FROM {SCHEMA}.users WHERE login = %s", (login,))
            row = cur.fetchone()
            if not row or not row[1] or not check_password(norm_code(body.get("code")), row[1]):
                return reply(401, {"error": "Неверный логин или код восстановления"})
            code = new_recovery()
            cur.execute(
                f"UPDATE {SCHEMA}.users SET password_hash = %s, recovery_hash = %s WHERE id = %s",
                (hash_password(password), hash_password(norm_code(code)), row[0]),
            )
            cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at = NOW() WHERE user_id = %s", (row[0],))
            return reply(200, {"token": new_session(cur, row[0]), "user": {"id": row[0], "login": login}, "recovery": code})

        if not LOGIN_RE.match(login):
            return reply(400, {"error": "Логин: от 3 символов, латиница, цифры, точка, дефис или @"})
        if len(password) < 6:
            return reply(400, {"error": "Пароль должен быть не короче 6 символов"})

        if action == "register":
            if not body.get("consent"):
                return reply(400, {"error": "Нужно принять условия использования"})
            cur.execute(f"SELECT 1 FROM {SCHEMA}.users WHERE login = %s", (login,))
            if cur.fetchone():
                return reply(409, {"error": "Такой логин уже занят"})
            code = new_recovery()
            cur.execute(
                f"INSERT INTO {SCHEMA}.users (login, password_hash, recovery_hash) VALUES (%s, %s, %s) RETURNING id",
                (login, hash_password(password), hash_password(norm_code(code))),
            )
            user_id = cur.fetchone()[0]
            return reply(200, {"token": new_session(cur, user_id), "user": {"id": user_id, "login": login}, "recovery": code})

        if action == "login":
            cur.execute(f"SELECT id, password_hash FROM {SCHEMA}.users WHERE login = %s", (login,))
            row = cur.fetchone()
            if not row or not check_password(password, row[1]):
                return reply(401, {"error": "Неверный логин или пароль"})
            return reply(200, {"token": new_session(cur, row[0]), "user": {"id": row[0], "login": login}})

        return reply(400, {"error": "Неизвестное действие"})
    finally:
        cur.close()
        conn.close()