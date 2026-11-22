# Migrasi ke Platform Undangan Digital Dinamis (Full Cloudflare) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Ansel Moments from a static single-wedding React app (+ Firestore order form) into a full-stack dynamic wedding invitation platform on **Cloudflare Workers (Hono) + D1 + R2 + Cloudflare Access**, converting the existing Adi & Eva page into the platform's first active modular template (`editorial-classic`) with per-client show/hide/reorderable sections and an Admin Media & Section Studio.

**Architecture:** Single-repository full-stack Cloudflare Worker (`wrangler.jsonc` + `worker/index.js` using Hono) serving the Vite React SPA via static assets (`run_worker_first: ["/api/*"]` plus selective edge `HTMLRewriter` for `/:slug` WhatsApp OG previews). All transactional, pricing, & invitation data moves from Firebase Firestore to **Cloudflare D1 (6 relational tables + `sections_json`)**; all dynamic invitation photos/audio live in **Cloudflare R2** (`media.anselmoments.com`) after client-side browser `<canvas>` WebP compression; `/admin` and `/api/admin/*` are protected by **Cloudflare Access (Zero Trust)** with Web Crypto JWT verification in the Worker.

**Tech Stack:** React 18, Vite 6, React Router v6, Tailwind CSS v4, Lucide React, Hono, Cloudflare Workers + D1 + R2 + Cloudflare Access, Wrangler CLI, Node 22 built-in `node --test`.

## Global Constraints

- **1 Active Template:** Only `editorial-classic` (refactored from `AdiEvaInvitation.jsx`) is active in the template registry and `/order` Step 2; extra placeholder themes (`ivory-minimal`, `warm-sand`) are removed until built.
- **Zero Regression on Existing URLs:** `/`, `/adi-eva`, `/custom-name`, `/adi-eva/custom-name`, `/order`, and `/order/:orderCode` must keep working without breaking shared links.
- **Database-Driven Pricing (Free or Paid Dynamically):** All package & add-on prices come from the D1 `packages` table (managed via `/admin`). When `price === 0`, UI & WhatsApp render `Free` and new orders start at `pending_confirmation`; when `total_price > 0`, UI & WhatsApp render `Rp...` (formatted Rupiah), new orders start at `pending_payment`, and payment/confirmation is handled via WhatsApp Admin (`6285700848786`, no bank account/QRIS displayed on web). Prices are ALWAYS calculated server-side in `POST /api/orders` from D1 and snapshotted on the `orders` row to prevent client price tampering.
- **Complete Firebase Removal:** Uninstall `firebase`, remove `src/lib/firebase.js` and `firestore.rules`, migrate orders, guestbook wishes, and Adi & Eva invitation data to D1 + R2.
- **Admin Security:** All `/api/admin/*` endpoints must verify `Cf-Access-Jwt-Assertion` against Cloudflare Access JWKS + `CF_ACCESS_AUD` (local dev bypass allowed ONLY when `DEV_BYPASS_ACCESS === 'true'` in `.dev.vars`, never set in production).
- **Anti-Slop UI Craft:** Maintain the `lovree.com` warm editorial aesthetic (`Ibarra Real Nova` + `DM Sans`, `goldSand-*` & `codGray-*`, flat borders, no gradients/glows/emoji labels) across `/order`, `/order/:orderCode`, and `/admin`.
- **Ponytail Discipline:**
  - `ponytail: templates kept in shared JS registry (src/templates/registry.js) instead of a D1 templates table because only 1 React template exists; move metadata to D1 if non-developers need runtime catalog edits.`
  - `ponytail: client-side WebP compression uses native createImageBitmap + Canvas.toBlob (~25 lines) instead of external compression libraries.`
  - `ponytail: Cloudflare Access JWT verified with native Web Crypto API (~45 lines) instead of jose/auth frameworks.`
  - `ponytail: built-in node --test instead of Vitest.`

## Default Decisions (Reviewable Before Execution)

The plan pre-fills these pragmatic defaults (flag any item you want changed before implementation):
1. **Optional Sections in `editorial-classic`:** `cover`, `quote`, `couple`, `mepandes` *(off by default)*, `pawiwahan`, `events`, `love_story` *(off by default)*, `gallery`, `guestbook`, `gift`, `custom_note` *(off by default — covers Dresscode / Live Streaming / Turut Mengundang)*, `footer`.
2. **Preview Mode:** Draft/preview invitations load at `/:slug?preview=<preview_token>` (unguessable per-invitation token shown in Admin Panel) while returning 404 to public visitors until `status = 'published'`.
3. **Split Link Wishes:** Split-link invitations share `media_assets` via `order_id`, while each `invitation` row has its own `slug` and `sections_json` (wishes scoped per `invitation_id` by default, or optionally shared via `wishes_group_id` if desired).
4. **Root Route `/`:** Continues rendering `/adi-eva` during migration so existing links never break; swap to a Landing Page later in Phase 5.
5. **Default Brand `<title>`:** `Ansel Moments — Undangan Digital Bali`.

