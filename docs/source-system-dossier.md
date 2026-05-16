# Source-Derived System Dossier

This document is derived from the current source code in this repository, not from `README.md` or other narrative docs.

Generated from code on: 2026-04-07  
Canonical machine-readable inventory: `docs/source-system-inventory.json`

## 1. What This System Is

This repository is a multi-role financial platform for Afghanistan-oriented flows built on Next.js App Router. The system combines:

- public market/brochure pages
- end-user account dashboards
- saraf business portal flows
- branch-manager and branch-staff portal access
- admin operations and system control
- hawala request and payout workflows
- exchange request workflows
- ratings, favorites, social/referral/achievement features
- education/news content
- support chat, saraf chat, guest chat, and internal branch chat
- configurable fees, credits, promotions, ads, subscriptions, backups, webhooks, and external APIs

## 2. Snapshot From Source

Current codebase counts from `docs/source-system-inventory.json`:

- 85 App Router pages
- 232 API routes
- 3 layouts
- 174 component files
- 99 library files
- 48 Prisma models
- 6 Prisma enums
- 33 scripts
- 17 test files

Main app route groups:

- `admin`: 28 pages
- `portal`: 18 pages
- `user`: 5 pages
- `auth`: 5 pages
- public standalone sections: `hawala`, `sarafs`, `community`, `education`, `rates`, `charts`, `crypto`, `commodities`, `settings`, `profile`, `track`, `vip`, `notifications`, `search`, `terms`, `privacy`, `management`, `mobile-app`, `ai-assistant`

Main API route groups:

- `admin`: 81 routes
- `portal`: 37 routes
- `user`: 11 routes
- `auth`: 10 routes
- `hawala`: 9 routes
- `charts`: 8 routes
- `education`: 8 routes
- `saraf-chat`: 8 routes
- `sarafs`: 6 routes
- `system`: 5 routes
- `public`: 5 routes
- plus smaller groups for `exchange`, `rates`, `crypto`, `community`, `settings`, `legal`, `guest-chat`, `notifications`, `market`, `openrouter`, `security`, `uploads`, `webhooks`, `monitoring`, and test/seed utilities

## 3. Core Stack

Based on `package.json`, `app/layout.tsx`, `middleware.ts`, and related runtime files:

- framework: Next.js 14 App Router
- UI: React 18
- language: TypeScript
- auth: NextAuth credentials provider
- database access: Prisma
- dev database schema: SQLite via `prisma/schema.dev.prisma`
- production database schema: PostgreSQL via `prisma/schema.prod.prisma`
- schema switching: `switch-schema.js`
- query/cache layer: TanStack Query
- theming: `next-themes` plus custom theme context
- styling: Tailwind CSS + custom CSS
- UI primitives: Radix UI
- charts: custom chart components + TradingView-style integrations
- notifications/toasts: Sonner + custom toast
- messaging transport candidates: email, SMS, WhatsApp-style OTP channel settings
- optional rate limiting backend: Upstash Redis
- file/blob support: Vercel Blob

Important operational truth:

- local development and production do not use the same Prisma schema file directly
- `switch-schema.js` copies `schema.dev.prisma` or `schema.prod.prisma` into `prisma/schema.prisma` depending on environment and `DATABASE_URL`

## 4. Roles and Access Model

Prisma enum `UserRole`:

- `USER`
- `SARAF`
- `BRANCH_MANAGER`
- `BRANCH_STAFF`
- `ADMIN`

Access control is spread across:

- `lib/auth.ts`
- `middleware.ts`
- `lib/portal-access.ts`
- `lib/saraf-access.ts`

Behavioral summary:

- `ADMIN` is required for `/admin/*`
- portal roles are `SARAF`, `BRANCH_MANAGER`, `BRANCH_STAFF`
- owner-mode portal access is tied to an approved and active saraf record
- branch-mode portal access is derived from `branch_staff` membership and/or managed branches
- many portal APIs require an approved saraf status before returning data

Important nuance:

- even if a user session exists, many saraf-facing APIs still refuse access unless the linked saraf is `APPROVED` and active
- disabling approval in system config affects new signups, not old pending sarafs automatically

