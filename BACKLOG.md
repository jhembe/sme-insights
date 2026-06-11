# SME Insights — Backlog & Known Gaps

Captured after M6 (2026-06-04). Updated 2026-06-05 after backlog sprint + email verification + PWA + analytics polish.
Items are grouped by priority. ✅ = done.

---

## P0 — Blockers ✅ All done

### ✅ 1. Password reset / forgot password
- `POST /api/auth/forgot-password` + `POST /api/auth/reset-password` — done
- ForgotPasswordPage + ResetPasswordPage — done
- `passwordResetToken` + `passwordResetExpiresAt` on User — done (manual migration)

### ✅ 2. Email service
- `MailService` (nodemailer + Gmail SMTP) in `src/mail/` — done
- SMTP: `smtp.gmail.com:587`, `code.saphire@gmail.com` (same creds as dse-pulse)
- Sends password reset emails

---

## P1 — Important gaps ✅ All done

### ✅ 3. Customer management
- Full CRUD at `/api/businesses/:id/customers` — done
- `CustomersPage.tsx` at `/customers` with search + add/edit/remove — done
- `CustomerPicker` typeahead in SalesNewPage — done
- Sidebar nav link — done

### ✅ 4. Inventory / stock management
- `POST/GET /api/businesses/:id/products/:productId/stock-adjustments` — done
- Stock adjust modal on ProductsPage: RESTOCK / RETURN / DAMAGE / ADJUSTMENT — done
- Low-stock ⚠ indicator on product cards — done
- Stock deduction on sale create (if product has tracking) — done
- Dashboard low-stock alert card — done

### ✅ 5. Credit sales / accounts receivable
- "Credit / Unpaid" tab on SalesPage — done
- Mark-as-paid modal (select actual payment method received) — done
- "Credit owed" card on Dashboard — done

---

## P2 — Product quality improvements

### ✅ 7. Tax calculation
- `taxRate` from BusinessProfile now flows to frontend (business store) — done
- `SalesNewPage` shows tax line breakdown when `taxRate > 0` — done
- `taxAmount` stored on Sale in DB — done

### ✅ 8. PWA (Progressive Web App)
- `vite-plugin-pwa@0.19.8` installed; `registerType: 'prompt'` — shows "A new version is available / Reload" banner on update
- `PwaUpdateBanner.tsx` component using `useRegisterSW` hook
- `public/icons/icon-192.png` + `icon-512.png` — lowercase "sme" on brand green rounded rect, generated with Playwright
- Service worker caches all JS/CSS/HTML + NetworkFirst for `/api/*` with 10s timeout
- Offline *data entry* still deferred

### ✅ 9. Email verification
- `emailVerificationToken` + `emailVerificationExpiresAt` added to User schema (migration `20260605150000`)
- On `POST /api/auth/register`: generates 32-byte token, bcrypt-hashes, sends verification email (fire-and-forget so registration never fails due to SMTP)
- `GET /api/auth/verify-email?email=&token=` — public endpoint; marks `isVerified = true`, clears token
- `POST /api/auth/resend-verification` — protected; issues new 24h token and resends email
- `VerifyEmailPage` at `/verify-email` — reads `?token=&email=` from URL, shows success/error state
- AppShell banner updated: "Resend verification email" button with sending/sent/error states

### ✅ 6. Line items (one sale = multiple products)
- `SaleItem` model added; `Sale` is now a transaction header
- `SalesNewPage` has cart/basket UX — add multiple items per sale
- All analytics aggregate via SaleItem for product-level data
- Data migration: 17682 existing Sale rows migrated to SaleItem (1-to-1)

---

## P3 — Nice to have

### ✅ 11. Low-stock dashboard alert
Done — `lowStockProducts` returned in dashboard summary, yellow alert card on DashboardPage.

### ✅ 13. Error pages + loading states
Done — `ErrorBoundary` wrapping `<Routes>`, `NotFoundPage` at `/*`, catch-all changed from redirect to 404.

### 10. Swahili (i18n)
- `react-i18next` + `locales/sw.json`
- Language toggle in user settings
- Significant ongoing effort — scoped to UI strings only

### ✅ 12. Receipt / invoice generation
- Frontend-only: `printReceipt()` helper in SalesPage uses a hidden iframe + `window.print()`
- Receipt shows: business name, date, customer, items (name, qty, unit price, discount, line total), tax, total, payment method
- Print icon button on every sale row (desktop + mobile), both tabs

---

## UX improvements done (not in original backlog)