---

## File Structure Overview

```text
wrangler.jsonc                              [CREATE] Cloudflare Worker, D1, R2, SPA assets config
.dev.vars.example                           [CREATE] Local Worker env template (CF Access & dev bypass)
AGENTS.md                                   [CREATE] Concise repo rules for AI coding agents
migrations/
├── 0001_init.sql                           [CREATE] 6 D1 tables (incl. packages) + indexes
└── 0002_seed_adi_eva.sql                   [CREATE] Seed default packages/addons & Adi & Eva as dynamic invitation #1
public/
└── _headers                                [CREATE] Cloudflare security headers + CSP
worker/
├── index.js                                [CREATE] Hono API (Public + Admin) + HTMLRewriter OG + SPA fallback
├── accessAuth.js                           [CREATE] Cloudflare Access JWT verifier (Web Crypto)
└── workerHelpers.test.js                   [CREATE] Unit tests for Worker helpers & order-to-invitation converter
src/
├── templates/
│   ├── registry.js                         [CREATE] Shared template registry (1 active: editorial-classic) + section schemas
│   └── editorial-classic/
│       ├── EditorialClassic.jsx            [CREATE] Section-driven wrapper + Opening/Music/Video/Lightbox shell
│       └── sections.jsx                    [CREATE] 12 modular sections driven by sections_json (visible + data)
├── services/
│   └── api.js                              [CREATE] Fetch client for /api/* (replaces firebase.js & orderService.js)
├── utils/
│   ├── imageCompress.js                    [CREATE] Native browser Canvas WebP compressor (max 1600px)
│   ├── orderHelpers.js                     [MODIFY] Align with D1 API & 1 active template; add orderToInvitationDraft()
│   └── orderHelpers.test.js                [MODIFY] Update & expand unit tests
├── config/
│   └── orderCatalog.js                     [MODIFY] Pull active themes from src/templates/registry.js (1 active theme)
├── components/
│   └── admin/
│       ├── InvitationEditor.jsx            [CREATE] Section manager (show/hide, reorder, add, edit) + OG + Live Preview
│       └── MediaPool.jsx                   [CREATE] Bulk WebP uploader to R2 + slot picker + music preset selector
├── pages/
│   ├── InvitationPage.jsx                  [CREATE] Dynamic /:slug invitation page + D1 guestbook
│   ├── AdminPage.jsx                       [CREATE] /admin dashboard (Orders, Invitations, Wishes moderation, Music presets)
│   ├── CustomName.jsx                      [MODIFY] Support dynamic /:slug/custom-name + share_template from D1
│   ├── OrderPage.jsx                       [MODIFY] Submit via src/services/api.js
│   ├── OrderStatusPage.jsx                 [MODIFY] Fetch via src/services/api.js
│   └── AdiEvaInvitation.jsx                [DELETE] Replaced by dynamic InvitationPage + editorial-classic template
├── App.jsx                                 [MODIFY] Register /admin, /:slug, /:slug/custom-name, keep legacy routes
├── lib/firebase.js                         [DELETE] Replaced by Cloudflare D1 backend
├── services/orderService.js                [DELETE] Consolidated into src/services/api.js
firestore.rules                             [DELETE] No longer using Firestore
.env.example                                [DELETE] Replaced by .dev.vars.example
```

---

## Milestone 1: Fondasi Cloudflare Workers + Hono + D1 & Migrasi `/order` (Hapus Firebase)

### Task 1: Cloudflare Workers Config, D1 Schema & Shared Template Registry

**Files:**
- Modify: `package.json` (install `hono`, dev-install `wrangler`, uninstall `firebase`; update scripts)
- Modify: `.gitignore` (ignore `.dev.vars`, `.wrangler/`)
- Create: `.dev.vars.example`
- Create: `wrangler.jsonc`
- Create: `migrations/0001_init.sql`
- Create: `src/templates/registry.js`
- Modify: `src/config/orderCatalog.js`

**Interfaces:**
- Produces (`src/templates/registry.js`): `TEMPLATES`, `ACTIVE_TEMPLATES`, `SECTION_TYPES`, `getTemplateById(id)`, `buildDefaultSectionsForOrder(orderPayload)`.
- Produces (`migrations/0001_init.sql`): Tables `packages`, `orders`, `invitations`, `media_assets`, `wishes`, `music_presets` and their indexes.

- [ ] **Step 1: Update dependencies and scripts**

Run:
```powershell
npm uninstall firebase; if ($?) { npm install hono; if ($?) { npm install -D wrangler } }
```

Update `package.json` scripts:
```json
"scripts": {
  "dev": "vite",
  "dev:worker": "wrangler dev",
  "build": "vite build",
  "deploy": "vite build && wrangler deploy",
  "db:migrate:local": "wrangler d1 migrations apply ansel_db --local",
  "db:migrate:remote": "wrangler d1 migrations apply ansel_db --remote",
  "test": "node --test src/utils/orderHelpers.test.js worker/workerHelpers.test.js",
  "preview": "vite preview"
}
```