## 5. Authentication and Session Model

Implemented in `lib/auth.ts` and `app/api/auth/*`.

Supported auth-related features in code:

- credentials sign-in by email or phone
- password hashing via `bcryptjs`
- login rate limiting
- optional reCAPTCHA on sign-in and sign-up
- OTP send/verify routes
- optional email verification and phone verification flags
- session registry and session revocation support
- audit logging on login/logout/failure/block events

Session shape includes:

- `id`
- `role`
- `avatarUrl`
- `sarafId`
- `sarafStatus`
- `sessionId`

Session lifetime:

- 4 hours JWT/session max age in current auth config

## 6. Public/User-Facing Product Surface

### Home and Public Discovery

Home page `app/page.tsx` is not a simple landing page. It loads:

- hero content from public home-content API
- quick actions
- public exchange rates
- featured sarafs
- CTA/incentive sections
- dashboard content blocks
- floating chat entry point

Related source:

- `app/page.tsx`
- `components/dashboard/*`
- `app/api/public/home-content/route.ts`
- `lib/home-page-content.ts`

### Public Informational/Utility Pages

Public page groups include:

- `/sarafs` and `/sarafs/[id]`
- `/rates`
- `/charts`
- `/crypto`
- `/commodities`
- `/calculator`
- `/education` and `/education/[id]`
- `/community/leaderboard`
- `/community/users/[id]`
- `/track`
- `/terms`
- `/privacy`
- `/search`
- `/vip`
- `/ai-assistant`

### Simple User Account Surface

User pages:

- `/user`
- `/user/exchange`
- `/user/favorites`
- `/user/social`
- `/user/transactions`
- `/profile`
- `/settings`
- `/notifications`

Major user capabilities from code:

- create hawala requests
- create exchange requests
- track personal transaction history
- follow/unfollow sarafs
- open chat/contact actions to sarafs
- view social/referral/achievement data
- manage profile and settings
- view notifications
- create public transaction shares
- accumulate rewards/VIP-related state

## 7. Hawala System: Real Flow From Code

This is one of the most integrated parts of the system.

### 7.1 User-Side Hawala Request

User entry surface:

- `app/hawala/page.tsx`

What this page currently does:

- loads approved/active saraf directory
- loads favorites first when user is signed in
- provides searchable saraf dropdown via `components/hawala/SarafCombobox.tsx`
- renders the real request form via `components/hawala/VisitorHawalaForm.tsx`
- shows prior hawala request history at bottom
- shows grouped totals for sent and received amounts

Creation API:

- `app/api/hawala/request/route.ts`

Current request creation facts:

- requires signed-in user
- creates a `Transaction` with:
  - `type = HAWALA_REQUEST`
  - `status = PENDING`
- stores sender/receiver details
- resolves rate with hawala service
- checks blacklist restrictions
- writes notifications
- writes audit log
- supports optional sender/receiver tazkira values stored in `internalNotes`

### 7.2 Saraf Approval of Hawala Request

Saraf request queue:

- `app/portal/hawala-requests/page.tsx`
- `app/api/portal/hawala/requests/route.ts`

Approval API:

- `app/api/portal/hawala/approve/route.ts`

What approval actually does:

- validates approved operational saraf state
- requires at least two active branches
- chooses destination branch using receiver city/country matching
- converts the same transaction:
  - `type: HAWALA_REQUEST -> HAWALA`
  - keeps status `PENDING`
- calculates charges and credit usage
- deducts saraf credits
- sets origin and destination branches
- notifies sender and destination branch staff
- creates credit transaction usage record
- writes audit log

Rejection API:

- `app/api/portal/hawala/reject/route.ts`

Rejection behavior:

- only pending hawala requests
- marks them `CANCELLED`
- records rejection note
- notifies original sender
- writes audit log

### 7.3 Destination Branch Payout / Completion

Relevant APIs:

- `app/api/portal/hawala/[id]/confirm-payment/route.ts`
- `app/api/portal/hawala/[id]/route.ts`

Completion behavior:

