import base64
import json
import os
import uuid

import boto3
import requests

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
}

PROMPT = (
    "the car stands on a glossy black floor in a pitch-black luxury photo studio, "
    "soft cinematic rim light outlining the body, subtle reflections on the floor, "
    "low-key dramatic lighting, dark empty background, premium automotive photography"
)


def reply(code: int, data: dict) -> dict:
    return {"statusCode": code, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(data, ensure_ascii=False)}


def handler(event: dict, context) -> dict:
    """Превращает фото машины пользователя в студийный кадр на чёрном фоне для главного экрана и сохраняет его в облако."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}
    if event.get("httpMethod") != "POST":
        return reply(405, {"error": "Метод не поддерживается"})

    payload = event.get("body") or "{}"
    if event.get("isBase64Encoded"):
        payload = base64.b64decode(payload).decode("utf-8")
    body = json.loads(payload or "{}")
    image = body.get("image") or ""
    if image.startswith("http"):
        src = requests.get(image, timeout=15)
        if src.status_code != 200:
            return reply(400, {"error": "Не удалось открыть фото"})
        raw = src.content
    else:
        if "," in image:
            image = image.split(",", 1)[1]
        if not image:
            return reply(400, {"error": "Нет фото"})
        raw = base64.b64decode(image)

    key = os.environ.get("PHOTOROOM_API_KEY")
    if not key:
        return reply(503, {"error": "Обработка фото ещё не подключена"})

    res = requests.post(
        "https://image-api.photoroom.com/v2/edit",
        headers={"x-api-key": key, "pr-ai-background-model-version": "background-studio-beta-2025-03-17"},
        files={"imageFile": ("car.jpg", raw, "image/jpeg")},
        data={
            "background.prompt": PROMPT,
            "background.seed": str(body.get("seed") or 117879368),
            "shadow.mode": "ai.soft",
            "outputSize": "1440x1080",
            "padding": "0.1",
            "paddingBottom": "0.2",
            "verticalAlignment": "bottom",
            "export.format": "jpeg",
        },
        timeout=60,
    )
    if res.status_code != 200:
        print("photoroom error", res.status_code, res.text[:500])
        return reply(502, {"error": "Не удалось обработать фото, попробуйте другое"})

    s3 = boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )
    path = f"studio/{uuid.uuid4().hex}.jpg"
    s3.put_object(Bucket="files", Key=path, Body=res.content, ContentType="image/jpeg")
    url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{path}"
    return reply(200, {"url": url})