- [ ] **Step 2: Update `.gitignore` and create `.dev.vars.example` & `wrangler.jsonc`**

Append to `.gitignore`:
```gitignore
.dev.vars
.wrangler/
```

Create `.dev.vars.example`:
```env
# Lokal dev saja — JANGAN set DEV_BYPASS_ACCESS di Cloudflare Dashboard produksi
DEV_BYPASS_ACCESS=true
DEV_ADMIN_EMAIL=admin@anselmoments.com

# Produksi (pasang di Cloudflare Workers -> Settings -> Variables and Secrets)
CF_ACCESS_TEAM_DOMAIN=https://<team-name>.cloudflareaccess.com
CF_ACCESS_AUD=<application-audience-tag>
R2_PUBLIC_BASE_URL=https://media.anselmoments.com
```

Create `wrangler.jsonc`:
```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "wedding-invitation-prodaction",
  "main": "./worker/index.js",
  "compatibility_date": "2026-11-22",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*"]
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "ansel_db",
      "database_id": "REPLACE_WITH_D1_DATABASE_ID",
      "migrations_dir": "migrations"
    }
  ],
  "r2_buckets": [
    {
      "binding": "MEDIA",
      "bucket_name": "ansel-media"
    }
  ],
  "vars": {
    "R2_PUBLIC_BASE_URL": "https://media.anselmoments.com"
  }
}
```

- [ ] **Step 3: Create D1 schema `migrations/0001_init.sql`**

```sql
-- 1. Paket & Add-On (harga dikelola dari Admin; price = 0 tampil sebagai Free)
CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,                  -- contoh: 'premium', 'standard', 'split_link'
  kind TEXT NOT NULL DEFAULT 'package', -- 'package' | 'addon'
  name TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,     -- dalam Rupiah (0 = Free)
  duration_months INTEGER DEFAULT 12,   -- NULL untuk addon
  is_recommended INTEGER NOT NULL DEFAULT 0,
  summary TEXT DEFAULT '',
  features_json TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Pesanan masuk dari /order (harga di-snapshot saat order dibuat)
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending_confirmation',
  -- pending_confirmation (jika total_price=0) | pending_payment (jika >0) | in_progress | preview_ready | published | cancelled
  template_id TEXT NOT NULL,
  package_id TEXT NOT NULL REFERENCES packages(id),
  package_name TEXT NOT NULL,
  base_price INTEGER NOT NULL DEFAULT 0,
  addons_total INTEGER NOT NULL DEFAULT 0,
  total_price INTEGER NOT NULL DEFAULT 0,
  event_type TEXT NOT NULL DEFAULT 'pernikahan',
  has_mepandes INTEGER NOT NULL DEFAULT 0,
  has_split_link INTEGER NOT NULL DEFAULT 0,
  allow_social_media INTEGER NOT NULL DEFAULT 0,
  requested_slug TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  photo_drive_url TEXT DEFAULT '',
  music_url TEXT DEFAULT '',
  video_url TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  form_payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Koleksi musik preset bersama
CREATE TABLE IF NOT EXISTS music_presets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT DEFAULT '',
  category TEXT DEFAULT 'romantis',
  r2_key TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Undangan dinamis aktif (1 order dapat membuat 1 atau 2 row jika Split Link)
CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  template_id TEXT NOT NULL DEFAULT 'editorial-classic',
  status TEXT NOT NULL DEFAULT 'draft',
  preview_token TEXT NOT NULL,
  title TEXT NOT NULL,
  event_datetime TEXT DEFAULT '',
  music_url TEXT DEFAULT '',
  music_preset_id TEXT REFERENCES music_presets(id) ON DELETE SET NULL,
  share_template TEXT DEFAULT '',
  og_title TEXT DEFAULT '',
  og_description TEXT DEFAULT '',
  og_image_url TEXT DEFAULT '',
  sections_json TEXT NOT NULL,
  published_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Media Pool R2 per order / undangan
CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  invitation_id TEXT REFERENCES invitations(id) ON DELETE SET NULL,
  r2_key TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Buku tamu & RSVP terpusat
CREATE TABLE IF NOT EXISTS wishes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invitation_id TEXT NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  message TEXT NOT NULL,
  attendance TEXT NOT NULL DEFAULT 'Hadir',
  is_hidden INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_packages_active ON packages(kind, is_active, sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invitations_order ON invitations(order_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status_slug ON invitations(slug, status);
CREATE INDEX IF NOT EXISTS idx_media_order ON media_assets(order_id);
CREATE INDEX IF NOT EXISTS idx_media_invitation ON media_assets(invitation_id);
CREATE INDEX IF NOT EXISTS idx_wishes_invitation ON wishes(invitation_id, is_hidden, created_at DESC);
```

