# SME Insights — Full Codebase Audit

> Generated 2026-06-11. Issues are organized by severity.

---

## CRITICAL — Fix these first

### ✅ 1. Tax rate UI is broken for new setups
**Files:** `frontend/src/pages/BusinessSettingsPage.tsx`, `backend/src/businesses/businesses.service.ts`

The schema stores `taxRate` as a decimal (`0.18` = 18%). The Settings page shows the raw value with a `%` suffix and a hint that says _"Tanzania VAT is 18%"_. The input has `min=0, max=100` — clearly designed for percentage entry. But there is no `/100` conversion before saving. If a user reads the hint and enters `18`, the DB stores `18`, and `SalesNewPage` does `subtotal * 18` = **1800% tax**. Any business that has used the Settings page to configure tax is likely broken.

**Fix:** In `BusinessSettingsPage`, multiply by 100 when loading for display, divide by 100 before saving.

---

### ✅ 2. Stock can go negative
**File:** `backend/src/sales/sales.service.ts:107-120`

When a sale is created, stock is decremented *after* the sale is committed, with no prior check that sufficient stock exists. A product with 2 units can sell 100 — stock goes to `-98`. The frontend also has no stock-availability warning at sale entry time.

**Fix:** Inside the `$transaction`, check `product.stockQuantity >= item.quantity` before decrementing. Throw `BadRequestException` with a clear message if insufficient.

---

### ✅ 3. `dateTo` filter silently excludes the last day
**Files:** `backend/src/sales/sales.service.ts:33`, `backend/src/dashboard/dashboard.service.ts`

`new Date(query.dateTo)` parses `"2026-06-11"` as `2026-06-11T00:00:00.000Z` (midnight), so all sales *on* June 11 fail the `lte` check and are excluded. The same bug affects the full-analytics date range filter.

**Fix:** When applying `dateTo`, set it to end of day: `new Date(dateTo + 'T23:59:59.999Z')`.

---

## HIGH — Fix before more users onboard

### ✅ 4. No rate limiting on auth endpoints
**File:** `backend/src/auth/auth.controller.ts`

`POST /login`, `POST /forgot-password`, `POST /register`, `GET /verify-email` have zero throttling. An attacker can brute-force passwords, enumerate accounts via 409/401 responses, or flood a user's inbox with verification emails by hitting `/resend-verification` in a loop.

**Fix:** Add `@nestjs/throttler` to `AppModule`. Apply `ThrottlerGuard` globally with a strict override on `/auth/login` and `/auth/forgot-password` (e.g. 5 req/min).

---

### ✅ 5. File uploads have no size limit
**File:** `backend/src/import-export/import-export.controller.ts`

The `FileInterceptor('file')` has no `limits.fileSize`. A user can upload a 500 MB CSV and exhaust Node.js heap memory during parsing.

**Fix:** `FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } })`.

---

### ✅ 6. Password change does not invalidate existing sessions
**File:** `backend/src/auth/auth.service.ts:223`

After `changePassword`, `hashedRefreshToken` is not cleared. A stolen refresh token keeps working forever after a password change.

**Fix:** Add `hashedRefreshToken: null` to the `prisma.user.update` in `changePassword`. Force the user to re-login.

---

### ✅ 7. New team members are never notified
**File:** `backend/src/team/team.service.ts:38-49`

When a new user is created via `addMember`, a random temp password is generated and returned in the API response JSON — but no email is sent. The admin must communicate credentials manually. The new user has no idea an account was created for them.

**Fix:** Call `mailService.sendTeamInvite(email, firstName, tempPassword, businessName)` after user creation. Add the email template.

---

### ✅ 8. `isVerified` is never `false` after register — banner never shows for new users
**Files:** `backend/src/auth/auth.service.ts:63-67`, `frontend/src/store/auth.store.ts`

The register response returns `{ id, email, firstName, lastName }` — no `isVerified`. The auth store's `user.isVerified` is `undefined`. The verification banner in AppShell checks `isVerified === false` (strict equality). New users who need to verify their email never see the banner.

**Fix:** Include `isVerified` in the login and register response. Add `isVerified: false` to the register and login response user shapes.

---

### ✅ 9. Import products always duplicates on re-import
**File:** `backend/src/import-export/import-export.service.ts:299`

`importProducts` calls `prisma.product.create` unconditionally. Re-importing the same CSV file creates duplicate products every time.

**Fix:** Use `upsert` keyed on `name` (or `sku` if present) instead of `create`.

---

### ✅ 10. Import sales has no transaction
**File:** `backend/src/import-export/import-export.service.ts:222`

Sales are created row by row in a `for` loop without `$transaction`. If row 80 of 200 fails, rows 1-79 are already committed. Partial imports with no rollback.

**Fix:** Collect all valid rows first, then wrap the entire batch in a single `this.prisma.$transaction([...])`.

---

## MEDIUM — Real product gaps

### ✅ 11. No way to edit an expense
**File:** `backend/src/expenses/expenses.service.ts`

`ExpensesService` has `list`, `create`, `remove` — no `update`. If you enter the wrong amount you have to delete and re-create.

**Fix:** Add `PATCH /api/businesses/:id/expenses/:expId` endpoint.

---

### ✅ 12. No way to void or correct a sale
**File:** `backend/src/sales/sales.service.ts`

