# Sistem Pemesanan Undangan Digital Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 6-step dynamic-ready wedding invitation order wizard at `/order` and order confirmation/tracking page at `/order/:orderCode`, backed by Firebase Firestore (`orders/{orderCode}`) with WhatsApp payment handoff and a minimalist editorial UI inspired by `lovree.com`.

**Architecture:** Tailwind CSS v4 (`@tailwindcss/vite`) with Lovree `@theme` tokens (`Ibarra Real Nova`, `DM Sans`, `goldSand-*`, `codGray-*`) cleanly isolated from legacy `invitation.css` via `.invitation-root`; Firebase JS SDK (`firebase/firestore`) reading `VITE_FIREBASE_*` env vars; zero-dependency pure business logic tested via Node 22 built-in `node --test`; focused modular UI components (`OrderShell`, `OrderSteps`, `OrderPage`, `OrderStatusPage`).

**Tech Stack:** React 18, Vite 6, React Router v6, Tailwind CSS v4 (`@tailwindcss/vite`), Firebase JS SDK v11 (`firebase/firestore`), Lucide React, Node 22 built-in `node:test`.

## Global Constraints

- Design spec: `docs/superpowers/specs/2026-11-22-order-undangan-design.md`.
- Preserve existing routes `/`, `/adi-eva`, `/custom-name`, `/adi-eva/custom-name` with zero visual regression on `/adi-eva`.
- Add routes `/order` and `/order/:orderCode`.
- Zero file uploads; zero bank account/QRIS displayed on web; payment handled via WhatsApp Admin (`+6285700848786`).
- Guest order without login; 3-day `localStorage` draft auto-save (`ansel_order_draft_v1`).
- Anti-slop UI discipline: no gradients, no glows, no heavy resting shadows, no glassmorphism, no emojis in form labels, crisp flat surfaces (`#fdf8ef` ground, `#ffffff` cards, `#faefda` summary), tabular numbers for prices, real project imagery (`/assets/img/GIK-1.png`) for theme preview.
- Ponytail discipline: built-in `node --test` instead of Vitest; fewest focused files; no speculative abstractions.

---

### Task 1: Foundation — Tailwind CSS v4, Fonts, CSS Isolation, Firebase Env & Rules

**Files:**
- Modify: `.gitignore`
- Modify: `package.json` (via `npm install firebase tailwindcss @tailwindcss/vite` + `"test": "node --test src/utils/orderHelpers.test.js"`)
- Modify: `vite.config.js`
- Modify: `index.html`
- Create: `src/styles/app.css`
- Modify: `src/main.jsx`
- Modify: `src/styles/invitation.css:1-14`
- Modify: `src/pages/AdiEvaInvitation.jsx` (wrap root JSX with `<div className="invitation-root">`)
- Create: `.env.example`
- Create: `firestore.rules`

**Interfaces:**
- Produces: Tailwind v4 utility classes + custom `@theme` tokens (`goldSand-50..800`, `codGray-50..950`, `font-ibarra`, `font-dm`) active globally; `.invitation-root` CSS isolation for `AdiEvaInvitation`.

- [ ] **Step 1:** Install `firebase`, `tailwindcss`, `@tailwindcss/vite` and add `"test": "node --test src/utils/orderHelpers.test.js"` to `package.json`.
- [ ] **Step 2:** Update `.gitignore` to ignore `.env` while keeping `!.env.example`, create `.env.example` and `firestore.rules`.
- [ ] **Step 3:** Register `tailwindcss()` in `vite.config.js`, add Google Fonts `Ibarra Real Nova` & `DM Sans` in `index.html`, create `src/styles/app.css` and import it in `src/main.jsx`.
- [ ] **Step 4:** Isolate `src/styles/invitation.css` lines 1–13 under `.invitation-root` and wrap `src/pages/AdiEvaInvitation.jsx` in `<div className="invitation-root">`.
- [ ] **Step 5:** Run `npm run build` to confirm Tailwind v4 + legacy CSS build cleanly.