- [ ] **Step 4: Create `src/templates/registry.js` (1 active template: `editorial-classic`) and wire `orderCatalog.js`**

Create `src/templates/registry.js` exporting:
- `TEMPLATES` array with **1 active template** (`id: 'editorial-classic'`, `name: 'Editorial Classic'`, `demoUrl: '/adi-eva'`, `previewImage: '/assets/img/GIK-1.png'`, `isActive: true`, `defaultSections: [...]`).
- `SECTION_DEFINITIONS` mapping each section `type` (`cover`, `quote`, `couple`, `mepandes`, `pawiwahan`, `events`, `love_story`, `gallery`, `guestbook`, `gift`, `custom_note`, `footer`) to its human label, whether it is optional/repeatable, and its declared photo slots (e.g. `cover` → `openingBg`, `leftPanelBg`, `slides[]`; `couple` → `groom.photoUrl`, `bride.photoUrl`; `pawiwahan` → `photoUrl`; `gallery` → `photos[]`; `footer` → `bgUrl`).
- `buildDefaultSectionsForOrder(orderPayload)` producing the ready-to-save `sections_json` array with `mepandes`, `love_story`, and `gift` automatically toggled `visible: true/false` from the customer's order choices!

Update `src/config/orderCatalog.js` so `ORDER_THEMES` re-exports `ACTIVE_TEMPLATES` from `../templates/registry.js` (single source of truth; only 1 active theme appears on `/order` Step 2 and auto-selects cleanly).

- [ ] **Step 5: Verify local D1 migration**

Run: `npm run db:migrate:local`
Expected: Migration `0001_init.sql` applies cleanly to local D1 SQLite database.

---

### Task 2: Worker Access Auth & Public Order API (`worker/accessAuth.js`, `worker/index.js`)

**Files:**
- Create: `worker/accessAuth.js`
- Create: `worker/index.js`
- Create: `worker/workerHelpers.test.js`

**Interfaces:**
- Produces (`worker/accessAuth.js`): `requireAdmin(c, next)` Hono middleware verifying Cloudflare Access JWT (`Cf-Access-Jwt-Assertion`) with Web Crypto RS256 JWKS cache + `DEV_BYPASS_ACCESS` local guard.
- Produces (`worker/index.js`): Public endpoints `GET /api/catalog` (returns active templates from `registry.js` + active `packages` and `addons` with live prices from D1), `POST /api/orders` (server-side validation + server-side price lookup & total calculation from D1 `packages`!), `GET /api/orders/:orderCode` (returns sanitized status response with price snapshot & masked WhatsApp `+62812••••7890`), and SPA fallback `env.ASSETS.fetch(request)`.

- [ ] **Step 1: Write failing tests in `worker/workerHelpers.test.js`**

Test:
- `maskWhatsapp('6281234567890') === '+62812••••7890'`
- `computeServerPricing(pkgRow, addonRows, { splitLink })` computes exact `basePrice`, `addonsTotal`, `totalPrice` from D1 rows (supports both `0` = Free and `> 0` = Paid) and chooses initial status (`pending_confirmation` if `totalPrice === 0`, `pending_payment` if `totalPrice > 0`).
- `buildDefaultSectionsForOrder(payload)` produces all sections with `mepandes` / `love_story` / `gift` matching order toggles and populated couple/event/gift data.
- `validateOrderSubmission(body)` rejects missing `customerName`, invalid `whatsapp`, inactive `packageId`, or inactive `templateId`.

- [ ] **Step 2: Run `npm test` and verify new tests fail**

- [ ] **Step 3: Implement `worker/accessAuth.js` and initial `worker/index.js`**

Key security checks inside `POST /api/orders`:
- Re-runs `validateStep(1..6, body)` on the server (never trusts client validation alone).
- Enforces `templateId` exists in `ACTIVE_TEMPLATES` and `packageId` exists in D1 `packages` (`kind='package' AND is_active=1`).
- Computes `base_price`, `addons_total`, `total_price` strictly from D1 `packages` rows on the server (ignoring any client-supplied price!).
- Sets initial `status = total_price > 0 ? 'pending_payment' : 'pending_confirmation'`.
- Generates `orderCode` server-side (`generateOrderCode()`) and inserts into D1 `orders` with price snapshot.
- `GET /api/orders/:orderCode` returns status, order summary (including snapshotted `pricing`), masked WhatsApp, and linked published invitation slug(s).

- [ ] **Step 4: Run `npm test` and verify all tests pass**

---

### Task 3: Migrate `/order` & `/order/:orderCode` to D1 API & Remove Firebase

**Files:**
- Create: `src/services/api.js`
- Modify: `src/pages/OrderPage.jsx`
- Modify: `src/pages/OrderStatusPage.jsx`
- Modify: `src/components/order/OrderShell.jsx`
- Modify: `src/utils/orderHelpers.js` & `src/utils/orderHelpers.test.js`
- Delete: `src/lib/firebase.js`, `src/services/orderService.js`, `firestore.rules`, `.env.example`

