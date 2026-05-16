# Financial System Audit Report (Hawala, Exchange, Credits, Discounts, Referrals, Ads, Packages)

Date: 2026-04-13

This report is based on a code audit of the current repository. It is not a substitute for a formal security audit, legal review, or external financial controls. Where the system depends on correct configuration (rates, feature flags, credit price, free-access), those dependencies are called out explicitly.

## Fixes Applied After This Audit (Code Changes)

As of 2026-04-13, the following high-impact integrity fixes were implemented:

- **Credit purchase integrity**: `/api/portal/credit/purchase` now writes the correct `price`, records `DiscountCodeUsage`, and increments `DiscountCode.usedCount` atomically in the same DB transaction (prevents desync and prevents accidental `price=0`).
- **Referral discount usability**: `REFERRAL_BONUS` rewards are now eligible to be reserved for the “next transfer system fee discount” logic.
- **FX normalization safety**: credit charging no longer guesses “treat unknown currency as USD”; it fails closed with `FX_RATE_UNAVAILABLE` (prevents silent under/over-charging).
- **Rate integrity**: `/api/portal/rates` now enforces positive rates and `buyRate < sellRate` (including PATCH updates) to prevent invalid quotes.
- **Credit-drain mitigation**: `/api/hawala` direct hawala creation is now blocked for `USER` role (users must use the `HAWALA_REQUEST` flow).

## 1) Money Units And Ledgers (What Is "Real Money" Here?)

The system mixes these concepts:

- **Fiat/crypto amounts** (e.g. `fromAmount` in `USD/AFN/...`) stored on `Transaction`.
- **System fees and saraf fees** computed as percentages and stored as `systemCommission`, `sarafCommission`, `totalCommission` on `Transaction`.
- **Credits** (`Saraf.creditBalance`) used to pay the platform (system) fee. Credits are deducted per transaction based on **systemCommission normalized to USD**.

Key implication:

- The platform revenue is effectively captured via **credit usage**, not directly via fiat settlement.
- Therefore, credit pricing, FX normalization, and rate integrity are **direct money-risk** items.

## 2) Hawala Flow (Portal + User)

### 2.1 Portal Hawala Creation (Saraf/Branch portal)

Primary endpoint:

- `app/api/portal/hawala/new/route.ts`

High-level:

1. Validate session role (`SARAF/BRANCH_MANAGER/BRANCH_STAFF`) and access context.
2. Check operational state (`getSarafOperationalState`):
   - Saraf must be `APPROVED` and `isActive`.
   - If `free_access_enabled` is false, requires either active free-trial or active subscription.
3. `resolveSystemFeeWaiver('HAWALA')`:
   - Can waive system fee via free-access or free-trial.
4. Reserve best transfer reward (`reserveBestTransferReward`) unless system fee is waived.
5. Compute charges (`calculateHawalaCharges` -> `calculateTransactionCharges`).
6. Deduct credits **atomically** using `updateMany` with `creditBalance >= creditsRequired`.
7. Create `Transaction` with the computed fees and metadata.

Stored outputs (Transaction):

- `rate`, `fromAmount`, `toAmount`
- `systemCommission`, `sarafCommission`, `totalCommission`
- `systemDiscountAmount`, `waivedSystemCommission`, `systemFeeWaiverReason`
- `creditsDeducted`
- `appliedRewardId` when applicable

### 2.2 User Hawala Creation (Non-portal)

Primary endpoint:

- `app/api/hawala/route.ts`

The user flow selects a saraf and creates a pending Hawala. Important integrity point:

- The server now resolves the saraf rate using `resolveHawalaRate` and only accepts a client-supplied rate within a small tolerance (prevents rate spoofing).

## 3) Currency Exchange Flow (Portal)

Primary endpoint:

- `app/api/portal/exchange/new/route.ts`

High-level:

1. Validate session and operational state.
2. `resolveSystemFeeWaiver('EXCHANGE')` (free access or free trial if enabled for exchange).
3. Compute charges via `calculateTransactionCharges`:
   - Uses `CommissionSetting` ranges and/or fallback rate.
   - Can be overridden by `ConfigEnforcer.getExchangeSystemFeePercent()`.
4. Deduct credits atomically.
5. Create `Transaction` (exchange is created as `COMPLETED` in this route).

## 4) Commission, Fees, And Percentage Split

Core implementation:

- `lib/commission.ts` (loads range-based `CommissionSetting` or seeds defaults)
- `lib/transaction-pricing.ts` (splits and discounts fees, computes credits required)

Important behavior:

- If `sarafFeePercent` is provided (from saraf fee settings), it is treated as the **total customer fee percent**.
  - System commission is capped at that total.
  - Saraf commission becomes `configuredTotalCommission - systemCommission`.

Risk/decision:

