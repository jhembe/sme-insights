# SME Insights — Project Context for Claude

## What This Is
A mobile-first business intelligence SaaS for Tanzanian SMEs. Owners register, log sales and expenses, and get clear analytics — revenue trends, top products, payment method breakdown, profit vs expenses — without needing Excel or an accountant.

**Core promise:** "Know your business."
**NOT** an accounting system. No ledgers, no TRA e-filing. Insights-first.

Target user: An established SME owner (boutique, salon, pharmacy, hardware, restaurant) with 1–10 staff who already uses M-Pesa and is stuck on a notebook or Excel.

## Stack

| Layer | Technology |
|---|---|
| Backend | NestJS (TypeScript) |
| ORM | Prisma 5 (Node 18 constraint — do NOT upgrade to Prisma 6+) |
| Database | PostgreSQL |
| Auth | Passport.js + JWT (access 15m, refresh 7d) |
| Frontend | React 19 + TypeScript + Vite 5 (Node 18 constraint — do NOT upgrade to Vite 6+) |
| Styling | Tailwind CSS 3 |
| Server state | TanStack Query v5 |
| Client state | Zustand (persisted) |
| HTTP | Axios (with JWT refresh interceptor) |
| Routing | React Router v6 |
| Charts | Recharts (M2) |
| File I/O | exceljs + csv-parse (M3) |

**Node version on server: 18.19.1** — this constrains package versions throughout.