**Interfaces:**
- Produces (`src/services/api.js`): `getCatalog()`, `createOrder(form)`, `getOrderByCode(code)`, `getInvitation(slug, previewToken)`, `getWishes(slug)`, `postWish(slug, wish)`, plus Admin API functions added in Milestone 3.

- [ ] **Step 1:** Create `src/services/api.js` calling `/api/catalog`, `/api/orders`, and `/api/orders/:code` with clean error parsing.
- [ ] **Step 2:** Update `OrderPage.jsx`, `OrderSteps.jsx`, `OrderShell.jsx`, `OrderStatusPage.jsx`, and `orderHelpers.js`:
  - Load live `packages` and `addons` prices from `GET /api/catalog` on mount (graceful fallback to `orderCatalog.js` defaults while loading).
  - Dynamically render `formatRupiah(price)` (returns `'Free'` when `price === 0`, `'Rp299.000'` when `price > 0`) on Step 5 package cards, Split Link badge, live `OrderSummaryCard`, mobile sticky bar, Step 6 review, `/order/:orderCode`, and `buildAdminWhatsappUrl`!
  - Adapt status label & CTA copy automatically: `totalPrice === 0` → *Menunggu Konfirmasi* / *Konfirmasi Pesanan via WhatsApp*; `totalPrice > 0` → *Menunggu Pembayaran* / *Konfirmasi & Bayar via WhatsApp*.
  - Auto-select `editorial-classic` as default `themeId` in `createInitialOrderState()` since there is 1 active template.
- [ ] **Step 3:** Delete `src/lib/firebase.js`, `src/services/orderService.js`, `firestore.rules`, and `.env.example`.
- [ ] **Step 4:** Verify `npm test` and `npm run build` pass with zero references to `firebase` remaining (`Select-String -Path src\** -Pattern "firebase"` returns empty).

---

## Milestone 2: Template Modular `editorial-classic` + Migrasi `Adi & Eva` + Undangan Dinamis (`/:slug`)

### Task 4: Refactor `AdiEvaInvitation.jsx` into Section-Driven `editorial-classic` Template

**Files:**
- Create: `src/templates/editorial-classic/sections.jsx`
- Create: `src/templates/editorial-classic/EditorialClassic.jsx`
- Modify: `src/styles/invitation.css` (add clean minimal styles for optional `mepandes`, `love_story`, and `custom_note` sections matching the existing dark editorial typography)

**Interfaces:**
- Consumes: `invitation` object `{ slug, title, event_datetime, music_url, sections, wishes }`, `guestName`, `onSubmitWish`, `isPreview`.
- Produces: `EditorialClassic` React component rendering `sections.filter(s => s.visible)` in exact array order using the existing CSS classes from `invitation.css` so `/adi-eva` remains 100% visually faithful.

- [ ] **Step 1:** Create `src/templates/editorial-classic/sections.jsx` implementing all 12 section components:
  - `CoverSection` (carousel slides, subtitle, title, dateLabel, guestName)
  - `QuoteSection` (quoteText, quoteSource, greetingTitle, greetingBody)
  - `CoupleSection` (groom & bride cards with photoUrl, fullName, relation/parents, address, optional Instagram link)
  - `MepandesSection` (optional participants list rendered in matching editorial card aesthetic)
  - `PawiwahanSection` (title, names, featured photo frame, invitation copy)
  - `EventsSection` (1 or multiple event grids, live countdown timer to `event_datetime`, Google Maps button per event)
  - `LoveStorySection` (optional vertical milestone timeline)
  - `GallerySection` (optional YouTube video poster + fullscreen modal, GLightbox photo grid with `loading="lazy"`)
  - `GuestbookSection` (wishes list + 5-per-page pagination + POST form wired to `onSubmitWish`)
  - `GiftSection` (toggleable bank/e-wallet cards with copy-to-clipboard feedback)
  - `CustomNoteSection` (optional flexible heading + body + optional button/link for Dresscode / Live Streaming / Turut Mengundang)
  - `FooterSection` (background image, closing title/message, Ansel Moments branding links)
- [ ] **Step 2:** Create `src/templates/editorial-classic/EditorialClassic.jsx` owning the Opening Cover Screen overlay, audio `<audio>` toggle, Left Sticky Panel (desktop), Right Scrollable Panel looping `sections.filter(s => s.visible)`, GLightbox lifecycle, Video Modal, and optional subtle top preview banner when `isPreview === true`.
- [ ] **Step 3:** Add matching CSS classes in `src/styles/invitation.css` for `.section-mepandes`, `.section-love-story`, and `.section-custom-note` (scoped inside `.invitation-root`, zero conflict with Tailwind).

---

### Task 5: Public Invitation & Wishes API + Dynamic WhatsApp OG Tags + Seed `Adi & Eva`

**Files:**
- Modify: `worker/index.js`
- Create: `migrations/0002_seed_adi_eva.sql`

