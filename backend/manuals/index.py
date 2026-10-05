import json
from concurrent.futures import ThreadPoolExecutor
import os
import re
import time
import uuid
from urllib.parse import urlparse

import boto3
import psycopg2
import requests

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
    "Access-Control-Max-Age": "86400",
}
SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "public")
SEARCH_URL = "https://api.firecrawl.dev/v2/search"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
MAX_BYTES = 45 * 1024 * 1024

OFFICIAL = [
    "lada.ru", "mercedes-benz", "mbusa.com", "bmw", "toyota", "lexus", "kia.com", "hyundai", "nissan", "mazda",
    "volkswagen", "vw.", "skoda", "audi", "renault", "ford", "chery", "haval", "geely", "exeed", "omoda",
    "changan", "uaz.ru", "gaz.ru", "mitsubishi", "subaru", "honda", "porsche", "volvo", "jeep", "chevrolet", "tank",
]
ALIASES = {"лада": "lada", "ваз": "lada", "тойота": "toyota", "мерседес": "mercedes", "бмв": "bmw", "киа": "kia", "хендай": "hyundai", "хендэ": "hyundai", "шкода": "skoda", "фольксваген": "volkswagen", "ниссан": "nissan", "рено": "renault", "форд": "ford", "мазда": "mazda", "чери": "chery", "хавал": "haval", "джили": "geely", "уаз": "uaz", "газ": "gaz"}
BAD = ["wikipedia", "wikiwand", "scribd.com", "pinterest", "youtube", "workshopmanuals", "ebay", "amazon", "aliexpress", "avito", "ozon"]
BAD_WORDS = ["brochure", "brosh", "price", "прайс", "каталог запчаст", "workshop", "ремонт", "repair", "service-manual", "service manual"]


def reply(code: int, data) -> dict:
    return {"statusCode": code, "headers": {**CORS, "Content-Type": "application/json"}, "body": json.dumps(data, ensure_ascii=False)}


def search(query: str, limit: int = 8) -> list:
    r = requests.post(SEARCH_URL, json={"query": query, "limit": limit}, timeout=2.4)
    if r.status_code != 200:
        return []
    return (r.json().get("data") or {}).get("web") or []


def safe_search(query: str) -> list:
    try:
        return search(query)
    except Exception:
        return []


def score(item: dict, make_words: list) -> int:
    url = (item.get("url") or "").lower()
    text = f"{item.get('title') or ''} {item.get('description') or ''}".lower()
    host = urlparse(url).netloc
    s = 0
    if url.endswith(".pdf") or ".pdf?" in url:
        s += 40
    if any(o in host or o in url for o in OFFICIAL):
        s += 30
    if any(w in text for w in ["руководство по эксплуатации", "owner's manual", "owners manual", "инструкция по эксплуатации"]):
        s += 20
    hits = sum(1 for w in make_words if w in url or w in text)
    if make_words and not any(make_words[0] in x for x in (url, text)):
        return -100
    s += 8 * hits
    if any(b in host for b in BAD):
        s -= 80
    if any(b in url or b in text for b in BAD_WORDS + ["warranty", "leaflet", "brochures"]):
        s -= 35
    if re.search(r"[а-яё]", text) or "/ru" in url or "_ru" in url or ".ru/" in url or "-ru" in url:
        s += 10
    return s


def pdfs_from_page(item: dict, words: list) -> list:
    url = item["url"]
    try:
        r = requests.get(url, headers={"User-Agent": UA}, timeout=(1.5, 2))
    except requests.RequestException:
        return []
    if r.status_code != 200 or "html" not in r.headers.get("content-type", ""):
        return []
    found = []
    for href in re.findall(r'href="([^"]+?\.pdf[^"]*)"', r.text, flags=re.I)[:12]:
        full = requests.compat.urljoin(url, href.replace("&amp;", "&"))
        name = full.rsplit("/", 1)[-1].lower()
        if any(b in name for b in ["price", "brochure", "prays", "catalog"]):
            continue
        if words and words[0] not in full.lower() and not any(w in name for w in words[1:]):
            continue
        found.append({"url": full, "title": f"{item.get('title') or ''} · {name}"[:160], "description": item.get("description") or "", "score": item["score"] + 25 - len(found)})
    return found[:3]


