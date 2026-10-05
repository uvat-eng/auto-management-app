import base64
import json
import os
import uuid

import boto3
import psycopg2

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
    "Access-Control-Max-Age": "86400",
}
SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


def reply(code: int, data) -> dict:
    return {"statusCode": code, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(data, ensure_ascii=False)}


def text(v, size: int):
    return str(v)[:size] if v not in (None, "") else None


def handler(event: dict, context) -> dict:
    """Облачный гараж пользователя: список машин, сохранение, архив, удаление и загрузка фото в хранилище."""
    method = event.get("httpMethod")
    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    token = headers.get("x-auth-token", "")
    if not token:
        return reply(401, {"error": "Нужно войти"})

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    cur = conn.cursor()
    try:
        cur.execute(f"SELECT user_id FROM {SCHEMA}.sessions WHERE token = %s AND expires_at > NOW()", (token,))
        row = cur.fetchone()
        if not row:
            return reply(401, {"error": "Сессия истекла, войдите снова"})
        user_id = row[0]

        if method == "GET":
            cur.execute(
                f"SELECT data, archived_at IS NOT NULL FROM {SCHEMA}.cars "
                f"WHERE user_id = %s AND removed_at IS NULL ORDER BY created_at",
                (user_id,),
            )
            cars = [{**data, "archived": archived} for data, archived in cur.fetchall()]
            return reply(200, {"cars": cars})

        payload = event.get("body") or "{}"
        if event.get("isBase64Encoded"):
            payload = base64.b64decode(payload).decode("utf-8")
        body = json.loads(payload)

        if method == "DELETE":
            car_id = (event.get("queryStringParameters") or {}).get("id") or body.get("id")
            cur.execute(
                f"UPDATE {SCHEMA}.cars SET removed_at = NOW(), updated_at = NOW() WHERE user_id = %s AND id = %s",
                (user_id, car_id),
            )
            return reply(200, {"ok": True})

        if method == "POST" and body.get("action") == "upload":
            image = body.get("image") or ""
            if not image.startswith("data:") or "," not in image:
                return reply(400, {"error": "Нет фото"})
            head, data = image.split(",", 1)
            mime = head[5:].split(";")[0]
            ext = TYPES.get(mime, "jpg")
            key = f"users/{user_id}/{uuid.uuid4().hex}.{ext}"
            s3 = boto3.client(
                "s3",
                endpoint_url="https://bucket.poehali.dev",
                aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
                aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
            )
            s3.put_object(Bucket="files", Key=key, Body=base64.b64decode(data), ContentType=mime or "image/jpeg")
            url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
            return reply(200, {"url": url})

        if method == "PUT":
            car = body.get("car") or {}
            car_id = text(car.get("id"), 64)
            if not car_id:
                return reply(400, {"error": "Нет машины"})
            archived = bool(car.pop("archived", False))
            car.pop("heroStatus", None)
            mileage = car.get("mileage")
            cur.execute(
                f"INSERT INTO {SCHEMA}.cars (id, user_id, make, plate, vin, year, mileage, data, archived_at) "
                f"VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CASE WHEN %s THEN NOW() END) "
                f"ON CONFLICT (user_id, id) DO UPDATE SET make = EXCLUDED.make, plate = EXCLUDED.plate, "
                f"vin = EXCLUDED.vin, year = EXCLUDED.year, mileage = EXCLUDED.mileage, data = EXCLUDED.data, "
                f"archived_at = CASE WHEN %s THEN COALESCE({SCHEMA}.cars.archived_at, NOW()) END, "
                f"removed_at = NULL, updated_at = NOW()",
                (
                    car_id,
                    user_id,
                    text(car.get("make"), 255),
                    text(car.get("plate"), 32),
                    text(car.get("vin"), 32),
                    text(car.get("year"), 8),
                    int(mileage) if isinstance(mileage, (int, float)) else None,
                    json.dumps(car, ensure_ascii=False),
                    archived,
                    archived,
                ),
            )
            return reply(200, {"ok": True})

        return reply(400, {"error": "Неизвестное действие"})
    finally:
        cur.close()
        conn.close()