- completion is not done from the generic status patch for hawala
- destination branch must use confirm-payment flow
- transaction becomes `COMPLETED`
- payout notes/payment proof can be merged into `internalNotes`
- saraf totals update
- user reward can be granted
- origin staff and sender are notified
- internal chat message can be created for branch-to-branch coordination
- audit log is written

Important truth:

- hawala uses both request-phase transactions and routed payout-phase transactions
- a suggestion engine or external AI must not treat `HAWALA_REQUEST` and `HAWALA` as the same operational stage

## 8. Exchange System: Real Flow From Code

User exchange entry:

- `/user/exchange`
- API: `app/api/exchange/request/route.ts`

User exchange request behavior:

- signed-in user required
- feature flag must allow exchange globally and for user
- saraf and branch are required
- blacklist checks are applied
- rate is resolved
- creates `Transaction` with:
  - `type = EXCHANGE`
  - `status = PENDING`
- notifies user and saraf
- writes audit log

Portal exchange completion:

- handled through portal transaction status logic in `app/api/portal/transactions/route.ts`

Completion details:

- saraf operational state checked
- free-trial inclusion rules can block exchange
- pricing and commission are calculated
- credits are deducted
- sender totals/VIP upgrades/rewards may update
- notifications and audit logs are created

Important truth:

- exchange completion is not a dumb status flip; it is tied to pricing, credits, fee-waiver logic, and reward/VIP side effects

## 9. Saraf Portal Surface

Portal pages:

- `/portal`
- `/portal/rates`
- `/portal/transactions`
- `/portal/hawala`
- `/portal/hawala/new`
- `/portal/hawala-requests`
- `/portal/exchange`
- `/portal/exchange/new`
- `/portal/branches`
- `/portal/reports`
- `/portal/credit`
- `/portal/promotions`
- `/portal/advertisement`
- `/portal/subscription`
- `/portal/profile`
- `/portal/messages`
- `/portal/internal-chat`
- `/portal/blacklist`

Capabilities visible in source:

- manage exchange rates
- create portal-originated hawala
- approve/reject user hawala requests
- manage all portal transactions
- manage branches and branch staffing context
- manage blacklist entries
- purchase/use credits
- request promotions/upgrade flows
- manage advertisements
- request subscriptions
- chat with admin
- run internal chat between saraf-side users
- view reports and stats

Portal statistics source:

- `app/api/portal/stats/route.ts`

Portal stats include:

- status
- total/pending/completed transactions
- volume
- rating
- active rates
- credit balance
- premium/subscription state
- owner vs branch access mode
- today/month metrics
- recent transactions
- branch list

## 10. Admin Surface

Admin pages cover:

- users
- sarafs
- transactions
- statistics
- analytics
- reports
- audit logs
- system settings
- theme
- home content
- content
- featured sarafs
- advertisements
- promotions
- subscriptions
- credit requests
- packages
- commission settings
- blacklist
- backups
- external APIs
- API keys
- webhooks
- education
- chat

Admin APIs also cover:

- approve/reject advertisements
- approve/reject subscriptions
- approve/reject credit requests
- bulk user and saraf operations
- snapshot/reset stats
- backup create/list/restore/delete
- webhook management
- external API config/testing
- upload endpoints

Important admin truth:

- the admin panel is the central feature-flag/configuration surface
- many business flows depend on config values stored in `system_config`, not hardcoded code alone

## 11. Social, Referral, Favorites, Ratings, and Sharing

Source highlights:

- `lib/social-features.ts`
- `app/api/user/social/route.ts`
- `app/api/user/favorites/route.ts`
- `app/api/sarafs/rating/route.ts`
- `app/api/user/transaction-shares/*`
- `app/shared/transactions/[token]/page.tsx`

Implemented social capability categories:

- user referral code generation
- referral signup URL generation
- achievements based on transaction, following, reward, referral, sharing, and VIP milestones
- saved favorite sarafs
- saraf ratings/comments
- public transaction sharing with privacy controls
- public community leaderboard and user profile pages

## 12. Chat and Messaging Surface

There are multiple chat systems, not just one:

- user/admin support chat: `app/api/chat/*`
- guest chat: `app/api/guest-chat/*`
- user-to-saraf chat: `app/api/saraf-chat/*`
- admin messaging dashboards/components
- internal branch/saraf chat: `app/api/portal/internal-chat/*`