Once a sale is created it is permanent. No `DELETE` and no `PATCH` beyond mark-as-paid. Wrong amounts, wrong dates, duplicate entries are stuck forever.

**Fix:** Add a void/cancel endpoint that sets `status: CANCELLED` and reverses stock where applicable.

---

### ✅ 13. Subscription limits are completely unenforced
**File:** `backend/src/subscription/subscription.service.ts`

`Plan` has `maxUsers`, `maxBusinesses`, `hasExports`, `hasApiAccess`, `dataRetentionDays` — none are checked anywhere. A free-plan org can add unlimited members, export everything, and access all features. The billing page is cosmetic only.

**Fix:** `TeamService.addMember` now checks active member count against `plan.maxUsers` (default 3). `ImportExportService.exportSales` and `exportExpenses` check `plan.hasExports` (default false) and throw 403 if the plan doesn't include exports.

---

### ✅ 14. `getFullAnalytics` loads ALL sales into Node.js memory
**File:** `backend/src/dashboard/dashboard.service.ts:111`

`prisma.sale.findMany(...)` with no `take` limit. A business with 2 years of daily sales could have 50,000+ records loaded into memory per analytics request. Aggregation happens entirely in JS.

**Fix:** Refactored to use `saleItem.groupBy(['productName'])` for product breakdown, `saleItem.groupBy(['saleId'])` for basket stats, and `sale.aggregate` for totals. The main `sale.findMany` is now lean (no `items` include).

---

### ✅ 15. `(query as any).status` type cast in SalesService
**File:** `backend/src/sales/sales.service.ts:39`

`if ((query as any).status)` defeats the type system. `status` should be added to `ListSalesDto` with `@IsOptional() @IsEnum(SaleStatus)`.

---

### ✅ 16. No health check endpoint

No `/api/health` endpoint. Caddy and uptime monitoring have nothing to probe.

**Fix:** Add `GET /api/health → 200 { status: 'ok', timestamp: ... }`.

---

### ✅ 17. No pagination for products and customers

`ProductsService.list()` and `CustomersService.list()` return all records with no `take` limit. Fine at 50; slow at 500+.

**Fix:** Both services now accept `page`/`limit` query params (default page=1, limit=200) and return `{ data, total, page, limit }`. Frontend API clients updated to unwrap the paginated shape.

---

## LOW — Code quality / minor issues

### ✅ 18. `buildXlsx` return type is `any`
**File:** `backend/src/import-export/import-export.service.ts:352`

Should be `Promise<Buffer | Uint8Array>`.

---

### ✅ 19. Module-level `_id` counter in SalesNewPage
**File:** `frontend/src/pages/SalesNewPage.tsx:14`

`let _id = 0` at module level persists across component lifecycles. Not a functional bug (keys stay unique) but a code smell. Move to `useRef` inside the component.

---

### ✅ 20. `confirm()` for expense delete is a deprecated browser dialog
**File:** `frontend/src/pages/ExpensesPage.tsx`

Native browser confirm dialog is inconsistent with the rest of the app's modal UX. Replace with an inline modal matching the `MarkPaidModal` pattern.

---

### ✅ 21. Dashboard bottom nav uneven for STAFF users
**File:** `frontend/src/components/AppShell.tsx:19-36`

`MobileBottomNav` conditionally hides the Dashboard item when `!canViewAnalytics` (STAFF role). `justify-around` then distributes 4 items instead of 5. Spacing looks off. Consider showing a "Home" fallback or replacing with a STAFF-relevant action.

---

### ✅ 22. `staleTime: 1000 * 60` applied to all queries
**File:** `frontend/src/App.tsx:27`

Every query goes stale after 1 minute. The full-analytics endpoint is expensive — refetching it every minute while the user sits on the analytics page is wasteful. Set a longer `staleTime` for analytics queries specifically (e.g. 5 minutes).

---

### 23. Verification token exposed in URL
**File:** `backend/src/auth/auth.controller.ts:73`

`GET /api/auth/verify-email?token=...` — token appears in server access logs, browser history, and referrer headers. Low risk with HTTPS but a POST endpoint would be cleaner.

---

## Missing Features

| Gap | Impact |
|---|---|
| Team invitation email | Staff cannot self-onboard; admin must deliver credentials manually |
| Expense editing (PATCH) | Any input error requires delete + recreate |
| Sale voiding / cancellation | Bad data is permanent |
| Subscription enforcement | Cannot monetize without actual gates |
| `CANCELLED` / `REFUNDED` sale flow | Enum values exist in schema but no UI or endpoints |
| Automated database backup | No backup strategy in deployment docs |
| Offline data entry | Noted deferred; Tanzania connectivity is a real user concern |
| Swahili i18n | Noted deferred; schema ready, no library added |

---

## Fix Priority Order

1. Tax rate UI bug — data correctness for all financial calculations
2. `dateTo` filter off-by-one — analytics and export accuracy
3. `isVerified` not in login/register response — UX for every new user
4. Rate limiting — security
5. Password change does not clear refresh token — security
6. Team member email — onboarding
7. Import: no transaction + duplicate products — data integrity
8. File upload size limit — availability
9. Stock can go negative — inventory accuracy
10. Expense editing + sale voiding — feature completeness
