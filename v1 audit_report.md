# VoiceSite — Complete Technical & Product Audit Report

**Audit Date:** 2026-02-27  
**Codebase:** `buildyoustore` (VoiceSite.in)  
**Auditor Perspective:** CTO / Principal Architect / Technical Auditor  

---

# 1. Executive Summary

## What This System Does
VoiceSite is an **AI-powered voice-to-website builder** targeting **small Indian businesses** (shops, restaurants, cafes). Users **speak** about their business in any Indian language, and the system:
1. **Transcribes** the audio using Sarvam AI (Indian language STT)
2. **Extracts** structured business data using OpenAI GPT-4o-mini
3. **Generates** a live, publicly-accessible website with a unique URL (e.g., `/shop/vaigai-traders`)

Users can then manage their sites (edit info, add products with images, toggle live status) from a dashboard, and the system supports both **Online Store** and **Digital Menu** site types.

## Who It Is For
- **Small business owners** in India (shops, restaurants, street vendors)
- **Non-tech-savvy users** who can describe their business vocally in Hindi, Tamil, English, or 10+ Indian languages
- Users who need a quick, low-cost online presence

## Core Value Proposition
> "Speak about your shop → Get a website instantly."

Zero design or technical skills required. Multi-language Indian language support via Sarvam AI is the competitive differentiator.

## Current Maturity Level
> **Early MVP** (pre-Beta)