## Directory Structure
```
sme-insights/
├── backend/                        # NestJS API
│   ├── prisma/
│   │   └── schema.prisma           # ← SOURCE OF TRUTH for data model
│   ├── src/
│   │   ├── main.ts                 # Bootstrap: ValidationPipe, CORS, /api prefix
│   │   ├── app.module.ts           # Root module
│   │   ├── prisma/                 # Global PrismaService + PrismaModule
│   │   ├── auth/                   # Auth module
│   │   │   ├── auth.controller.ts  # register/login/logout/refresh/me/change-password/forgot-password/reset-password/verify-email/resend-verification
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── dto/                # RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto
│   │   │   ├── strategies/         # JwtStrategy, JwtRefreshStrategy
│   │   │   ├── guards/             # JwtAuthGuard, JwtRefreshGuard
│   │   │   └── decorators/         # @CurrentUser()
│   │   ├── mail/                   # Email service (nodemailer + Gmail SMTP)
│   │   │   ├── mail.service.ts     # sendPasswordReset + sendEmailVerification
│   │   │   └── mail.module.ts
│   │   ├── businesses/             # Business profile CRUD
│   │   ├── products/               # Product catalog + categories + stock adjustments
│   │   ├── sales/                  # Sales CRUD + mark-as-paid
│   │   ├── expenses/               # Expense CRUD + expense categories
│   │   ├── dashboard/              # Summary + analytics + full-analytics endpoints
│   │   ├── customers/              # Customer CRUD
│   │   ├── import-export/          # CSV/Excel import + export (M3)
│   │   ├── team/                   # Team management — org members CRUD (M4)
│   │   └── subscription/           # Plan + usage endpoint (M6)
│   ├── Dockerfile                  # Multi-stage Node 18 Alpine build
│   ├── .env                        # NOT committed — see .env.example
│   └── .env.example
│
├── frontend/                       # React SPA
│   ├── src/
│   │   ├── App.tsx                 # Router + QueryClient setup + ErrorBoundary
│   │   ├── main.tsx
│   │   ├── index.css               # Tailwind directives
│   │   ├── api/
│   │   │   ├── client.ts           # Axios instance + refresh interceptor (skips auth endpoints)
│   │   │   ├── auth.ts             # Auth API calls incl. forgotPassword, resetPassword
│   │   │   ├── businesses.ts       # Includes taxRate in Business type
│   │   │   ├── products.ts         # Products + categories + stock adjustments
│   │   │   ├── sales.ts            # Sales incl. markAsPaid, taxAmount in CreateSaleInput
│   │   │   ├── expenses.ts
│   │   │   ├── dashboard.ts        # summary + full-analytics
│   │   │   ├── customers.ts
│   │   │   ├── team.ts
│   │   │   ├── import-export.ts
│   │   │   └── subscription.ts
│   │   ├── hooks/
│   │   │   └── useRole.ts          # canManageTeam, canViewAnalytics, canManageProducts, etc.
│   │   ├── lib/
│   │   │   ├── format.ts           # formatCurrency, formatDate
│   │   │   └── download.ts         # triggerDownload(blob, filename)
│   │   ├── store/
│   │   │   ├── auth.store.ts       # Zustand auth store (user incl. isVerified, tokens)
│   │   │   └── business.store.ts   # businessId, name, currency, taxRate, organizationId, role
│   │   ├── components/
│   │   │   ├── AppShell.tsx        # Role-aware sidebar + email verification banner + resend button
│   │   │   ├── PwaUpdateBanner.tsx # "New version available / Reload" toast (useRegisterSW)
│   │   │   ├── BusinessGate.tsx    # Loads business + taxRate into store; redirects if no business
│   │   │   ├── ProtectedRoute.tsx  # Redirects to /login if not authed
│   │   │   ├── ErrorBoundary.tsx   # Catches render errors, shows reload button
│   │   │   └── ui/                 # Button, Input, Select, Modal
│   │   └── pages/
│   │       ├── auth/               # LoginPage (show/hide pw), RegisterPage (show/hide pw), ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage
│   │       ├── AnalyticsPage.tsx   # Date presets, trend chart, day-of-week, hour-of-day, product ranking, payment breakdown, basket stats, top customers, credit aging, expense by category, MoM table; InsightPanel with up to 6 auto-generated plain-language observations
│   │       ├── CustomersPage.tsx   # Customer list + add/edit/remove
│   │       ├── DashboardPage.tsx   # Summary cards + charts + low-stock alert + credit owed card
│   │       ├── NotFoundPage.tsx    # 404
│   │       ├── ProductsPage.tsx    # Product grid + stock adjust modal + low-stock ⚠ indicator
│   │       ├── SalesPage.tsx       # All / Credit tabs; mark-as-paid modal; shows item summary per sale; print receipt button (hidden iframe + window.print())
│   │       ├── SalesNewPage.tsx    # Cart/basket UX — multiple items per sale; product typeahead + price ceiling; customer picker; tax breakdown
│   │       ├── ExpensesPage.tsx
│   │       ├── TeamPage.tsx
│   │       ├── BillingPage.tsx
│   │       ├── ChangePasswordPage.tsx
│   │       └── ImportExportPage.tsx
│   └── .env                        # VITE_API_URL (prod: not needed — built with VITE_API_URL=/api)
│
├── docker-compose.yml              # sme_api service on edge_net + data_net (M5)
├── deploy.sh                       # Build frontend + rebuild image + restart container (M5)
├── BACKLOG.md                      # Remaining gaps + deferred decisions
├── CLAUDE.md                       # ← This file
└── [legacy Django files]           # sme/, dashboard/, manage.py etc — retired, safe to delete
```

## Data Model
Defined in `backend/prisma/schema.prisma`. Key shape:

```
User → OrganizationMember (role) → Organization (planId) → Plan
                                         └── BusinessProfile
                                                  ├── Product (+ ProductCategory)
                                                  ├── Customer
                                                  ├── Sale (transaction header) → SaleItem[] (snapshots name+price per item)
                                                  ├── Expense (+ ExpenseCategory)
                                                  └── StockAdjustment
```

**Key decisions:**
- Sale is a **transaction header** — one sale can have one or more `SaleItem` rows
- `SaleItem` stores `productName`, `unitPrice`, `quantity`, `discount`, `lineTotal` as snapshots — historical accuracy
- `SaleItem.productId` is nullable — allows ad-hoc items without a catalog entry
- Data migration 2026-06-05: 17,682 existing single-product Sale rows migrated to SaleItem (1-to-1)
- Payment methods are Tanzania-specific: CASH, MPESA, TIGOPESA, AIRTELMONEY, CARD, BANK_TRANSFER, CREDIT, OTHER
- `BusinessProfile.currency` default "TZS", per-business override allowed
- `User.preferredLanguage` + `Organization.defaultLanguage` for Swahili support
- `Product.stockQuantity` nullable — opt-in inventory tracking per product
- `ProductCategory` has `@@unique([businessId, name])` — enforced in M3 for import upsert safety
- `User.emailVerificationToken` + `User.emailVerificationExpiresAt` — added migration `20260605150000`; token bcrypt-hashed, 24h expiry, cleared on verify

