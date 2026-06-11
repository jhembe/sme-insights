# SME Insights — Honest Observations

> Written 2026-06-11. Track fixes and decisions here.

---

## What I hate about the app

### H1. Product analytics are name-based, not ID-based ✅ Fixed 2026-06-11
**Problem:** `getFullAnalytics` grouped SaleItems by `productName` (a string), not `productId`. If an owner renames "Panadol 500mg" to "Panadol", revenue history splits into two product rows. No way to merge or alias.

**Fix:** `dashboard.service.ts` now runs two groupBy queries — `groupBy(['productId'])` for catalog-linked items (stable), and `groupBy(['productName'])` for ad-hoc items. Catalog products display their *current* name from the Product table, not the snapshotted name in SaleItem.

---

### H2. The subscription gate was deployed backwards ✅ Fixed 2026-06-11
**Problem:** `hasExports: false` on the free plan + new 403 enforcement = all existing users silently lost access to exports they were using. No paid plan exists yet (M7 is next), so there was no upgrade path. The gate was installed before the ladder.

**Fix:**
- Free plan updated to `hasExports: true` until M7 paid tiers launch
- `ImportExportPage` now reads the subscription plan and shows a locked state with an upgrade CTA *before* hitting the API — no silent 403s
- When M7 ships: flip free plan `hasExports = false`, ensure paid plan row has `hasExports = true`

---

## What I love about the app

### L1. Scope discipline
No feature bloat. Every surface earns its place. The InsightPanel auto-generating plain-language callouts, LMTD comparison instead of naive prior-month, thermal receipt via iframe — someone made product decisions here, not just feature checklist decisions.

### L2. The deployment is production-grade from day one
One `./deploy.sh`. Caddy handles TLS. Migrations run on container start. Most side projects rot because deployment is a weekend project. This one ships.

### L3. Tanzania-first thinking
M-Pesa, TigoPesa, AirtelMoney as first-class payment methods. TZS as the default currency. The product doesn't feel translated from a Western SaaS — it was designed for the context.

---

## What I wish it had

### W1. An audit log ✅ Implemented 2026-06-11
**Problem:** No way to know if a staff member voided a sale, adjusted stock down by 50, or deleted an expense. In a 5-person shop, that's a real accountability gap. A notebook wouldn't let an employee silently erase an entry.

**Fix:** `AuditEvent` model — append-only log of who did what and when. Logs: sale create/void, expense create/update/delete, stock adjustments, team member add/remove. Visible to ADMIN+ at `/activity`.

---

### W2. Offline-first data entry ⏳ Deferred
Tanzania 3G is the median case for this user, not the edge case. A salon in Dodoma on bad signal is your user, not a Dar es Salaam boutique with fibre. The PWA shell is there — IndexedDB + sync queue is the missing piece.

**Status:** Deferred. Significant complexity. Revisit after PMF validated.

---

## What I'd do differently

### D1. Swahili before M7, not after ✅ Implemented 2026-06-11
**Problem:** Language is trust. An owner who reads "Mapato ya leo" instead of "Today's revenue" feels like this was built for them, not translated for them. Shipping English-first and treating Swahili as a later milestone signals the wrong priority to your target user.

**Fix:** react-i18next installed. `en.json` + `sw.json` cover navigation, page headers, common actions, and key labels. Language toggle added to AppShell. `User.preferredLanguage` already in the schema — wired up.

**Remaining:** Full string coverage of every page is ongoing — core surfaces done, deep modals deferred.

---

### D2. Plan gate UX should never let users hit a 403 ✅ Fixed 2026-06-11
**Problem:** Throwing 403 from the API when a user tries to export is technically correct but hostile UX. The user clicked "CSV", got an error toast. They have no idea it's a plan limitation.

**Fix:** `ImportExportPage` reads the subscription query before rendering. If `!plan.hasExports`, the export section shows a lock icon + "Export is available on paid plans" + link to `/billing`. The API 403 is still there as a last line of defence, but users never reach it in normal flow.

---

## Decision log

| Date | Decision | Reason |
|---|---|---|
| 2026-06-11 | Free plan `hasExports: true` until M7 | No paid alternative exists yet; gate before ladder is hostile |
| 2026-06-11 | Audit log is append-only, no edits/deletes | Defeats the purpose of an audit trail |
| 2026-06-11 | Swahili i18n covers nav + headers first | Highest visibility surfaces; full coverage is ongoing |
| 2026-06-11 | Product analytics use productId for catalog items | Stable across renames; ad-hoc items still group by name |
