# SME Insights — Project Context for Claude

## What This Is
Django 5.2 web app providing a business analytics/insights dashboard for Tanzanian SMEs. Owners register their business, log sales, and get analytics on performance. Eventually a SaaS-style platform where multiple SME owners each manage their own data.

## Stack
- **Backend:** Django 5.2, Python 3.13, Django REST Framework
- **Database:** SQLite (dev) → PostgreSQL (production target)
- **Data layer:** pandas, numpy, openpyxl (for analytics and Excel exports)
- **Forms:** django-crispy-forms
- **Filtering:** django-filter
- **Frontend:** Django templates (server-rendered), currently bare-bones

## Directory Structure
```
sme-insights/
├── sme_core/          # Django project config (settings, urls, wsgi, asgi)
├── sme/               # Core app: models, DRF API, serializers, permissions
│   ├── models.py      # BusinessProfile, Sale
│   ├── views.py       # DRF generic views for BusinessProfile API
│   ├── serializers.py
│   ├── permissions.py # IsOwnerOrReadOnly
│   └── urls.py        # /api/business-profiles/
├── dashboard/         # Frontend app: Django template views
│   ├── views/home.py  # HomeView (TemplateView)
│   ├── templates/dashboard/home.html  # Currently bare HTML stub
│   └── urls.py
├── urls.py            # Root URL conf (admin + api/)
├── manage.py
├── requirements.txt   # pip-compiled from requirements.in
├── db.sqlite3         # Dev database (not committed in prod)
└── .env               # Not committed — see .env.example
```

## Models
- **BusinessProfile** — tied to a Django `User` (FK). Fields: name, owner_name, email, phone_number, address, business_type, registration_number, website.
- **Sale** — tied to a `BusinessProfile` (FK). Fields: date, product_name, quantity, unit_price, total_amount, payment_method.

## API Endpoints (current)
| Method | URL | Description |
|---|---|---|
| GET/POST | `/api/business-profiles/` | List own profiles / create new |
| GET/PUT/PATCH/DELETE | `/api/business-profiles/<pk>/` | Detail, update, delete |

Sale endpoints not yet built.

## Current State — What Exists vs What's TODO
**Done:**
- Django project scaffold
- BusinessProfile + Sale models with migrations
- DRF API for BusinessProfile (list/create/retrieve/update/destroy)
- IsOwnerOrReadOnly permission
- CI workflow (GitHub Actions)

**Not yet built:**
- Sale API endpoints (CRUD)
- Dashboard views with real data (charts, analytics)
- User registration / auth flow (login, signup pages)
- PostgreSQL config
- Docker + docker-compose.yml
- Caddy integration (for deployment on mahembega.com)
- Environment variable handling (SECRET_KEY currently hardcoded — must fix before deploy)
- Static files config (STATIC_ROOT for production)
- `.env` file support

## Environment Variables Needed
See `.env.example`. Key vars:
- `SECRET_KEY` — Django secret key (must be changed from the insecure default)
- `DEBUG` — `True` for dev, `False` for prod
- `ALLOWED_HOSTS` — comma-separated list (e.g. `sme.mahembega.com,localhost`)
- `DATABASE_URL` — for PostgreSQL in production

## How to Run Locally
```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in values
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

## Deployment Target
- **Server:** Ubuntu 24.04 VPS at `204.168.239.86`
- **Path:** `/opt/apps/sme-insights/`
- **Domain:** TBD (likely `sme.mahembega.com`)
- **Pattern:** Docker container + Caddy reverse proxy (same pattern as all other apps on this server)
- **Network:** `edge_net` (shared Docker network with Caddy)
- **Files needed:** `Dockerfile`, `docker-compose.yml`, Caddy block in `/opt/infra/Caddyfile`

## Coding Conventions
- DRF generic views for API endpoints
- Each app has its own `urls.py` included via `urls.py` root
- Views split into individual files under `views/` subdirectory
- Models use `related_name` on all FK fields
- `perform_create` used to inject `request.user` into owned objects