## Auth Flow
- `POST /api/auth/register` — creates User + Organization + OrganizationMember(OWNER) atomically
- `POST /api/auth/login` — returns `{ accessToken, refreshToken, user }`
- `POST /api/auth/logout` — clears `User.hashedRefreshToken`
- `POST /api/auth/refresh` — validates refresh token against stored bcrypt hash, issues new pair
- `GET /api/auth/me` — full user with org + business memberships
- `POST /api/auth/change-password` — change password with current password verification
- `POST /api/auth/forgot-password` — generates 32-byte hex token, bcrypt-hashes, stores with 1h expiry, emails reset link
- `POST /api/auth/reset-password` — validates token against hash, enforces expiry, clears token after use
- `GET /api/auth/verify-email?email=&token=` — public; marks `isVerified = true`, clears token (24h expiry)
- `POST /api/auth/resend-verification` — protected; issues new token and resends verification email
- On register: verification email sent fire-and-forget (SMTP failure never blocks registration)
- Refresh token hash stored in `User.hashedRefreshToken` (one session per user for now)
- `User.passwordResetToken` + `User.passwordResetExpiresAt` — nullable fields added via manual migration
- `User.emailVerificationToken` + `User.emailVerificationExpiresAt` — nullable fields, migration `20260605150000`

## API Conventions
- All routes prefixed `/api`
- NestJS modules per domain (auth, mail, businesses, products, sales, expenses, customers, dashboard, import-export, team, subscription)
- Guards: `@UseGuards(JwtAuthGuard)` on protected routes; forgot-password and reset-password are public
- Current user: `@CurrentUser()` decorator → full user object from JwtStrategy.validate()
- DTOs with class-validator decorators for all request bodies
- Prisma queries scoped to the authenticated user's organizations/businesses
- File uploads use `@UseInterceptors(FileInterceptor('file'))` + `@UploadedFile()` (multer, bundled with @nestjs/platform-express)
- File exports use `@Res() res: Response` + `res.set(headers).end(buffer)` — bypass NestJS serialisation
- Role enforcement via `BusinessesService.assertMinRole(userId, businessId, minRole)` — STAFF/MANAGER/ADMIN/OWNER hierarchy
- Team endpoints at `/api/organizations/:orgId/members`
- Subscription endpoint at `GET /api/organizations/:orgId/subscription` — returns plan + usage counts
- Stock adjustment endpoints at `/api/businesses/:id/products/:productId/stock-adjustments` (GET + POST)
- `totalAmount` on Sale = `SUM(items[].lineTotal) + taxAmount` where `lineTotal = quantity * unitPrice - discount`

## Frontend Conventions
- Pages in `src/pages/`, shared UI in `src/components/ui/`
- API modules in `src/api/` — one file per domain
- Auth state in Zustand (`useAuthStore`) — persisted; includes `isVerified?: boolean`; `setUser(user)` patches user in place (used by VerifyEmailPage)
- Business context in Zustand (`useBusinessStore`) — persisted; includes `businessId, businessName, currency, taxRate, organizationId, role`
- `taxRate` is loaded from `GET /businesses/me` in `BusinessGate.tsx` and stored as a number (e.g. `0.18` = 18%)
- `useRole()` hook in `src/hooks/useRole.ts` — use this for all role-gated UI
- TanStack Query for all server state — one query hook per resource
- Tailwind utility classes only — no CSS modules, no styled-components
- `brand` color palette (green) defined in `tailwind.config.js`
- Email verification banner shown in `AppShell.tsx` when `user.isVerified === false`; includes "Resend verification email" button
- PWA: `vite-plugin-pwa@0.19.8`, `registerType: 'prompt'`, `PwaUpdateBanner` shows on SW update; icons in `frontend/public/icons/`; `scripts/patch-pwa.cjs` MUST run before build (fixes ESM `require` + Worker thread `crypto` for Node 18)
- Dashboard stat cards compare MTD vs LMTD (same day of prior month, not full month)
- `InsightPanel` in AnalyticsPage: `generateInsights(data, currency)` returns up to 6 plain-language strings from the analytics data; rendered as brand-tinted callout between stat rows and trend chart
- Print receipt: `printReceipt(sale, currency, businessName)` in SalesPage creates a hidden `<iframe>`, writes thermal-receipt-style HTML, calls `window.print()`, removes iframe after 1.5 s — no backend or PDF library needed
- `src/hooks/useBrandPalette.ts` — reads `--brand-*` CSS variables reactively (subscribes to `accentColor` in business store); use this in all Recharts so charts follow the user's chosen theme color
- `AppShell.tsx` has `MobileBottomNav`: 5-item bottom bar with raised FAB for `/sales/new`; "More" item opens the mobile drawer
- Stock counts update live: `SalesNewPage` invalidates `['products', businessId]` on sale success; `StockAdjustModal` derives `liveProduct` from the same query cache