**Interfaces:**
- Produces API routes:
  - `GET /api/invitations/:slug` (supports `?preview=<token>` for `draft`/`preview` status; returns 404 if not published and token mismatches; returns `{ invitation, wishes }`)
  - `GET /api/invitations/:slug/wishes` (returns non-hidden wishes sorted newest first)
  - `POST /api/invitations/:slug/wishes` (validates `guest_name` 1–80 chars, `message` 1–500 chars, `attendance` whitelist; inserts into D1 `wishes`)
- Produces Edge OG Rewriter:
  - When a non-API path matches a single-segment slug (`/^\/([a-z0-9-]+)\/?$/` excluding reserved paths `order`, `admin`, `custom-name`, `assets`), `worker/index.js` fetches `og_title, og_description, og_image_url` from D1 and uses Cloudflare's native `HTMLRewriter` to rewrite `<title>` and inject `og:title`, `og:description`, `og:image`, and `twitter:card` on `index.html`!
  - Note: Update `wrangler.jsonc` `run_worker_first` to `["/api/*", "!/assets/*", "!/favicon.ico"]` OR keep `run_worker_first: ["/api/*"]` and let Cloudflare's SPA fallback hit Worker for HTML routes — exact check: with `assets.not_found_handling: "single-page-application"`, static files in `dist/assets/*` NEVER invoke the Worker when we configure `run_worker_first: ["/api/*", "!/assets/*"]` with non-file extension guard so **only HTML document navigations & `/api/*`** touch the Worker (preserving free-tier Worker quota for images/CSS/JS!).

- [ ] **Step 1:** Add `GET /api/invitations/:slug`, `GET/POST /api/invitations/:slug/wishes`, and `HTMLRewriter` OG meta injection to `worker/index.js`.
- [ ] **Step 2:** Create `migrations/0002_seed_adi_eva.sql` inserting:
  - Default `packages` rows: `premium` (`kind='package'`, initial `price=299000` or `0` — easily edited anytime in Admin!), `standard` (`kind='package'`, `price=199000`), and `split_link` (`kind='addon'`, `price=49000`).
  - Default `music_presets` row (`backsound-adi-eva` → `/assets/music/backsound-fix.mp3`, later updated to R2 URL in Task 10).
  - Seeded `invitations` row (`id: 'inv-adi-eva'`, `slug: 'adi-eva'`, `template_id: 'editorial-classic'`, `status: 'published'`, complete `sections_json` matching every exact text & image from the original `AdiEvaInvitation.jsx`, plus `share_template`, `og_title`, `og_description`, `og_image_url`).
- [ ] **Step 3:** Run `npm run db:migrate:local` and verify `adi-eva` is seeded cleanly in local D1.

---

### Task 6: Dynamic `InvitationPage.jsx`, Dynamic `CustomName.jsx`, & Route Wiring

**Files:**
- Create: `src/pages/InvitationPage.jsx`
- Modify: `src/pages/CustomName.jsx`
- Modify: `src/App.jsx`
- Delete: `src/pages/AdiEvaInvitation.jsx`

**Interfaces:**
- Consumes: `getInvitation`, `postWish` from `src/services/api.js`; `getTemplateComponent(templateId)` from `src/templates/registry.js`.
- Produces:
  - `/` → renders `InvitationPage` with `defaultSlug="adi-eva"`
  - `/:slug` → renders `InvitationPage` dynamically from D1 (friendly 404 page if slug not found or expired)
  - `/:slug/custom-name` & `/custom-name` (defaults to `adi-eva`) → fetches `title` & `share_template` from D1 so every client gets their own custom guest link generator (`https://anselmoments.com/{slug}/?to=...`)!

- [ ] **Step 1:** Create `src/pages/InvitationPage.jsx` (reads `:slug` or `defaultSlug` + `?to=` + `?preview=`, sets `document.title`, fetches invitation + wishes via `api.js`, dynamically renders the registered template component, handles loading/expired/not-found states).
- [ ] **Step 2:** Upgrade `src/pages/CustomName.jsx` to read `:slug` param (default `'adi-eva'`), load `share_template` from `/api/invitations/:slug` (replacing `{{guestName}}` and `{{link}}` placeholders, falling back to the standard Pawiwahan copy if empty), and set `document.title = 'Bagikan Undangan — Ansel Moments'`.
- [ ] **Step 3:** Update `src/App.jsx` routes cleanly:
  ```jsx
  <Route path="/" element={<InvitationPage defaultSlug="adi-eva" />} />
  <Route path="/order" element={<OrderPage />} />
  <Route path="/order/:orderCode" element={<OrderStatusPage />} />
  <Route path="/admin/*" element={<AdminPage />} />
  <Route path="/custom-name" element={<CustomName />} />
  <Route path="/:slug/custom-name" element={<CustomName />} />
  <Route path="/:slug" element={<InvitationPage />} />
  ```
