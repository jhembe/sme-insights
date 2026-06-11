#!/bin/sh
set -e

cd "$(dirname "$0")"

echo "==> Building frontend..."
cd frontend
VITE_API_URL=/api npm run build
cd ..

echo "==> Building and (re)starting API container..."
docker compose build sme_api
docker compose up -d sme_api

echo "==> Done. API logs:"
docker compose logs --tail=30 sme_api
