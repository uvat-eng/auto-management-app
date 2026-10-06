#!/bin/bash
# Собирает «Автопарк» и кладёт его внутрь приложения для iPhone (ios/Resources/www).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/ios/Resources/www"

cd "$ROOT"
if [ ! -d node_modules ]; then
  npm install --no-audit --no-fund
fi

rm -rf "$OUT"
npx vite build --outDir "$OUT" --emptyOutDir

# Файлы, которые нужны только сайту: скачивание APK, архивы, служебные картинки.
rm -f "$OUT"/*.apk "$OUT"/*.zip "$OUT"/ios-icon-1024.png "$OUT"/emblem.png "$OUT"/sw.js "$OUT"/robots.txt

# Убираем из страницы служебные скрипты редактора и счётчик посещений сайта.
python3 - "$OUT/index.html" <<'PY'
import re, sys
p = sys.argv[1]
s = open(p, encoding="utf-8").read()
s = re.sub(r'\s*<script[^>]*src="https://cdn\.poehali\.dev/intertnal/[^"]*"[^>]*>\s*</script>', "", s)
s = re.sub(r'<!-- Yandex\.Metrika counter -->.*?<!-- /Yandex\.Metrika counter -->', "", s, flags=re.S)
s = re.sub(r'\s*<!-- IMPORTANT: DO NOT REMOVE THIS SCRIPT TAG OR THIS COMMENT! -->', "", s)
s = re.sub(r'\s*<meta property="og:[^>]*>|\s*<meta name="twitter:[^>]*>', "", s)
open(p, "w", encoding="utf-8").write(s)
left = re.findall(r'<script[^>]*src="https?://[^"]*"', s)
if left:
    print("Внешние скрипты остались:", left)
PY

test -f "$OUT/index.html"
echo "Готово: $(find "$OUT" -type f | wc -l | tr -d ' ') файлов, $(du -sh "$OUT" | cut -f1)"