- [ ] **Step 4:** Delete `src/pages/AdiEvaInvitation.jsx` and run `npm test` + `npm run build` to verify clean compilation.

---

## Milestone 3: Cloudflare R2 Media Studio & Admin Panel (`/admin`)

### Task 7: Admin Backend APIs (Orders, Invitations, R2 Upload/Delete, Wishes, Music Presets)

**Files:**
- Modify: `worker/index.js`

**Interfaces:**
- All `/api/admin/*` routes guarded by `requireAdmin` middleware (`worker/accessAuth.js`).
- Produces endpoints:
  - `GET /api/admin/me` (returns `{ email }` from verified Access JWT)
  - `GET /api/admin/orders` (list + filter by `status`), `PATCH /api/admin/orders/:id` (update status)
  - `POST /api/admin/orders/:id/convert` (creates 1 draft invitation — or 2 if `splitLink` requested — pre-populated via `buildDefaultSectionsForOrder()`, sets order status to `in_progress`, returns created invitation(s))
  - `GET /api/admin/invitations`, `POST /api/admin/invitations` (create standalone invitation without order), `GET /api/admin/invitations/:id`, `PATCH /api/admin/invitations/:id` (update `slug`, `status`, `title`, `event_datetime`, `music_url`, `og_*`, `share_template`, `sections_json`, `expires_at`), `DELETE /api/admin/invitations/:id` (also cleans up linked R2 objects!)
  - `GET /api/admin/media?orderId=...&invitationId=...`
  - `POST /api/admin/media/upload` (accepts `multipart/form-data`, validates MIME whitelist `image/webp|image/jpeg|image/png|audio/mpeg`, max size 15 MB, generates clean key `invitations/{slug}/{uuid}.{ext}`, uploads to `env.MEDIA.put(...)` with `httpMetadata: { contentType, cacheControl: 'public, max-age=31536000, immutable' }`, inserts row in `media_assets`, returns asset record)
  - `DELETE /api/admin/media/:id` (deletes from `env.MEDIA.delete(r2_key)` + `media_assets` table)
  - `GET/PATCH/DELETE /api/admin/wishes/:id` (`is_hidden` / delete)
  - `GET/POST/PATCH/DELETE /api/admin/packages` (kelola paket & add-on termasuk ubah harga `0` = Free atau nominal Rp, durasi aktif, fitur, status aktif/nonaktif)
  - `GET/POST/DELETE /api/admin/music-presets`

- [ ] **Step 1:** Implement all `/api/admin/*` routes cleanly in `worker/index.js` with strict MIME/size/slug-uniqueness validation (returning `409 Conflict` if a slug is already taken).
- [ ] **Step 2:** Add unit tests in `worker/workerHelpers.test.js` covering MIME validation, R2 key sanitization, and slug uniqueness error handling.
- [ ] **Step 3:** Run `npm test` to verify green.

---

### Task 8: Client-Side WebP Compressor & R2 Media Pool Component

**Files:**
- Create: `src/utils/imageCompress.js`
- Create: `src/components/admin/MediaPool.jsx`

**Interfaces:**
- Produces (`src/utils/imageCompress.js`): `compressImageToWebp(file, { maxWidth = 1600, quality = 0.82 })` returning `{ blob, width, height, filename }` using native `createImageBitmap` + `<canvas>.toBlob('image/webp', quality)`.
- Produces (`src/components/admin/MediaPool.jsx`): Bulk drag-and-drop photo uploader (shows compression savings e.g. `4.2 MB → 148 KB`), selectable thumbnail grid for assigning photos to any template slot, delete asset button (removes from R2), and audio preset selector / custom MP3 uploader.

- [ ] **Step 1:** Implement `src/utils/imageCompress.js` with fallback to original file if browser lacks WebP canvas export or file is already tiny (`< 100 KB`).
- [ ] **Step 2:** Implement `src/components/admin/MediaPool.jsx` matching Lovree's warm minimalist UI (`bg-white`, `border-codGray-100`, `goldSand-800` selection ring).

---

### Task 9: Admin Dashboard & Section-Based Invitation Editor (`/admin`)

**Files:**
- Create: `src/components/admin/InvitationEditor.jsx`
- Create: `src/pages/AdminPage.jsx`
- Modify: `src/services/api.js` (add Admin API wrappers)