---

### Task 2: Catalog Config & Pure Business Logic (`orderCatalog.js` + `orderHelpers.js` + Tests)

**Files:**
- Create: `src/config/orderCatalog.js`
- Create: `src/utils/orderHelpers.js`
- Create: `src/utils/orderHelpers.test.js`

**Interfaces:**
- Produces (`orderCatalog.js`): `BRAND_CONFIG`, `EVENT_TYPES`, `ORDER_THEMES`, `ORDER_PACKAGES`, `ORDER_ADDONS`, `ORDER_STATUS_META`, `ORDER_STEPS`, `createInitialOrderState()`.
- Produces (`orderHelpers.js`): `generateOrderCode()`, `generateSlug(groomNick, brideNick)`, `sanitizeInstagram(val)`, `normalizeWhatsapp(raw)`, `formatRupiah(amount)`, `formatDateIndo(dateTimeLocal)`, `calculateOrderPricing(packageId, addons)`, `validateStep(step, form)`, `buildOrderPayload(form, orderCode)`, `buildAdminWhatsappUrl(order, origin)`.

- [ ] **Step 1:** Create `src/config/orderCatalog.js` with Ansel Moments brand config (`anselmoments.com`, WA `6285700848786`), themes (live demo `/adi-eva` using `/assets/img/GIK-1.png` plus configurable presets), packages, Split Link add-on (`+Rp49.000`), status metadata, and `createInitialOrderState()`.
- [ ] **Step 2:** Write failing tests in `src/utils/orderHelpers.test.js` using `node:test` and `node:assert/strict` covering order code format, slug generation, WA normalization, pricing calculation, step 1–6 validation (including conditional Mepandes / Love Story / Digital Gift / URL validation), payload sanitization, and WA message URL formatting.
- [ ] **Step 3:** Run `npm test` and verify tests fail before implementation.
- [ ] **Step 4:** Implement `src/utils/orderHelpers.js` cleanly.
- [ ] **Step 5:** Run `npm test` and verify all tests pass.

---

### Task 3: Firebase Firestore Client & Order Service

**Files:**
- Create: `src/lib/firebase.js`
- Create: `src/services/orderService.js`

**Interfaces:**
- Consumes: `buildOrderPayload`, `generateOrderCode` from `src/utils/orderHelpers.js`; `firebase/app`, `firebase/firestore`.
- Produces: `getDb()`, `isFirebaseConfigured()` from `src/lib/firebase.js`; `createOrder(formState)`, `getOrderByCode(orderCode)` from `src/services/orderService.js`.

- [ ] **Step 1:** Create `src/lib/firebase.js` with lazy initialization from `import.meta.env.VITE_FIREBASE_*` and a clear error when required env variables are missing.
- [ ] **Step 2:** Create `src/services/orderService.js` implementing `createOrder(formState)` (generates `ANSL-XXXXXX`, writes to `orders/{orderCode}` with `serverTimestamp()`, returns `{ orderCode, order }`) and `getOrderByCode(orderCode)` (normalizes code, fetches `doc(db, 'orders', normalized)`).
- [ ] **Step 3:** Verify imports and build with `npm run build`.

---

### Task 4: Minimalist Lovree UI Components (`OrderShell.jsx` & `OrderSteps.jsx`)

**Files:**
- Create: `src/components/order/OrderShell.jsx`
- Create: `src/components/order/OrderSteps.jsx`

**Interfaces:**
- Consumes: `BRAND_CONFIG`, `EVENT_TYPES`, `ORDER_THEMES`, `ORDER_PACKAGES`, `ORDER_ADDONS`, `ORDER_STEPS` from `src/config/orderCatalog.js`; `calculateOrderPricing`, `formatRupiah`, `formatDateIndo`, `generateSlug`, `sanitizeInstagram` from `src/utils/orderHelpers.js`; `lucide-react` icons.
- Produces: `OrderShell`, `OrderSummaryCard`, `StepProgress` from `OrderShell.jsx`; `Step1Preferences`, `Step2Theme`, `Step3Couple`, `Step4Events`, `Step5FeaturesMedia`, `Step6ReviewContact` from `OrderSteps.jsx`.

