# SME Insights

> **Know your business.** Mobile-first business intelligence for Tanzanian SMEs.

SME Insights gives small business owners — boutiques, salons, pharmacies, hardware stores, restaurants — a clear picture of their revenue, expenses, and profit without needing Excel or an accountant.

Live at **[sme.mahembega.com](https://sme.mahembega.com)**

---

## What it does

- **Sales tracking** — record cash, M-Pesa, credit, and other sales with multi-item cart and tax calculation
- **Expense tracking** — log costs by category to see real profit margins
- **Analytics** — revenue trends, top products, payment method breakdown, day-of-week patterns, month-over-month comparison
- **Inventory** — optional stock tracking with low-stock alerts and adjustment history
- **Customers** — customer directory linked to credit sales
- **Teams** — multi-user with OWNER / ADMIN / MANAGER / STAFF roles
- **Import / Export** — CSV and Excel for bulk data
- **Swahili + English** — full UI in both languages, toggleable per user
- **PWA** — installable on Android/iOS, works offline (sales queue when no signal, auto-syncs on reconnect)
- **Audit log** — tamper-proof record of every action by every team member
- **Print receipts** — thermal-style receipt via browser print, no PDF library needed

---

## Stack

| Layer | Technology |
|---|---|
| Backend | NestJS (TypeScript) |
| ORM | Prisma 5 |
| Database | PostgreSQL |
| Auth | Passport.js + JWT (access 15 min, refresh 7 days, multi-session) |
| Frontend | React 19 + TypeScript + Vite 5 |
| Styling | Tailwind CSS 3 |
| Server state | TanStack Query v5 |
| Client state | Zustand (persisted) |
| HTTP | Axios with JWT refresh interceptor |
| Routing | React Router v6 |
| Charts | Recharts |
| i18n | react-i18next |
| PWA | vite-plugin-pwa + Workbox |

> Node 18.19.1 on the server — constrains package versions throughout.

---

## Running locally

**Requirements:** Node 18, PostgreSQL

```bash
# 1. Backend
cd backend
cp .env.example .env        # fill in DATABASE_URL, JWT secrets, SMTP credentials
npx prisma migrate dev
npm run start:dev            # http://localhost:3000/api

# 2. Frontend (separate terminal)
cd frontend
npm run dev                  # http://localhost:5173
```

### Environment variables

See `backend/.env.example` for the full list. Key ones:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Secret for 15-min access tokens |
| `JWT_REFRESH_SECRET` | Secret for 7-day refresh tokens |
| `JWT_ACCESS_EXPIRES` | e.g. `15m` |
| `JWT_REFRESH_EXPIRES` | e.g. `7d` |
| `SMTP_HOST` | Mail server host |
| `SMTP_USER` | Mail username |
| `SMTP_PASS` | Mail password |
| `FRONTEND_URL` | Used in email links (e.g. `https://sme.mahembega.com`) |

---

## Deploying

From the VPS at `/opt/apps/sme-insights/`:

```bash
./deploy.sh
```

This builds the frontend (`VITE_API_URL=/api`), rebuilds the Docker image, and restarts the `sme_api` container. Prisma migrations run automatically on container start.

### Infrastructure

- **`sme_api`** — NestJS in Docker, on `edge_net` (Caddy) + `data_net` (PostgreSQL)
- **Caddy** — routes `/api/*` → `sme_api:3000`, everything else → built frontend at `/srv/sme`
- **TLS** — Let's Encrypt via Caddy automatic (HTTP-01)
- **Database** — `sme_insights` on shared platform PostgreSQL, user `sme_app`

---

## Data model (key shape)

```
User → OrganizationMember (role) → Organization (planId) → Plan
                                         └── BusinessProfile
                                                  ├── Product (+ ProductCategory)
                                                  ├── Customer
                                                  ├── Sale → SaleItem[] (name+price snapshots)
                                                  ├── Expense (+ ExpenseCategory)
                                                  ├── StockAdjustment
                                                  └── AuditEvent
User → UserSession[]   (multi-device refresh tokens)
```

Sales are transaction headers — one sale can have multiple `SaleItem` rows. Items snapshot `productName`, `unitPrice`, `quantity`, `discount`, `lineTotal` at time of sale for historical accuracy.

---

## Auth flow

| Endpoint | Description |
|---|---|
| `POST /api/auth/register` | Creates User + Organization + OWNER membership atomically, sends verification email |
| `POST /api/auth/login` | Returns `{ accessToken, refreshToken, user }`, creates a `UserSession` |
| `POST /api/auth/logout` | Deletes all sessions for the user |
| `POST /api/auth/refresh` | Validates refresh token against `UserSession`, rotates token |
| `GET /api/auth/me` | Full user with org + business memberships |
| `POST /api/auth/forgot-password` | Emails a 1-hour reset link |
| `POST /api/auth/reset-password` | Validates token, sets new password |
| `GET /api/auth/verify-email` | Marks `isVerified = true`, clears token |
| `POST /api/auth/resend-verification` | Issues new token, resends email |

Multi-device sessions: each login creates a `UserSession` row. Logging in on a second device no longer invalidates the first device's session.

---

## Milestone history

| Milestone | Status |
|---|---|
| M0 — NestJS scaffold + Prisma schema + Auth | ✅ |
| M1 — Business profiles, products, sales, dashboard | ✅ |
| M2 — Analytics dashboard (charts, trends) | ✅ |
| M3 — CSV/Excel import + export | ✅ |
| M4 — Multi-user & teams | ✅ |
| M5 — Production deploy (Docker + Caddy) | ✅ |
| M6 — Subscription infrastructure (Free plan, billing page) | ✅ |
| Backlog — Password reset, email verification, customers, credit sales, stock adjustments, tax, print receipt, PWA, Swahili i18n, audit log, multi-session, offline queue | ✅ |
| M7 — Payment integration (Flutterwave/Pesapal) + paid tiers | ⏳ Next |

---

## License

Private — all rights reserved.