**Interfaces:**
- Consumes: `Admin API` wrappers from `src/services/api.js`, `SECTION_DEFINITIONS` & `ACTIVE_TEMPLATES` from `src/templates/registry.js`, `MediaPool` from `src/components/admin/MediaPool.jsx`, and `EditorialClassic` for live side-by-side / modal mobile preview.
- Produces: Complete `/admin` studio with 5 clean tabs:
  1. **Pesanan Masuk (`Orders`)**: Status filter, copy WhatsApp/Drive link, lihat nominal snapshot tagihan (`Free` / `Rp...`), change status dropdown, **1-klik "Buat Draft Undangan"** (automatically creates 2 drafts if `has_split_link === 1`).
  2. **Undangan (`Invitations`)**: List all invitations with status badges (`Draft`, `Preview`, `Published`, `Archived`), quick copy links (`/:slug`, `/:slug?preview=TOKEN`, `/:slug/custom-name`), and open **Invitation Editor**:
     - **Pengaturan Umum & OG WhatsApp**: Slug, Judul, Tanggal Countdown, Status, Masa Aktif, Musik (Preset / Upload MP3), Template Pesan Custom Name, OG Title/Desc/Image.
     - **Section Manager**: List all sections with **Toggle Show/Hide (👁️)**, **Geser Naik/Turun (↑/↓)**, **"+ Tambah Section"** (untuk `mepandes`, `love_story`, `custom_note`, dll.), hapus section opsional, edit teks tiap section, dan **klik-pilih foto dari Media Pool** untuk setiap slot foto section tersebut!
     - **Live Preview**: Toggle Desktop / Mobile preview langsung me-render `EditorialClassic` secara real-time sebelum klik **Simpan** atau **Publish**!
  3. **Paket & Harga (`Packages & Add-Ons`)**: Tambah/edit/nonaktifkan paket (`Premium`, `Standard`, dll.) dan add-on (`Split Link`) — ubah harga langsung (`0` otomatis tampil `Free`, `> 0` otomatis tampil `Rp...` di `/order` & pesan WA).
  4. **Buku Tamu (`Wishes`)**: Filter per undangan, tombol sembunyikan (`Hide`/`Show`) atau hapus spam.
  5. **Musik Preset (`Music Presets`)**: Upload & kelola koleksi lagu MP3 bersama di R2.

- [ ] **Step 1:** Add admin API helpers to `src/services/api.js`.
- [ ] **Step 2:** Build `src/components/admin/InvitationEditor.jsx` (General/OG panel, Section Manager with toggle/reorder/add/slot-picker, and Live Preview drawer/pane).
- [ ] **Step 3:** Build `src/pages/AdminPage.jsx` (clean Lovree-styled admin shell with Cloudflare Access email indicator, Orders tab, Invitations tab, Wishes moderation tab, Music Presets tab).
- [ ] **Step 4:** Verify `npm run build` succeeds with `/admin` lazy-loaded (`React.lazy`) so wedding guests never download Admin Panel code!

---

## Milestone 4: Migrasi Aset `Adi & Eva` ke R2, Cleanup, Security Headers & Verifikasi

### Task 10: Brand `<title>`, Security Headers, Asset Cleanup, `AGENTS.md`, & Verification

**Files:**
- Modify: `index.html` (set `<title>Ansel Moments — Undangan Digital Bali</title>`, add `<meta name="description">`, remove redundant unpinned jsDelivr `glightbox` CDN `<link>`)
- Create: `public/_headers` (Cloudflare security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, CSP allowing self, Google Fonts, `media.anselmoments.com`, YouTube embed)
- Create: `AGENTS.md` (concise project instructions & guardrails for future AI sessions)
- Delete: 6 unused files in `public/` (`backsound.mp3`, `Pepotrek-1.jpg`, `Pepotrek-2.jpg`, `Pepotrek-13.jpg`, `Pepotrek-31.jpg`, `logo-ansel.svg`) once confirmed unused; optionally migrate Adi & Eva's 32 active assets to R2 and update `migrations/0002_seed_adi_eva.sql` URLs to `https://media.anselmoments.com/invitations/adi-eva/...`

- [ ] **Step 1:** Update `index.html` (`<title>` + `<meta name="description">` + remove redundant GLightbox CDN `<link>`) and create `public/_headers` & `AGENTS.md`.
- [ ] **Step 2:** Remove the 6 unused files (6.29 MB) from `public/` and remove the external `../wedding-invitation-test/assets` auto-copy block in `vite.config.js` (so builds never overwrite `public/assets` unexpectedly).
- [ ] **Step 3:** Run full verification suite:
  - `npm test` (all pure helper & Worker tests PASS)
  - `npm run build` (clean code-split bundle: invitation core vs `/order` vs `/admin`)
  - `npm run db:migrate:local` + `npx wrangler dev` smoke test:
    - `GET /adi-eva` renders Adi & Eva identically from D1 `sections_json`
    - `GET /adi-eva/custom-name` generates personalized WhatsApp copy
    - `POST /api/orders` → `/order/:code` works end-to-end against D1
    - `GET /admin` loads Orders, converts to Draft, toggles sections `true`/`false`, uploads compressed WebP to local R2, previews, and publishes a new dynamic `/:slug`!
- [ ] **Step 4:** Document Cloudflare production launch checklist (create D1 `ansel_db`, create R2 `ansel-media` + custom domain `media.anselmoments.com`, run `npm run db:migrate:remote`, set Cloudflare Access policy on `/admin*` & `/api/admin*`, set `CF_ACCESS_TEAM_DOMAIN` & `CF_ACCESS_AUD` in Workers Variables & Secrets).
