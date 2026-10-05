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


def new_session(cur, user_id: int) -> str:
    token = secrets.token_hex(32)
    cur.execute(
        f"INSERT INTO {SCHEMA}.sessions (token, user_id, expires_at) VALUES (%s, %s, %s)",
        (token, user_id, datetime.utcnow() + timedelta(days=180)),
    )
    return token


def handler(event: dict, context) -> dict:
    """Регистрация, вход, выход и проверка сессии пользователя по логину и паролю."""
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

        if action == "logout":
            if token:
                cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at = NOW() WHERE token = %s", (token,))
            return reply(200, {"ok": True})

        login = str(body.get("login") or "").strip().lower()
        password = str(body.get("password") or "")
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
            cur.execute(
                f"INSERT INTO {SCHEMA}.users (login, password_hash) VALUES (%s, %s) RETURNING id",
                (login, hash_password(password)),
            )
            user_id = cur.fetchone()[0]
            return reply(200, {"token": new_session(cur, user_id), "user": {"id": user_id, "login": login}})

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