Associated Prisma models:

- `ChatSession`
- `ChatMessage`
- `GuestChatSession`
- `GuestChatMessage`
- `InternalChat`
- `InternalChatMessage`
- `InternalChatParticipant`

## 13. Education and Content Surface

Education features are first-class in the schema and routes:

- courses
- lessons
- enrollments
- lesson progress
- tech news aggregation/history

Relevant APIs:

- `app/api/education/*`
- `app/api/admin/education/*`

Related models:

- `EducationCourse`
- `EducationLesson`
- `UserCourseEnrollment`
- `UserLessonProgress`
- `TechNews`

There is also a home/content system:

- `ContentItem`
- home content management pages and APIs
- public home-content delivery route

## 14. Market, Rates, Charts, Assets

The codebase includes:

- FX rates and conversion APIs
- commodities overview
- crypto market feeds
- chart data
- watchlists
- saved layouts
- drawings
- alerts

Chart-related persistence models:

- `Asset`
- `PriceHistory`
- `ChartDrawing`
- `ChartLayout`
- `UserWatchlist`
- `ChartAlert`

API groups:

- `/api/rates/*`
- `/api/market/*`
- `/api/crypto/*`
- `/api/charts/*`

## 15. Financial/Commercial Side Systems

Additional monetization/operations modules present in source:

- `CreditTransaction`
- `Subscription`
- `Advertisement`
- `PromotionRequest`
- `DiscountCode`
- `DiscountCodeUsage`
- `PackageConfig`
- `UserReward`

Business concepts implemented:

- saraf credit consumption on money-flow execution
- saraf package/subscription management
- advertisement requests with admin approval
- premium promotion/upgrade requests
- discount codes and recorded usage
- reward-based discounts and free-transfer incentives
- free-trial behavior and exclusions

## 16. Key Database Entities

Prisma enums:

- `UserRole`
- `VIPLevel`
- `PackageType`
- `SarafStatus`
- `TransactionStatus`
- `TransactionType`

High-value core models:

- `User`
- `Saraf`
- `SarafBranch`
- `BranchStaff`
- `Transaction`
- `Rate`
- `Notification`
- `AuditLog`
- `SystemConfig`

High-value supporting models:

- `CreditTransaction`
- `Subscription`
- `Advertisement`
- `PromotionRequest`
- `DiscountCode`
- `UserReward`
- `Blacklist`
- `UserFavorite`
- `TransactionShare`
- chat models
- education models
- chart models

Transaction model truths from schema:

- stores both request and completed financial flows
- handles hawala, hawala request, exchange, crypto types
- carries sender/receiver names, phones, locations
- stores commissions, discounts, waivers, credits deducted
- stores branch routing and payout timestamps
- can represent guest tracking info

## 17. Feature Flags and System Config

Configuration is not cosmetic only. It materially changes behavior.

Key config-controlled areas exposed in code:

- master feature switch
- hawala feature
- exchange feature
- rewards
- promotions
- ads
- chat/support
- registration enabled
- forgot password enabled
- maintenance mode
- saraf approval required
- email verification required
- 2FA enabled
- notifications enabled
- OTP and channel selection
- contact info
- appearance colors/title/logo/favicon
- transaction limits
- default fee settings
- exchange system fee and free-trial rules
- reward discount configuration
- terms text and terms enablement

Public config route:

- `app/api/system/config/public/route.ts`

Admin-editable config UI:

- `/admin/system`

## 18. Integrations and External Dependencies

Integration/service code exists for:

- ExchangeRate-API and other FX providers
- CoinGecko and fallback crypto providers
- RSS/news feeds
- SMTP email
- SMS providers: Kavenegar, Ghasedak, Twilio, Nexmo, AfghanSMS
- OpenRouter AI assistant
- reCAPTCHA
- Upstash Redis rate limiting
- Vercel Blob uploads
- Sentry env hooks
- Facebook token/page config
- webhook dispatch with HMAC signature

Key source files:

- `lib/external-api-service.ts`
- `lib/email-service.ts`
- `lib/sms-service.ts`
- `lib/recaptcha.ts`
- `lib/redis.ts`
- `lib/webhook-service-enhanced.ts`
- `app/api/openrouter/route.ts`