- If a saraf sets a very low `sarafFeePercent`, the platform system commission can drop accordingly.
  - This may be intended (competitive pricing) or may be an exploit (platform revenue bypass).
  - If the platform requires a minimum system fee, enforce `sarafFeePercent >= systemFeePercent` (or enforce a minimum system fee percent).

## 5) Credits And FX Normalization

Credits required for a transaction:

- `lib/credit-usage.ts` converts `systemCommission` into USD and divides by `credit_price_usd`.
- Conversion uses stored market data (`marketData`) and optionally the quoted rate when converting directly to USD (`convertAmountToUsd`).

Operational dependency:

- If `marketData` is stale/missing for some currency pairs, USD normalization can fail.
  - That can overcharge or undercharge credits depending on currency and fallback behavior.

Recommendation:

- For production, prefer **strict** normalization (reject when USD normalization is unavailable) or ensure market data coverage for all used currencies.

## 6) Discounts

### 6.1 VIP Discounts

- Applied to system commission (reduces credits required).
- Implementation: `vipDiscountForLevel` used in `calculateTransactionCharges`.

### 6.2 Transfer Rewards (Welcome/Hawala/Exchange/Referral/Free)

- Rewards are stored in `UserReward`.
- `reserveBestTransferReward` picks the highest discount and marks it `isUsed=true`.

Integrity note:

- Only reward types included in the transfer reward allow-list will be applied.

### 6.3 Credit Purchase Promo Codes

- Promo codes (`DiscountCode`) can reduce USD price of credit purchase requests.
- The code usage counter (`usedCount`) must be updated safely under concurrency.
- The purchase request record is `CreditTransaction (type=PURCHASE, status=PENDING)`.

## 7) Referrals

Current behavior:

- On signup (`app/api/auth/signup/route.ts`), if a referral code is provided, the referrer gets a `UserReward` discount and VIP points immediately.

Risk:

- This can be abused by creating many accounts (platform revenue leakage via discounts).

Recommendation:

- Convert referral rewards to "pending" and only grant after the referred user completes their first successful paid transaction.
- Add deduplication so a referred user can only trigger the reward once.

## 8) Advertisements (Revenue + Delivery)

Admin approval activates ads:

- `app/api/admin/advertisements/approve/route.ts` sets `ACTIVE`, `startDate`, `endDate`.
Public delivery:

- `app/api/public/advertisements/route.ts` returns `ACTIVE` ads that match the date window and placement.
Tracking:

- `components/advertising/public-advertisement-slots.tsx` tracks impressions/clicks via `/api/public/advertisements/track`.

Known delivery risks:

- UI theme/contrast can hide ads in light/dark mode if styles are not aligned to system theme tokens.

## 9) Packages And Subscriptions (Saraf)

- Saraf requests a subscription: `app/api/portal/subscription/request/route.ts` creates `Subscription` status `PENDING`.
- Admin approval deducts credits and sets `Saraf.subscriptionExpiry` and `subscriptionType`.

Risk:

- Ensure approval and deduction happens atomically and is idempotent (no double charge on retries).

## 10) SQLite vs Postgres Support

Schema selection:

- `switch-schema.js` chooses `schema.dev.prisma` (SQLite) vs `schema.prod.prisma` (Postgres) based on `DATABASE_URL` scheme.

Observed differences:

- Mostly index differences (performance) rather than column differences.

Production implication:

- Queries that are "fine" on SQLite dev can be slow on Postgres without the right indexes (or vice versa).
- Always run migrations on both and validate critical queries.

## 11) Highest-Priority Risks (Money-Loss / Exploit Potential)

1. **Client rate spoofing** on any endpoint that accepts a rate from clients.
2. **Referral abuse** (rewards granted at signup without any real activity).
3. **Promo code enforcement gaps** (e.g. `vipLevelOnly` not enforced in some flows).
4. **Saraf fee settings undercut** that can reduce platform system fee to near zero.
5. **Idempotency** on admin approvals (ads/subscriptions/credit purchase approvals) to prevent double execution.
6. **FX normalization coverage** for all currencies used in commission-to-USD normalization.

## 12) Actionable To-Do (Sequenced)

Phase 1 (must-do before real money):

- Enforce server-side rates everywhere a client supplies a rate (hawala, exchange, portal flows).
- Make referral reward issuance conditional on first completed transaction; add dedupe.
- Enforce `vipLevelOnly` discount codes in credit purchase and any other discount-code flows.
- Decide and enforce minimum platform fee behavior with `sarafFeePercent`.
- Add idempotency keys and status guards to admin approval endpoints.
- Add monitoring: audit logs for all money-affecting actions + alerts for anomalies.

Phase 2 (hardening):

- Add strict USD normalization behavior under config (reject when conversion is impossible).
- Add integration tests for the fee/credit logic across SQLite and Postgres.
- Add replay-safe request handling (retry-safe) for payment confirmations and approvals.