## How to Run Locally
```bash
# Requires PostgreSQL running locally

# Backend
cd backend
cp .env.example .env        # fill in DATABASE_URL and JWT secrets
npx prisma migrate dev --name init
npm run start:dev            # http://localhost:3000/api

# Frontend
cd frontend
npm run dev                  # http://localhost:5173
```

## How to Deploy (M5)
```bash
# From /opt/apps/sme-insights/ on the VPS:
./deploy.sh
# Builds frontend (VITE_API_URL=/api), rebuilds Docker image, restarts sme_api container
```

Live at: **https://sme.mahembega.com**

Infrastructure:
- `sme_api` container on `edge_net` (Caddy) + `data_net` (PostgreSQL)
- Database: `sme_insights` on the shared platform PostgreSQL, user `sme_app`
- Caddy routes `/api/*` → `sme_api:3000`, everything else → `/srv/sme` (built frontend)
- TLS: Let's Encrypt via Caddy automatic (HTTP-01)
- On startup: `prisma migrate deploy` runs before `node dist/main.js`

## Milestone Progress

| # | Milestone | Status |
|---|---|---|
| M0 | NestJS scaffold + Prisma schema + Auth | ✅ Done |
| M1 | Business profiles, products, sales entry, basic dashboard | ✅ Done |
| M2 | Analytics dashboard (charts, trends, comparisons) | ✅ Done |
| M3 | CSV/Excel import + export | ✅ Done |
| M4 | Multi-user & teams (invite, roles in UI) | ✅ Done |
| M5 | Production deploy (Docker + Caddy + PostgreSQL) | ✅ Done |
| M6 | Subscription infrastructure (Free plan, usage tracking, billing page) | ✅ Done |
| Backlog | Password reset, email service, customers, analytics page, credit sales, stock adjustments, tax calc, error boundary, 404 | ✅ Done |
| Backlog 2 | Email verification, PWA + update banner, MTD/LMTD dashboard fix, AnalyticsPage layout polish | ✅ Done |
| Backlog 3 | Analytics insights panel, print receipt, dashboard profit margin %, TS build fixes (setUser, PWA types) | ✅ Done |
| Backlog 4 | App title/favicon, live stock after sale, theme-aware charts (useBrandPalette), mobile bottom nav, loading skeletons, empty states, expense delete confirm, PWA Node 18 build fix | ✅ Done |
| M7 | Payment integration (Flutterwave/Pesapal) + paid tiers | ⏳ Next |

## Deployment
- **Live URL:** https://sme.mahembega.com
- **Server:** Ubuntu 24.04 VPS at `204.168.239.86`
- **Path:** `/opt/apps/sme-insights/`
- **Pattern:** `sme_api` Docker container + Caddy reverse proxy + static frontend via Caddy file_server
- **Networks:** `edge_net` (Caddy) + `data_net` (PostgreSQL)
- **Database:** `sme_insights` on shared platform PostgreSQL (`postgres` container), user `sme_app`
- **Infra files:** `docker-compose.yml`, `backend/Dockerfile`, `deploy.sh`
- **Caddy config:** `/opt/infra/Caddyfile` (block for `sme.mahembega.com`)
- **Frontend dist:** `/opt/apps/sme-insights/frontend/dist` mounted into Caddy as `/srv/sme`
