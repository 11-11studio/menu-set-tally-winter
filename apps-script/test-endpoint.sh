#!/bin/bash
# Test rapido del Web App Apps Script "Cosa mangi oggi?".
# Uso: ./test-endpoint.sh https://script.google.com/macros/s/XXXXX/exec
#
# Fa 3 chiamate: ping, POST di prova, GET del giorno. Usa -L perché
# Apps Script risponde con un redirect 302 prima del JSON vero.

set -euo pipefail

URL="${1:-}"
if [ -z "$URL" ]; then
  echo "Uso: $0 <URL /exec>"
  exit 1
fi

GIORNO="2026-09-08"

echo "== 1) Ping =="
curl -s -L "${URL}?ping=1"
echo -e "\n"

echo "== 2) POST di prova (Test Claudio, ${GIORNO}) =="
curl -s -L -X POST "${URL}" \
  -H "Content-Type: text/plain;charset=utf-8" \
  -d "{\"giorno\":\"${GIORNO}\",\"nome\":\"Test Claudio\",\"gruppo\":\"Prova\",\"primo\":\"Gricia\",\"secondo\":\"—\",\"contorno\":\"Patate\",\"note\":\"riga di test, si può cancellare\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
echo -e "\n"

echo "== 3) GET del giorno ${GIORNO} =="
curl -s -L "${URL}?giorno=${GIORNO}"
echo -e "\n"

echo "Fatto. Controlla che ogni risposta sia JSON con \"ok\":true (non pagina HTML)."