## 19. Security and Operational Controls

Implemented controls visible in source:

- rate limiting in middleware and route wrappers
- audit logging
- config encryption for sensitive system config
- maintenance-mode redirect
- login attempt handling
- blacklist enforcement
- security headers / CSP
- session registry and revocation
- OTP model and verification flows
- upload route controls
- terms acceptance records

Security-related source highlights:

- `middleware.ts`
- `lib/security.ts`
- `lib/auth-rate-limit.ts`
- `lib/rate-limit-middleware.ts`
- `lib/config-encryption.ts`
- `lib/system-config-security.ts`
- `lib/session-registry.ts`
- `lib/file-upload-security.ts`

## 20. Backups, Monitoring, and Health

Implemented support exists for:

- database backup creation/listing/restore/delete
- system health endpoints
- monitoring route
- admin system metrics
- stats snapshots

Backup behavior is DB-type aware:

- PostgreSQL: uses `pg_dump` / `psql`
- SQLite: uses `sqlite3 .backup` / `.restore`

## 21. Tests and Scripts

The repository contains:

- 17 test files in `tests/`
- 33 scripts in `scripts/`

Coverage is present for utilities and infrastructure areas such as:

- validation
- phone normalization
- security helpers
- cache
- Redis
- pagination
- VIP
- webhook behavior
- config encryption
- saraf access

Scripts indicate explicit operational workflows for:

- database initialization
- seeding
- package seeding
- home-content seeding
- real system initialization
- final system audit
- integration tests
- Vercel diagnostics

Important truth:

- there is evidence of automated checks and helper scripts
- this is not the same as complete real-money production certification

## 22. Environment and Deployment Notes

Environment example files expose keys for:

- database
- NextAuth
- system config encryption
- reCAPTCHA
- Upstash Redis
- Vercel Blob
- Sentry
- cron secret
- Facebook
- SMTP
- Twilio/WhatsApp
- upload directory
- API base URLs
- backup directory
- logging
- admin bootstrap credentials

Deployment-related files:

- `vercel.json`
- `next.config.js`
- `Dockerfile`
- `docker-compose.yml`

## 23. Files Another AI Should Read First

If another AI needs the fastest accurate understanding, start with:

1. `docs/source-system-inventory.json`
2. `prisma/schema.prisma`
3. `package.json`
4. `middleware.ts`
5. `lib/auth.ts`
6. `lib/config-enforcer.ts`
7. `lib/config-service.ts`
8. `lib/saraf-access.ts`
9. `app/hawala/page.tsx`
10. `app/api/hawala/request/route.ts`
11. `app/api/portal/hawala/approve/route.ts`
12. `app/api/portal/hawala/[id]/confirm-payment/route.ts`
13. `app/api/exchange/request/route.ts`
14. `app/api/portal/transactions/route.ts`
15. `app/api/portal/stats/route.ts`
16. `app/api/user/stats/route.ts`
17. `app/admin/system/page.tsx`
18. `lib/external-api-service.ts`

## 24. Important Caveats: Do Not Misstate These

- This document is source-derived, not README-derived.
- It is accurate to the current checked-out repository state, not to every historical deployment.
- Presence of a route/page/component does not automatically guarantee it is bug-free in production.
- Many features are config-gated through `system_config`.
- Saraf approval state materially affects portal access and workflow availability.
- Money-flow completion often triggers side effects: credits, commissions, rewards, notifications, audit logs.
- Development schema and production schema are switched at build/runtime by script.
- Some routes exist for test/seed/debug purposes and should not be confused with public production UX.

## 25. Honesty Boundary

I can honestly say this dossier is grounded in the current source tree, route inventory, Prisma schema, middleware, auth layer, major feature APIs, and major page groups.

I cannot honestly say that source inspection alone proves:

- full production correctness under all edge cases
- complete end-to-end real-money operational safety
- absence of dormant or partially wired UI paths
- exact runtime behavior when admin config is changed dynamically in a live environment

For those claims, additional browser E2E testing and staged operational validation would still be required.