def find(make: str, year: str) -> list:
    words = [w for w in re.split(r"[\s\-]+", make.lower()) if len(w) > 1]
    words = [ALIASES.get(w, w) for w in words]
    queries = [
        f'"{make}" руководство по эксплуатации pdf',
        f"{make} руководство по эксплуатации скачать pdf",
        f"{make} {year} owner's manual pdf".replace("  ", " "),
    ]
    t0 = time.time()
    with ThreadPoolExecutor(3) as ex:
        batches = list(ex.map(safe_search, queries))
    seen, items = set(), []
    for batch in batches:
        for it in batch:
            u = it.get("url")
            if u and u not in seen:
                seen.add(u)
                items.append({**it, "score": score(it, words)})
    if time.time() - t0 > 2.6:
        items.sort(key=lambda i: i["score"], reverse=True)
        return [
            {"url": i["url"], "title": (i.get("title") or "")[:160], "source": urlparse(i["url"]).netloc.replace("www.", ""), "pdf": i["url"].lower().split("?")[0].endswith(".pdf")}
            for i in items
            if i["score"] > 0
        ][:6]
    pages = [i for i in sorted(items, key=lambda i: i["score"], reverse=True) if not i["url"].lower().split("?")[0].endswith(".pdf") and i["score"] >= 30][:3]
    if pages:
        with ThreadPoolExecutor(3) as ex:
            for extra in ex.map(lambda it: pdfs_from_page(it, words), pages):
                for e in extra:
                    if e["url"] not in seen:
                        seen.add(e["url"])
                        items.append(e)
    items.sort(key=lambda i: i["score"], reverse=True)
    return [
        {"url": i["url"], "title": (i.get("title") or "")[:160], "source": urlparse(i["url"]).netloc.replace("www.", ""), "pdf": i["url"].lower().split("?")[0].endswith(".pdf")}
        for i in items
        if i["score"] > 0
    ][:6]


def store_pdf(url: str, user_id: int, budget: float):
    started = time.time()
    with requests.get(url, headers={"User-Agent": UA, "Accept": "application/pdf,*/*"}, stream=True, timeout=(2, 2.5)) as r:
        if r.status_code != 200:
            return None
        chunks, size = [], 0
        for chunk in r.iter_content(256 * 1024):
            chunks.append(chunk)
            size += len(chunk)
            if size > MAX_BYTES or time.time() - started > budget:
                return None
    data = b"".join(chunks)
    if not data.startswith(b"%PDF"):
        return None
    key = f"users/{user_id}/manuals/{uuid.uuid4().hex}.pdf"
    s3 = boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )
    s3.put_object(Bucket="files", Key=key, Body=data, ContentType="application/pdf", ContentDisposition="inline")
    return {"url": f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}", "size": len(data)}


def handler(event: dict, context) -> dict:
    """Автопоиск руководства по эксплуатации автомобиля в интернете и сохранение PDF в облако пользователя."""
    started = time.time()
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    token = headers.get("x-auth-token", "")
    if not token:
        return reply(401, {"error": "Нужно войти"})
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    cur.execute(f"SELECT user_id FROM {SCHEMA}.sessions WHERE token = %s AND expires_at > NOW()", (token,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if not row:
        return reply(401, {"error": "Сессия истекла, войдите снова"})
    user_id = row[0]

    body = json.loads(event.get("body") or "{}")
    action = body.get("action")

    if action == "search":
        make = str(body.get("make") or "").strip()[:80]
        if len(make) < 2:
            return reply(400, {"error": "Укажите марку и модель машины"})
        results = find(make, str(body.get("year") or "").strip()[:4])
        if not results:
            return reply(404, {"error": "Не нашли руководство. Попробуйте уточнить модель в карточке машины."})
        return reply(200, {"results": results})

    if action == "save":
        url = str(body.get("url") or "")
        if not url.startswith(("http://", "https://")):
            return reply(400, {"error": "Нет ссылки"})
        stored = None
        try:
            budget = float(os.environ.get("MANUAL_DOWNLOAD_BUDGET", "0")) or max(1.0, 3.3 - (time.time() - started))
            stored = store_pdf(url, user_id, budget)
        except requests.RequestException:
            stored = None
        if stored:
            return reply(200, {"url": stored["url"], "size": stored["size"], "stored": True})
        return reply(200, {"url": url, "stored": False})

    return reply(400, {"error": "Неизвестное действие"})