- [ ] **Step 1:** Build `src/components/order/OrderShell.jsx`:
  - Plain minimalist header on `bg-goldSand-50` with Ansel Moments logo + wordmark (`font-ibarra`) and "Cek Status Pesanan" button triggering a clean lookup dialog (`navigate('/order/' + code)`).
  - `StepProgress`: horizontal desktop stepper (clickable completed steps) + compact mobile progress bar (`Langkah X dari 6 · Label`).
  - `OrderSummaryCard`: sticky editorial summary card on `bg-goldSand-100` showing couple names, live `anselmoments.com/{slug}` preview, selected theme, package + add-on line items (`tabular-nums`), total estimate, and draft-saved status.
- [ ] **Step 2:** Build `src/components/order/OrderSteps.jsx`:
  - Clean reusable inline `Field`, `FieldError`, `SwitchRow` primitives (no emojis, crisp borders, visible focus rings, clear required indicators).
  - All 6 steps faithfully implementing every field, conditional section (Mepandes, Love Story, Amplop Digital), repeater add/remove controls, auto-date suggestion on Step 4, auto-slug preview with manual override on Step 6, and quick "Ubah" jump links in Step 6 summary.

---

### Task 5: Pages & Routing (`OrderPage.jsx`, `OrderStatusPage.jsx`, `App.jsx`)

**Files:**
- Create: `src/pages/OrderPage.jsx`
- Create: `src/pages/OrderStatusPage.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `OrderShell`, `StepProgress`, `OrderSummaryCard`, `Step1Preferences`..`Step6ReviewContact`, `createOrder`, `getOrderByCode`, `validateStep`, `buildAdminWhatsappUrl`, `ORDER_STATUS_META`.
- Produces: Routes `/order` and `/order/:orderCode` registered in `src/App.jsx`.

- [ ] **Step 1:** Create `src/pages/OrderPage.jsx` wiring the 6-step state, inline 3-day `localStorage` draft persistence (`ansel_order_draft_v1`) with restore banner & reset, per-step validation + scroll-to-top, desktop 2-column grid + mobile sticky bottom CTA bar, double-submit protection, friendly Firestore error alert (preserving draft on failure), and redirect to `/order/:orderCode` (passing `state: { order }` for instant render before Firestore refetch).
- [ ] **Step 2:** Create `src/pages/OrderStatusPage.jsx` fetching `orders/{orderCode}` from Firestore (with instant hydration from router `location.state?.order` if just submitted), rendering:
  - Order code + Copy Code & Copy Status Link buttons
  - 4-stage status timeline (`Menunggu Pembayaran` → `Sedang Dikerjakan` → `Siap Preview` → `Undangan Aktif`) + `Dibatalkan` handling
  - Prominent primary CTA **"Konfirmasi & Bayar via WhatsApp"** opening pre-filled admin WA URL (explicitly stating payment details are sent via WhatsApp Admin)
  - Full itemized order & couple/event summary
  - Friendly loading, error, and not-found states with lookup retry & link back to `/order`.
- [ ] **Step 3:** Register `/order` and `/order/:orderCode` in `src/App.jsx` while keeping `/`, `/adi-eva`, `/custom-name`, `/adi-eva/custom-name`, and `*` intact.

---

### Task 6: Verification (Tests, Lint, Production Build, & Live Render Check)

- [ ] **Step 1:** Run `npm test`, `npm run lint`, and `npm run build` — verify all exit 0 with zero warnings/errors.
- [ ] **Step 2:** Start Vite dev/preview check and verify routes `/order`, `/order/ANSL-TEST01`, `/adi-eva`, and `/custom-name` serve cleanly without runtime console errors.
- [ ] **Step 3:** Review `git status` and `git diff --stat`, and prepare concise summary + Firebase setup instructions (`.env` keys + `firestore.rules`).