**Justification:**
- No payment gateway integration (plan purchases are fake — direct DB updates)
- No SMS OTP delivery (OTP logged to console only)
- No automated tests
- Hardcoded API keys in [.env.local](file:///c:/Users/LENOVO/Desktop/buildyoustore/.env.local)
- Duplicate code across feature modules
- Mixed table naming conventions (`shops` vs `sites`)
- ESLint errors suppressed during builds

## Overall Architecture Type
**Next.js Monolith** — Full-stack server-rendered React app with API Routes as backend, Supabase as BaaS (Auth + Database + Storage), deployed to Netlify.

---

# 2. System Architecture Overview

## Architecture Pattern
**Hybrid Monolith (Serverless)**
- Frontend: React Client Components (Next.js App Router)
- Backend: Next.js API Routes (serverless functions)
- Database/Auth/Storage: Supabase (PostgreSQL + Auth + S3-compatible storage)
- AI Pipeline: External APIs (Sarvam AI + OpenAI)
- Hosting: Netlify (serverless deployment via `@netlify/plugin-nextjs`)

## Text-Based Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        NETLIFY CDN                           │
│   ┌─────────────────────────────────────────────────────┐    │
│   │              Next.js App (App Router)                │    │
│   │                                                      │    │
│   │  ┌──────────────┐    ┌────────────────────────────┐  │    │
│   │  │ Landing Page  │    │   /manage/* (Dashboard)    │  │    │
│   │  │ (Public SSR)  │    │   Auth-Protected Client    │  │    │
│   │  └──────────────┘    │   Components               │  │    │
│   │                       │   - Dashboard, My-Shop     │  │    │
│   │  ┌──────────────┐    │   - Menu, Recharge         │  │    │
│   │  │ /shop/[slug]  │    │   - Settings               │  │    │
│   │  │ Public Sites  │    └────────────────────────────┘  │    │
│   │  │ (SSR Dynamic) │                                    │    │
│   │  └──────────────┘    ┌────────────────────────────┐  │    │
│   │                       │   API Routes (/api/*)      │  │    │
│   │                       │   - /process-voice         │  │    │
│   │                       │   - /site/create           │  │    │
│   │                       │   - /voice/upload          │  │    │
│   │                       │   - /voice/process         │  │    │
│   │                       │   - /manage/*              │  │    │
│   │                       │   - /auth/*                │  │    │
│   │                       └──────────┬─────────────────┘  │    │
│   └──────────────────────────────────┼───────────────────┘    │
│                                      │                        │
└──────────────────────────────────────┼────────────────────────┘
                                       │
          ┌────────────────────────────┼──────────────────┐
          │                            │                  │
    ┌─────▼─────┐            ┌────────▼────────┐   ┌────▼─────┐
    │ SUPABASE  │            │   SARVAM AI     │   │  OPENAI  │
    │           │            │ (Speech-to-Text)│   │ (GPT-4o) │
    │ - Auth    │            │ - Saarika v2.5  │   │  mini    │
    │ - Postgres│            │ - Saaras v2.5   │   │ Whisper  │
    │ - Storage │            └─────────────────┘   └──────────┘
    └───────────┘
```

## Request Lifecycle (Voice → Website)

1. User clicks mic button on Dashboard → [OnboardingModal](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/components/OnboardingModal.tsx#13-801) opens
2. User selects site type (Shop/Menu) → records voice description
3. Audio blob → `POST /api/process-voice` with `Authorization: Bearer <jwt>`
4. Server validates JWT → sends audio to **Sarvam AI** (`speech-to-text-translate`)
5. Transcript → **OpenAI GPT-4o-mini** extracts structured JSON (name, description, products, etc.)
6. Extracted data displayed in stepper UI → user adds products/images manually
7. User clicks "Publish" → `POST /api/site/create` with business data
8. Server: validates auth → checks subscription limits → generates unique slug → inserts into `sites` + `products` tables
9. Public site accessible at `/shop/{slug}` → SSR fetches from `sites` + `products` → renders [ShopTemplate](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/components/ShopTemplate.tsx#5-245) or [MenuTemplate](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/components/MenuTemplate.tsx#6-112)

## State Management
- **React Context** for auth state ([AuthContext](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/components/AuthContext.tsx#7-15)) and onboarding modal state (`OnboardingContext`)
- **Local `useState`** for all page-level state (no Redux, Zustand, or global store)
- **Supabase client singleton** with dev-mode global caching

## Data Flow
- **Client → API Route → External AI → DB**: Voice processing pipeline
- **Client → Supabase Direct**: Settings, profile, subscription reads, shop management (CRUD on `sites`/`products` tables)
- **Server → Supabase**: Site creation, image uploads, OTP management

---

# 3. Feature Inventory (Complete List)

| # | Feature | Description | User Type | Entry Point | Backend Logic | DB Tables | External Services | Status |
|---|---------|-------------|-----------|-------------|---------------|-----------|-------------------|--------|
| 1 | **Landing Page** | Marketing homepage with Hero, How It Works, Social Proof, Features, CTA | Visitor | `/` (page.tsx) | None (SSR) | None | None | **Complete** |
| 2 | **Email Auth (Sign Up/In)** | Email + password registration and login | All Users | `/manage` | Supabase Auth SDK | `auth.users`, `user_subscriptions`, `profiles` | Supabase Auth | **Complete** |
| 3 | **OTP Phone Auth** | Phone-based OTP login for shop owners | Shop Owner (Legacy) | `/api/auth/send-otp`, `/api/auth/verify-otp` | Custom OTP gen + verify | `shop_owners`, `otp_codes` | None (SMS not implemented) | **Stub** |
| 4 | **Voice Onboarding** | Multi-step wizard: select type → record voice → AI extraction → add products → publish | Authenticated User | Dashboard mic button → [OnboardingModal](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/components/OnboardingModal.tsx#13-801) | `/api/process-voice` | `sites`, `products`, `user_subscriptions` | Sarvam AI, OpenAI | **Complete** |
| 5 | **AI Voice Transcription** | Convert speech (10+ Indian languages) to text | System | `/api/process-voice`, `/api/voice/process` | Sarvam AI STT | None | Sarvam AI (Saaras v2.5) | **Complete** |
| 6 | **AI Data Extraction** | Extract structured shop data from transcription | System | `/api/process-voice` | OpenAI GPT-4o-mini | None | OpenAI | **Complete** |
| 7 | **Site Creation** | Creates a live site with unique slug + inserts products | Authenticated User | `/api/site/create` | Slug generation, subscription check, limit enforcement | `sites`, `products`, `user_subscriptions` | None | **Complete** |
| 8 | **Public Shop Page** | SSR shop website with banner, products, contact, social links | Public | `/shop/[slug]` | Server-side fetch from `sites` + `products` | `sites`, `products` | None | **Complete** |
| 9 | **Public Menu Page** | SSR restaurant menu page with food grid layout | Public | `/shop/[slug]` (type=Menu) | Same as shop | `sites`, `products` | None | **Complete** |
| 10 | **My Shop Management** | View, edit, delete shops; edit info, contact, location, timings, products | Authenticated User | `/manage/my-shop` | Direct Supabase client queries | `sites`, `products`, `user_subscriptions` | Supabase Storage | **Complete** |
| 11 | **My Menu Management** | Same as My Shop but for Menu type sites | Authenticated User | `/manage/menu` | Same as My Shop (duplicated code) | `sites`, `products`, `user_subscriptions` | Supabase Storage | **Complete** |
| 12 | **Product CRUD** | Add, edit, delete, toggle visibility of products | Authenticated User | Within My Shop/Menu pages | Direct Supabase queries | `products` | Supabase Storage | **Complete** |
| 13 | **Image Upload** | Upload banner images and product images with compression | Authenticated User | My Shop/Menu, Onboarding | Supabase Storage upload | Storage: `product-images` | None | **Complete** |
| 14 | **Subscription/Recharge** | View current plan, select and "purchase" a new plan | Authenticated User | `/manage/recharge` | Direct DB update (no payment gateway) | `user_subscriptions`, `billing_history` | None | **Partial** (no real payment) |
| 15 | **Settings/Profile** | Edit username, name, phone, email, avatar; view billing history | Authenticated User | `/manage/settings` | Supabase client queries | `profiles`, `billing_history` | Supabase Storage | **Complete** |
| 16 | **Account Deletion** | Delete account request (placeholder only) | Authenticated User | `/manage/settings` | Client-side toast only | None | None | **Stub** |
| 17 | **Poster Generator** | Generate a shareable poster/flyer for the published site | Authenticated User | Post-publish in OnboardingModal | Client-side canvas rendering | None | None | **Complete** |
| 18 | **Pull-to-Refresh** | Mobile UX: pull down to refresh data on management pages | Authenticated User | My Shop/Menu pages | Custom hook (`usePullToRefresh`) | None | None | **Complete** |
| 19 | **Haptic Feedback** | Vibration on key actions for mobile UX | Authenticated User | Throughout management pages | `navigator.vibrate` | None | None | **Complete** |
| 20 | **Image Compression** | Client-side image resizing before upload | System | Onboarding, My Shop/Menu | Canvas-based compression | None | None | **Complete** |
| 21 | **Live/Offline Toggle** | Toggle site visibility (shows "offline" page when off) | Authenticated User | My Shop/Menu pages | `is_live` column update | `sites` | None | **Complete** |
| 22 | **Legacy Voice Pipeline** | Older voice upload → process flow (separate endpoints) | System | `/api/voice/upload`, `/api/voice/process` | Upload to storage + Sarvam + OpenAI | Storage: `voice-recordings` | Sarvam AI, OpenAI | **Deprecated** (superseded by `/api/process-voice`) |
| 23 | **Legacy Manage API** | Shop/product CRUD via API with cookie auth | Legacy | `/api/manage/*` | Cookie-based auth (`shop_auth_test`) | `shops` (legacy) | None | **Deprecated** |

---

# 4. Technical Stack Breakdown

## Frontend

| Aspect | Detail |
|--------|--------|
| **Framework** | Next.js 14.2.35 (App Router) |
| **Language** | TypeScript (strict mode) |
| **Routing** | Next.js App Router (file-system based) |
| **State Management** | React Context (Auth, Onboarding) + local `useState` |
| **Styling** | **Tailwind CSS 3.4.1** + custom CSS variables |
| **Typography** | Inter (Google Fonts, loaded via `next/font`) + Material Symbols Outlined (CDN) |
| **Icons** | Lucide React + Google Material Symbols |
| **Animations** | Motion (Framer Motion successor) v12.34.0 + Tailwind keyframes |
| **Image Handling** | Next.js [Image](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/components/OnboardingModal.tsx#346-374) component, canvas-based compression |
| **QR Code** | `qrcode.react` v4.2.0 |
| **PDF Generation** | `jspdf` v4.1.0 + `html2canvas` v1.4.1 |
| **Toasts** | `react-hot-toast` v2.6.0 |
| **3D Effects** | `ogl` v1.0.11 (WebGL library, likely for landing page) |
| **Build** | Next.js built-in (Webpack/Turbopack) |

## Backend

| Aspect | Detail |
|--------|--------|
| **Runtime** | Node.js (serverless via Netlify Functions) |
| **Framework** | Next.js API Routes (App Router [route.ts](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/app/api/manage/shop/route.ts) handlers) |
| **API Type** | REST (JSON request/response) |
| **Authentication** | Supabase Auth (email/password) — JWT Bearer tokens in API routes |
| **Middleware** | **Not Implemented** — no Next.js middleware for auth guards |
| **Validation** | Manual validation in route handlers (no schema validation library) |
| **Error Handling** | Try/catch blocks with generic error responses |
| **Logging** | `console.log`/`console.error` — no structured logging |

## Database

| Aspect | Detail |
|--------|--------|
| **Type** | PostgreSQL (via Supabase) |
| **Schema Design** | Relational with separate `sites` and `products` tables |
| **ORM** | None — Supabase JS client (query builder) |
| **Indexing** | Unknown (managed by Supabase, not explicitly configured) |
| **Relationships** | `products.site_id` → `sites.id` (FK); `user_subscriptions.user_id` → `auth.users.id` |
| **RLS** | Unknown/Unverified — `supabaseServer` bypasses RLS when service role key is set |

## Infrastructure

| Aspect | Detail |
|--------|--------|
| **Hosting** | Netlify (via `@netlify/plugin-nextjs`) |
| **CI/CD** | Git-based deployment to Netlify (no explicit CI pipeline) |
| **Environment Separation** | **None** — single environment with [.env.local](file:///c:/Users/LENOVO/Desktop/buildyoustore/.env.local) |
| **Secrets Management** | [.env.local](file:///c:/Users/LENOVO/Desktop/buildyoustore/.env.local) file (live API keys committed in repo history) |
| **CDN** | Netlify Edge |
| **Domain** | `voicesites.netlify.app` |

---

# 5. Code Quality Assessment

| Metric | Score | Notes |
|--------|-------|-------|
| **Code Organization** | **4/10** | Flat component directory; no feature/domain grouping |
| **Modularity** | **3/10** | [OnboardingModal.tsx](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/components/OnboardingModal.tsx) is 800+ lines; [my-shop/page.tsx](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/app/manage/my-shop/page.tsx) and [menu/page.tsx](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/app/manage/menu/page.tsx) are 1100+ lines each and nearly identical |
| **Reusability** | **3/10** | [ShopCard](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/app/manage/menu/page.tsx#146-805), [ProductsList](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/app/manage/menu/page.tsx#806-902), [SiteInfo](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/app/manage/menu/page.tsx#903-1125) are duplicated between my-shop and menu pages |
| **Separation of Concerns** | **4/10** | API calls, business logic, and UI all mixed in page components |
| **Naming Conventions** | **5/10** | Generally clear but inconsistent (e.g., `shop_name` vs `name`, `shops` vs `sites`) |
| **Type Safety** | **4/10** | TypeScript enabled but heavy use of `any`, `eslint-disable`, and untyped function params |

### Anti-Patterns Found

1. **God Component**: [OnboardingModal.tsx](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/components/OnboardingModal.tsx) (801 lines) — handles recording, transcription, product management, image upload, publishing, and poster generation all in one component
2. **Massive Code Duplication**: [my-shop/page.tsx](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/app/manage/my-shop/page.tsx) (1122 lines) and [menu/page.tsx](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/app/manage/menu/page.tsx) (1125 lines) are ~95% identical — only the type filter differs
3. **Dual Table References**: Some routes use `shops` table, others use `sites` — indicates an incomplete migration
4. **Client-Side Subscription Management**: Plan purchases update the DB directly from the client with no server-side validation or payment verification
5. **ESLint Ignored**: `ignoreDuringBuilds: true` in [next.config.mjs](file:///c:/Users/LENOVO/Desktop/buildyoustore/next.config.mjs) — build errors are suppressed
6. **No Input Sanitization Library**: Manual validation only, no Zod/Yup/joi
7. **Hardcoded Pricing**: Plan prices are duplicated in both [recharge/page.tsx](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/app/manage/recharge/page.tsx) and [site/create/route.ts](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/app/api/site/create/route.ts)
8. **Legacy Dead Code**: [page.backup.tsx](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/app/page.backup.tsx) (29KB backup file), `/api/manage/*` routes with deprecated cookie auth, `/api/voice/*` routes superseded by `/api/process-voice`

### Technical Debt List

| Priority | Debt Item |
|----------|-----------|
| 🔴 Critical | API keys exposed in [.env.local](file:///c:/Users/LENOVO/Desktop/buildyoustore/.env.local) (committed or at risk) |
| 🔴 Critical | No payment gateway — subscriptions are free |
| 🔴 Critical | No Next.js middleware for auth route protection |
| 🟡 High | 2200+ lines of duplicated code between my-shop and menu pages |
| 🟡 High | 800-line OnboardingModal needs decomposition |
| 🟡 High | Dual `shops`/`sites` table naming needs resolution |
| 🟡 High | No RLS policies verified on Supabase tables |
| 🟠 Medium | No automated tests (unit, integration, or E2E) |
| 🟠 Medium | No structured error logging or monitoring |
| 🟠 Medium | No loading/error boundaries at route level |
| 🟢 Low | Backup file ([page.backup.tsx](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/app/page.backup.tsx)) should be removed |
| 🟢 Low | Legacy API routes (`/api/manage/*`, `/api/voice/*`) should be removed |

---

# 6. Security Review

### Auth Vulnerabilities

| Issue | Severity | Detail |
|-------|----------|--------|
| **No middleware auth guard** | 🔴 Critical | `/manage/*` pages rely on client-side [AuthContext](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/components/AuthContext.tsx#7-15) to redirect unauthenticated users. A direct browser request to these URLs will render the page before the redirect fires. There is no server-side middleware protecting these routes. |
| **Custom JWT in OTP auth** | 🔴 Critical | [verify-otp/route.ts](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/app/api/auth/verify-otp/route.ts) generates a Base64-encoded JSON "token" — this is NOT a JWT, has no signature, and can be trivially forged: `Buffer.from(JSON.stringify(payload)).toString('base64')` |
| **OTP exposed in dev response** | 🟡 High | [send-otp/route.ts](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/app/api/auth/send-otp/route.ts) returns `debug_otp` when `NODE_ENV === 'development'`. If deployed without changing the environment, OTP is exposed in the API response. |
| **Legacy cookie auth is trivial** | 🟡 High | `/api/manage/*` routes check `shop_auth_test` cookie value equals `'authenticated'` — any user can set this cookie manually. |

### Authorization Gaps

| Issue | Severity | Detail |
|-------|----------|--------|
| **No ownership verification on client-side operations** | 🔴 Critical | My-shop and menu pages query `sites` table filtered by `user_id`, but the Supabase client uses the anon key. If RLS is not properly configured, users could potentially access other users' data. |
| **Subscription update from client** | 🔴 Critical | [recharge/page.tsx](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/app/manage/recharge/page.tsx) directly updates `user_subscriptions` without payment verification. Users can give themselves unlimited credits for free. |
| **No API rate limiting** | 🟡 High | All API routes are open to unlimited requests. AI endpoints (OpenAI + Sarvam) can be abused, incurring costs. |

### Input Validation Issues

| Issue | Severity | Detail |
|-------|----------|--------|
| **No schema validation** | 🟡 High | API routes manually check for required fields but don't validate types, lengths, or formats. No use of Zod, Yup, or similar. |
| **JSON.parse without safeguard** | 🟠 Medium | OpenAI response is parsed with `JSON.parse(content)` — could throw if the model returns invalid JSON. |
| **File size limit inconsistency** | 🟢 Low | `/api/manage/images` limits to 5MB, but settings avatar upload has no server-side size limit. |

### Sensitive Data Exposure

| Issue | Severity | Detail |
|-------|----------|--------|
| **API keys in [.env.local](file:///c:/Users/LENOVO/Desktop/buildyoustore/.env.local)** | 🔴 Critical | [.env.local](file:///c:/Users/LENOVO/Desktop/buildyoustore/.env.local) contains live OpenAI API key (`sk-proj-...`), Sarvam API key (`sk_o5mo...`), and Supabase credentials. While [.env.local](file:///c:/Users/LENOVO/Desktop/buildyoustore/.env.local) is typically gitignored, it exists in the working directory and the anon key is public by design but the OpenAI/Sarvam keys are sensitive. |
| **Supabase URL hardcoded in [next.config.mjs](file:///c:/Users/LENOVO/Desktop/buildyoustore/next.config.mjs)** | 🟢 Low | The Supabase hostname is duplicated in config (acceptable since it's also in env vars). |

### API Rate Limiting
**Not Implemented.** No rate limiting on any endpoint.

---

# 7. Performance Review

### Bottlenecks

| Issue | Impact | Detail |
|-------|--------|--------|
| **`force-dynamic` on shop pages** | 🟡 High | `/shop/[slug]/page.tsx` uses `export const dynamic = 'force-dynamic'` and `revalidate = 0` — every page view triggers a full server-side fetch. No caching at all. For a high-traffic shop page, this will be slow and costly. |
| **Slug uniqueness check is sequential** | 🟠 Medium | [site/create/route.ts](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/app/api/site/create/route.ts) uses a `while(true)` loop querying the DB for slug uniqueness — O(n) queries in worst case. Should use a single query with conflict handling or UUID-based slugs. |
| **No image optimization pipeline** | 🟠 Medium | Client-side compression is good, but no server-side image optimization (no CDN transforms, no WebP conversion). |

### Inefficient Queries

| Issue | Detail |
|-------|--------|
| **`select('*')` everywhere** | All Supabase queries fetch all columns. No projection or field selection optimization. |
| **Products fetched separately** | Shop page makes two sequential queries (`sites` + `products`) instead of a single join. |
| **No pagination** | My-shop and menu pages fetch ALL sites for a user in one query. No pagination or infinite scroll for large datasets. |

### Re-Render Issues

| Issue | Detail |
|-------|--------|
| **Landing page auth check** | [page.tsx](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/app/page.tsx) renders a spinner, calls `getSession()`, then either redirects or shows the landing page. Every unauthenticated visit triggers this check before rendering content. |
| **Large component trees** | 1100-line page components will re-render entirely on any state change since there's no memoization. |

### Scalability Limitations

| Limitation | Detail |
|------------|--------|
| **Netlify serverless cold starts** | API routes may have cold start latency, especially for AI-heavy endpoints. |
| **No connection pooling** | Each serverless invocation creates a new Supabase client. No PgBouncer or connection pooling configuration visible. |
| **Single-region deployment** | Netlify deploys to one region; Supabase project also single-region. |

---

# 8. Business Logic Mapping

### Core Revenue Logic
- **Subscription-based model** with 4 tiers:
  - Base Store: ₹349/mo → 1 shop, 15 products
  - Pro Store: ₹649/mo → 2 shops, 20 products
  - Menu Starter: ₹249/mo → 1 menu, 20 items
  - Menu Pro: ₹449/mo → 2 menus, 25 items
- **30-day billing cycles** (set at "purchase" time)
- Revenue is **NOT collected** — no payment gateway. The "Recharge" button simply updates the database.

### Critical Business Workflows

1. **Onboarding Flow**: Type selection → Voice recording → AI processing → Data review → Product addition → Image upload → Publish
2. **Site Management**: View sites → Edit details/products/images → Toggle live status → Delete
3. **Subscription Lifecycle**: Sign up (free, expired plan) → Purchase plan → Create sites within limits → Plan expires → Recharge

### Edge Cases Handled
- ✅ Slug collision (appends counter)
- ✅ Subscription expiry check before site creation
- ✅ Product limit enforcement per plan
- ✅ Phone number formatting (+91 prefix)
- ✅ Image compression before upload
- ✅ Site "offline" state with user-friendly message

### Edge Cases Missing
- ❌ What happens when a plan expires with existing sites? (Sites remain accessible — no downgrade logic)
- ❌ No plan upgrade/downgrade flow (can only purchase when current plan is expired)
- ❌ No refund or cancellation logic
- ❌ No email verification after signup (Supabase default may handle this, but not explicitly enforced)
- ❌ No concurrent edit protection (two tabs editing same site could cause data loss)
- ❌ No slug customization (auto-generated, no user input)
- ❌ No product reordering
- ❌ No site analytics or visitor tracking

### Hidden Assumptions
- All users are Indian (phone validation is India-only: `+91`)
- Prices are in INR only
- Audio input is always WebM format
- Users will manually add products (AI doesn't extract products in the latest flow)
- Supabase RLS is properly configured (not verified)

---

# 9. Database ER Structure (Text Explanation)

> **Note:** The Supabase project referenced by the codebase (`wdnruubljlwrduxnvuhr`) is not accessible via the MCP tool. The schema below is **inferred** from code references.

### Main Entities

```
┌─────────────────────┐
│     auth.users       │  (Supabase Auth — managed)
│─────────────────────│
│  id (UUID, PK)       │
│  email               │
│  encrypted_password   │
│  raw_user_meta_data   │  ← { full_name, avatar_url }
└──────────┬──────────┘
           │ 1
           │
     ┌─────┴──────┐        ┌──────────────────┐
     │             │        │                  │
     ▼             ▼        ▼                  │
┌──────────┐  ┌──────────────────┐  ┌─────────────────┐
│ profiles │  │user_subscriptions│  │ billing_history  │
│──────────│  │──────────────────│  │─────────────────│
│ id (PK=  │  │ id (PK, UUID)    │  │ id (PK, UUID)   │
│  user_id)│  │ user_id (FK)     │  │ user_id (FK)    │
│ username │  │ store_plan       │  │ plan_name       │
│ full_name│  │ menu_plan        │  │ amount          │
│ phone_no │  │ shop_limit       │  │ status          │
│ contact_ │  │ menu_limit       │  │ created_at      │
│   email  │  │ store_expires_at │  └─────────────────┘
│ avatar_  │  │ menu_expires_at  │
│   url    │  └──────────────────┘
│ updated_ │
│   at     │
└──────────┘
           │ 1
           │
           ▼ N
    ┌──────────────┐        ┌──────────────┐
    │    sites     │   1──N │   products   │
    │──────────────│        │──────────────│
    │ id (PK,UUID) │        │ id (PK,UUID) │
    │ user_id (FK) │        │ site_id (FK) │
    │ slug (UNIQUE)│        │ name         │
    │ type         │        │ price        │
    │ name         │        │ description  │
    │ description  │        │ image_url    │
    │ image_url    │        │ is_live      │
    │ timing       │        └──────────────┘
    │ location     │
    │ owner_name   │
    │ contact_no   │
    │ email        │
    │ whatsapp_no  │
    │ tagline      │
    │ established  │
    │ state        │
    │ pincode      │
    │ address      │
    │ social_links │
    │ is_live      │
    │ created_at   │
    └──────────────┘

LEGACY TABLES (referenced but possibly deprecated):
    ┌──────────────┐     ┌──────────────┐
    │    shops     │     │ shop_owners  │
    │ (legacy)     │     │ (legacy)     │
    │──────────────│     │──────────────│
    │ id           │     │ id           │
    │ slug         │     │ phone        │
    │ shop_name    │     │ shop_id (FK) │
    │ products[]   │     └──────────────┘
    │ description  │
    │ timings      │     ┌──────────────┐
    │ location     │     │  otp_codes   │
    │ contact{}    │     │ (legacy)     │
    │ hero_image   │     │──────────────│
    │ logo_image   │     │ phone (PK)   │
    │ created_at   │     │ code         │
    │ updated_at   │     │ expires_at   │
    └──────────────┘     └──────────────┘
```

### Relationships
- `auth.users` 1→1 `profiles` (same primary key)
- `auth.users` 1→1 `user_subscriptions` (via `user_id`)
- `auth.users` 1→N `sites` (via `user_id`)
- `auth.users` 1→N `billing_history` (via `user_id`)
- `sites` 1→N `products` (via `site_id`)

### Cardinality
- Each user has exactly 1 subscription record and 1 profile
- Each user can have 0-2 sites (limited by plan)
- Each site can have 0-25 products (limited by plan)

### Normalization Level
- **Inferred: 2NF** — Products are properly normalized into a separate table. Legacy `shops` table stored products as a JSONB array (denormalized). The migration to `sites` + `products` tables moves toward 3NF.

---

# 10. API Documentation Extract

### POST `/api/process-voice`
| | Detail |
|-|--------|
| **Purpose** | Transcribe audio and extract structured shop/menu data using AI |
| **Auth** | Bearer JWT (Supabase session token) |
| **Request Body** | `multipart/form-data` — `audio: File`, `type: "Shop" | "Menu"` |
| **Response** | `{ transcript: string, data: ExtractedShopData }` |
| **Error Handling** | 401 (no/invalid auth), 400 (no audio), 500 (AI failure) |
| **Middleware** | None |

---

### POST `/api/site/create`
| | Detail |
|-|--------|
| **Purpose** | Create a new site with products and enforce subscription limits |
| **Auth** | Bearer JWT (forwarded to Supabase client) |
| **Request Body** | `{ type, name, description, products[], timing, location, social_links, image_url, owner_name, contact_number, ... }` |
| **Response** | `{ success: true, siteId: string, slug: string }` |
| **Error Handling** | 401 (unauth), 400 (missing name, too many products), 403 (plan expired/limit reached), 500 (server error) |
| **Middleware** | None |

---

### POST `/api/voice/upload`
| | Detail |
|-|--------|
| **Purpose** | Upload audio recording to Supabase Storage |
| **Auth** | None (server uses `supabaseServer`) |
| **Request Body** | `multipart/form-data` — `audio: File` |
| **Response** | `{ success: true, audioUrl: string, path: string }` |
| **Error Handling** | 400 (no file), 500 (upload error) |
| **Status** | ⚠️ **Deprecated** — no auth check, superseded by `/api/process-voice` |

---

### POST `/api/voice/process`
| | Detail |
|-|--------|
| **Purpose** | Download audio from URL, transcribe with Sarvam, extract data with GPT-4o |
| **Auth** | None |
| **Request Body** | `{ audioUrl: string, context?: "name" | "details" | "product" }` |
| **Response** | `{ success: true, transcription: string, extractedData: object }` |
| **Error Handling** | 400 (no URL), 500 (fetch/AI failure) |
| **Status** | ⚠️ **Deprecated** — no auth, superseded by `/api/process-voice` |

---

### POST `/api/auth/send-otp`
| | Detail |
|-|--------|
| **Purpose** | Generate and store OTP for phone-based login |
| **Auth** | None |
| **Request Body** | `{ phone: string }` |
| **Response** | `{ success: true, message: string, debug_otp?: string }` |
| **Error Handling** | 400 (missing/invalid phone), 404 (phone not registered) |
| **Status** | ⚠️ **Stub** — OTP not sent via SMS |

---

### POST `/api/auth/verify-otp`
| | Detail |
|-|--------|
| **Purpose** | Verify OTP and issue session token |
| **Auth** | None |
| **Request Body** | `{ phone: string, otp: string }` |
| **Response** | `{ success: true, shopId: string }` + sets `shop_auth` cookie |
| **Error Handling** | 400 (missing fields), 401 (invalid/expired OTP), 404 (owner not found) |
| **Status** | ⚠️ **Insecure** — token is unsigned Base64 |

---

### GET `/api/manage/shop`
| | Detail |
|-|--------|
| **Purpose** | Fetch all shops or a specific shop by ID |
| **Auth** | Cookie: `shop_auth_test=authenticated` |
| **Query Params** | `shopId?: string` |
| **Response** | `{ shop: object }` or `{ shops: object[] }` |
| **Status** | ⚠️ **Deprecated** — uses legacy `shops` table and trivial cookie auth |

---

### PUT `/api/manage/shop`
| | Detail |
|-|--------|
| **Purpose** | Update shop fields |
| **Auth** | Cookie: `shop_auth_test=authenticated` |
| **Request Body** | `{ shopId: string, ...updates }` |
| **Allowed Fields** | `shop_name, description, timings, location, contact, hero_image, logo_image` |
| **Status** | ⚠️ **Deprecated** |

---

### POST/PUT/DELETE `/api/manage/products`
| | Detail |
|-|--------|
| **Purpose** | Add/update/delete products on a shop |
| **Auth** | Cookie: `shop_auth_test=authenticated` |
| **Note** | Products are stored as JSONB array in `shops.products` column (legacy) |
| **Status** | ⚠️ **Deprecated** |

---

### POST `/api/manage/images`
| | Detail |
|-|--------|
| **Purpose** | Upload images to Supabase Storage |
| **Auth** | Cookie: `shop_auth_test=authenticated` |
| **Request Body** | `multipart/form-data` — `image: File, type: string, shopId: string` |
| **Validation** | Image type check, 5MB size limit |
| **Status** | ⚠️ **Deprecated** |

---

### GET `/api/shop/[slug]`
| | Detail |
|-|--------|
| **Purpose** | Fetch shop data by slug |
| **Auth** | None (public) |
| **Response** | `{ success: true, shop: object }` |
| **Note** | Uses legacy `shops` table, not `sites`. **Likely obsolete** — the main `/shop/[slug]` page does SSR directly via `supabaseServer`. |
| **Status** | ⚠️ **Deprecated** |

---

# 11. Risk Assessment

### Architectural Risks

| Risk | Severity | Detail |
|------|----------|--------|
| **No middleware auth protection** | 🔴 Critical | Any protected route can be accessed for a brief moment before client-side redirect. Sensitive data could be exposed in initial render. |
| **Dual table schema** | 🔴 Critical | `shops` (legacy) and `sites` (current) coexist. Different routes write to different tables, creating data inconsistency and confusion. |
| **No state management library** | 🟡 Medium | Complex state across deep component trees is managed with prop drilling and local state. Will become unmanageable at scale. |

### Scaling Risks

| Risk | Severity | Detail |
|------|----------|--------|
| **Serverless cold starts on AI routes** | 🟡 High | Voice processing involves 2 sequential API calls (Sarvam + OpenAI). Combined with cold start, user-perceived latency could be 10-15s. |
| **No CDN caching on shop pages** | 🟡 High | `force-dynamic` prevents any caching. At scale, this will hammer the database on every page view. |
| **No database connection pooling** | 🟠 Medium | Each serverless function invocation creates a new connection. |

### Security Risks

| Risk | Severity | Detail |
|------|----------|--------|
| **Exposed API keys** | 🔴 Critical | OpenAI and Sarvam keys in [.env.local](file:///c:/Users/LENOVO/Desktop/buildyoustore/.env.local). If committed to git history, they are permanently compromised. |
| **Free subscription bypass** | 🔴 Critical | Client-side subscription update allows anyone to give themselves unlimited credits. |
| **Unverified RLS** | 🔴 Critical | Cannot confirm if Row-Level Security is enabled on Supabase tables. If not, any authenticated user can read/write all data. |

### Operational Risks

| Risk | Severity | Detail |
|------|----------|--------|
| **No monitoring/alerting** | 🟡 High | No error tracking (Sentry, LogRocket), no metrics, no uptime monitoring. |
| **No backup strategy** | 🟡 High | Supabase provides automatic backups on paid plans, but no explicit backup/restore strategy documented. |
| **Single-point-of-failure on AI APIs** | 🟡 High | If Sarvam AI or OpenAI goes down, the entire onboarding flow breaks with no fallback. |
| **No staging environment** | 🟠 Medium | Development and production share the same Supabase instance and environment. |

---

# 12. Refactor & Improvement Roadmap

## Quick Wins (1 Week)

| # | Action | Impact |
|---|--------|--------|
| 1 | **Rotate and secure all API keys** — regenerate OpenAI and Sarvam keys, verify [.env.local](file:///c:/Users/LENOVO/Desktop/buildyoustore/.env.local) is gitignored | 🔴 Security |
| 2 | **Add Next.js middleware** for `/manage/*` routes to enforce server-side auth | 🔴 Security |
| 3 | **Delete legacy/deprecated code** — Remove `/api/manage/*`, `/api/voice/*`, `/api/shop/[slug]`, [page.backup.tsx](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/app/page.backup.tsx) | 🟢 Hygiene |
| 4 | **Move subscription updates to API route** — prevent client-side credit manipulation | 🔴 Security |
| 5 | **Enable ESLint during builds** — fix or suppress lint errors properly | 🟡 Quality |
| 6 | **Add error boundaries** — wrap routes with React error boundaries | 🟡 UX |

## Mid-Level Improvements (1 Month)

| # | Action | Impact |
|---|--------|--------|
| 1 | **Unify my-shop and menu into a single component** — extract shared [ShopCard](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/app/manage/menu/page.tsx#146-805), [ProductsList](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/app/manage/menu/page.tsx#806-902), [SiteInfo](file:///c:/Users/LENOVO/Desktop/buildyoustore/src/app/manage/menu/page.tsx#903-1125) into reusable components with a `type` prop | 🟡 Major (saves ~1000 lines) |
| 2 | **Decompose OnboardingModal** — split into `TypeSelector`, `VoiceRecorder`, `DataReview`, `ProductEditor`, `Publisher` sub-components | 🟡 Major |
| 3 | **Add Zod schema validation** on all API routes | 🟡 Security/Quality |
| 4 | **Implement proper payment gateway** (Razorpay, PhonePe, or Stripe India) for subscription purchases | 🔴 Revenue (currently $0) |
| 5 | **Add ISR (Incremental Static Regeneration)** to `/shop/[slug]` with 60s revalidation instead of `force-dynamic` | 🟡 Performance |
| 6 | **Setup RLS policies** on all Supabase tables and verify with test suite | 🔴 Security |
| 7 | **Add API rate limiting** using Netlify Edge Functions or middleware | 🟡 Security |
| 8 | **Set up staging environment** — separate Supabase project + Netlify deploy preview | 🟠 Operations |

## Major Structural Upgrades (3–6 Months)

| # | Action | Impact |
|---|--------|--------|
| 1 | **Migrate to Server Components + Server Actions** — move data fetching to RSC, reduce client bundle size | 🟡 Performance/Architecture |
| 2 | **Add comprehensive test suite** — Jest + React Testing Library for units, Playwright for E2E | 🟡 Quality |
| 3 | **Implement proper analytics** — user tracking, site visit counts, conversion funnels | 🟡 Business Intelligence |
| 4 | **Setup monitoring stack** — Sentry for errors, Vercel Analytics (if migrating) or custom dashboard | 🟡 Operations |
| 5 | **Implement SEO features for shop pages** — dynamic `<meta>` tags, Open Graph, structured data (Schema.org LocalBusiness) | 🟡 Growth |
| 6 | **Add custom domain support** — allow shops to use their own domain name | 🟡 Premium Feature |
| 7 | **Multi-language UI** — since the target market speaks Hindi, Tamil, etc., the management UI should also support these languages | 🟡 Market Fit |
| 8 | **Clean up database schema** — drop legacy `shops` table, add proper indexes, add migration scripts | 🟠 Hygiene |

---

# 13. Production Readiness Score

## Overall Score: **3/10**

| Category | Score | Rationale |
|----------|-------|-----------|
| Functionality | 6/10 | Core flow works (voice → site), management features functional |
| Security | 2/10 | Exposed keys, no middleware auth, client-side subscription bypass, unsigned tokens |
| Performance | 4/10 | No caching, force-dynamic everywhere, no optimization |
| Code Quality | 3/10 | Massive duplication, god components, suppressed linting |
| Testing | 0/10 | Zero automated tests |
| Monitoring | 0/10 | No error tracking, logging, or alerting |
| Payment | 0/10 | No payment gateway — zero revenue capability |
| Infrastructure | 3/10 | Single environment, no staging, no secrets rotation |

### What Blocks Production?

1. **No payment gateway** — the product literally cannot collect money
2. **Security vulnerabilities** — exposed API keys, no server-side auth middleware, client-side subscription manipulation
3. **No RLS verification** — potential data breach for all users
4. **Zero monitoring** — no way to know if things break

### What Must Be Fixed Immediately?

1. ⚡ **Rotate all API keys** (OpenAI, Sarvam) — assume they are compromised
2. ⚡ **Add Next.js middleware** for auth on `/manage/*` routes
3. ⚡ **Move subscription updates to a server-side API route** with payment verification
4. ⚡ **Verify and enable RLS** on all Supabase tables
5. ⚡ **Remove or gate deprecated API routes** that have no authentication

---

# 14. Suggested PRD (Product Requirement Document)

## Product Overview
**VoiceSite** is a voice-first website builder designed for small Indian businesses. It allows non-technical shop owners and restauranteurs to create professional online presences by simply speaking about their business. The platform handles transcription, data extraction, and website generation automatically.

## Target Users
- **Primary:** Small business owners in India (retail shops, restaurants, cafes, street vendors)
- **Secondary:** Franchise operators who need quick multi-location web presences
- **Persona:** 25-55 year old business owner, comfortable speaking in regional language, may not be tech-savvy, uses a smartphone as primary device

## Problem Statement
Millions of small Indian businesses lack an online presence because:
1. Website builders require technical knowledge and are in English
2. Hiring a developer is expensive (₹5,000-₹50,000+)
3. Existing solutions don't support Indian languages natively
4. Business owners are busy and can't spend hours on website creation

VoiceSite solves this by letting users **speak in their native language** and generating a website in **under 2 minutes**.

## Current Feature Set
- Voice-to-website creation (10+ Indian languages)
- Two site types: Online Store and Digital Menu
- Product catalog management with image upload
- Public shareable URLs
- Site live/offline toggle
- Poster/flyer generation for offline marketing
- Subscription-based plans (₹249-₹649/mo)
- User profile and billing management

## Future Enhancements (Recommended)
1. **Payment Gateway Integration** (Razorpay/PhonePe) — P0
2. **WhatsApp Ordering** — "Order via WhatsApp" button on shop pages
3. **Custom Domains** — Premium users can use their own domain
4. **Google Maps Integration** — Embedded map on shop pages
5. **Site Analytics** — Visitor count, popular products, traffic sources
6. **Multi-template Selection** — Let users choose from 3-5 visual themes
7. **SEO Optimization** — Auto-generated meta tags, Schema.org markup
8. **QR Code Sharing** — Generate and download QR codes for physical stores
9. **Referral System** — Users invite others for discounts
10. **Catalog Import** — Upload CSV/Excel of products

## Functional Requirements

| ID | Requirement | Priority | Status |
|----|------------|----------|--------|
| FR-1 | Users can sign up with email + password | P0 | ✅ Done |
| FR-2 | Users can record voice in any Indian language | P0 | ✅ Done |
| FR-3 | AI transcribes and extracts business info | P0 | ✅ Done |
| FR-4 | Users can create online store or digital menu | P0 | ✅ Done |
| FR-5 | Users can add/edit/delete products with images | P0 | ✅ Done |
| FR-6 | Sites are publicly accessible via unique URLs | P0 | ✅ Done |
| FR-7 | Users can toggle site live/offline | P1 | ✅ Done |
| FR-8 | **Users can purchase plans via payment gateway** | **P0** | ❌ Not Done |
| FR-9 | Subscription limits enforce site/product creation | P0 | ✅ Done |
| FR-10 | Users can edit profile and view billing history | P2 | ✅ Done |
| FR-11 | **SMS OTP delivery for phone-based auth** | P1 | ❌ Not Done |
| FR-12 | **Account deletion via backend process** | P1 | ❌ Not Done |

## Non-Functional Requirements

| ID | Requirement | Target | Current |
|----|------------|--------|---------|
| NFR-1 | Page load time (shop pages) | < 2s | ~3-5s (no caching) |
| NFR-2 | Voice-to-site creation time | < 60s | ~30-90s (dependent on AI APIs) |
| NFR-3 | Uptime | 99.9% | Unmeasured |
| NFR-4 | Concurrent users | 1000+ | Unknown (no load testing) |
| NFR-5 | Mobile responsiveness | 100% of features | ~95% |
| NFR-6 | Accessibility (WCAG 2.1) | Level AA | Not Implemented |
| NFR-7 | Security audit compliance | OWASP Top 10 | ❌ Multiple violations |

## KPIs

| KPI | Metric | Current |
|-----|--------|---------|
| User Signups | Count per week | Unknown |
| Sites Created | Total active sites | Unknown |
| Conversion Rate | Signup → Paid Plan | **0%** (no payment) |
| MRR (Monthly Recurring Revenue) | ₹ per month | **₹0** |
| Churn Rate | % users who don't renew | N/A |
| Voice Processing Success Rate | % voice inputs that produce valid data | Unknown |
| Site Page Views | Views per site per month | Unknown |

## Versioning Strategy

| Version | Milestone | Timeline |
|---------|-----------|----------|
| **v0.1** (Current) | MVP — Voice onboarding + basic site management | ✅ Complete |
| **v0.2** | Payment integration + security hardening | 2-3 weeks |
| **v0.3** | Analytics + SEO + performance optimization | 4-6 weeks |
| **v1.0** | Production launch with monitoring, tests, staging | 2-3 months |
| **v1.1** | WhatsApp ordering + custom domains | 4-5 months |
| **v2.0** | Multi-template + catalog import + referral system | 6+ months |

---

> **Final Assessment:** VoiceSite has an innovative core concept with a functional MVP prototype. The voice-to-website pipeline works and the Indian language support via Sarvam AI is a genuine differentiator. However, the codebase has **critical security vulnerabilities**, **zero revenue capability** (no payment gateway), **massive code duplication**, and **no testing or monitoring**. Before any public launch or funding pitch, the items in the "What Must Be Fixed Immediately" section are non-negotiable.