- Product typeahead in SalesNewPage — selecting catalog product locks name, caps price at catalog price (no markup)
- Show/hide password toggle on LoginPage and RegisterPage
- AnalyticsPage at `/analytics` — date presets, trend chart, day-of-week, product ranking table, payment breakdown, month-over-month table
- AppShell email verification banner (yellow, shown when `user.isVerified === false`)
- **Analytics enhancements (2026-06-05):** Net profit + profit margin summary row; hour-of-day 24-bar chart; basket stats (avg items/sale, multi-item %, distribution); top customers table; credit aging (4 buckets); expense by category; new vs returning customer breakdown; MoM table extended with expenses + net profit columns
- **Dashboard MTD vs LMTD (2026-06-05):** Dashboard stat cards now compare MTD against same-day-of-month in prior month (LMTD), not full prior month — labels updated to "LMTD"
- **AnalyticsPage layout polish (2026-06-05):** Fixed all overflow/container issues — `min-w-0` + `truncate` on stat cards, date picker stacks cleanly on mobile, MoM table uses `overflow-x-auto` with `whitespace-nowrap` + `min-w-[540px]`, product/customer tables hide secondary columns on xs, `tabular-nums` throughout, `overflow-x-hidden` on page root
- **Analytics insights panel (2026-06-05):** `generateInsights()` computes up to 6 plain-language callouts from the data (revenue trend, margin, peak day/hour, product concentration, overdue credit, basket upsell, customer loyalty, credit payment share); rendered as brand-tinted panel between stat rows and revenue chart
- **Print receipt (2026-06-05):** `printReceipt()` helper in SalesPage; print icon on every sale row; frontend-only via hidden iframe + window.print()
- **Dashboard profit margin (2026-06-05):** Margin % shown inline on the net profit card when expenses > 0
- **Backlog 4 polish (2026-06-05):**
  - App title + favicon fixed — `index.html` title is now "SME Insights", favicon is `/icons/icon-192.png`, apple-touch-icon + meta description + theme-color meta added
  - Live stock count after sale — `SalesNewPage` invalidates `['products', businessId]` query on sale success
  - Live stock in adjust modal — `StockAdjustModal` subscribes to products query; modal count updates immediately after each adjustment without page refresh
  - Theme-aware charts — `src/hooks/useBrandPalette.ts` reads `--brand-*` CSS variables via `getComputedStyle`; all Recharts in DashboardPage + AnalyticsPage use palette hook so charts follow accent color changes
  - Mobile bottom navigation bar in AppShell — 5-item bottom bar (Dashboard, Sales, [raised FAB → /sales/new], Products, More); More opens mobile drawer
  - Dashboard time greeting — `timeGreeting()` shows "Good morning/afternoon/evening, {firstName}"
  - SalesPage: skeleton mirrors table structure; contextual empty states with icons (credit all-paid, filtered, no sales + CTA)
  - ExpensesPage: delete now shows `confirm()` dialog before firing mutation
  - PWA service worker now builds on Node 18 — `scripts/patch-pwa.cjs` applies two patches: ESM `createRequire` fix for `vite-plugin-pwa` and `crypto` polyfill for `serialize-javascript` Worker thread context

---

## Audit sprint done (2026-06-11)

All 22 of 23 AUDIT.md items resolved. Remaining open item: #23 (verification token in URL query params — low risk with HTTPS, deferred).

Key fixes shipped:
- Auth: rate limiting, refresh token cleared on password change, isVerified in responses
- Sales: dateTo end-of-day fix, stock floor check, void endpoint
- Analytics: `getFullAnalytics` refactored to DB-side aggregation via `groupBy`/`aggregate` — no longer loads all SaleItem rows into memory
- Subscription: `maxUsers` enforced in `TeamService.addMember`; `hasExports` enforced in export endpoints
- Products/customers: paginated list endpoints (default limit 200)
- Expenses: PATCH endpoint + edit modal in UI; delete uses confirm modal (no more `confirm()`)
- Import/export: transaction for sales import, upsert for products, file size limit
- Health endpoint at `GET /api/health`
- Mobile nav: STAFF role always shows 5 items (homeTarget routes to /sales instead of hiding dashboard)

---

## Decisions deferred

| Decision | Context | When to revisit |
|---|---|---|
| Payment provider | Stripe not in TZ; Flutterwave vs Pesapal shortlisted | When ready to charge (M7) |
| Swahili translation | Schema ready, no i18n library added | After product-market fit validated |
| Multi-business UI | Schema supports it; UI assumes one business per org | When a user asks for it |
| Offline / PWA data sync | Complex; mobile connectivity in TZ is real concern | PWA shell shipped — offline data entry still deferred |
