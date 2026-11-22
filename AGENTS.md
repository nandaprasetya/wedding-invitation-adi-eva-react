# Ansel Moments — Repo Rules for AI Coding Agents

## Stack & Architecture
- **Frontend:** React 18, Vite 6, Tailwind CSS v4, React Router v6, Lucide React (`src/`).
- **Backend / Edge:** Cloudflare Workers + Hono (`worker/index.js`), Cloudflare D1 (`migrations/`), Cloudflare R2 (`media.anselmoments.com`), Multi-Admin D1 Auth (`worker/accessAuth.js` — PBKDF2-SHA256 + HMAC-SHA256 `HttpOnly` session cookie).
- **Tests:** Node 22 built-in `node --test` (`npm test` runs `src/utils/orderHelpers.test.js` and `worker/workerHelpers.test.js`).

## Critical Guardrails
1. **Single Template Registry:** `src/templates/registry.js` is the single source of truth for template renderers and section definitions. Keep it pure JS (no JSX/DOM) so both Vite and `worker/index.js` can import it.
2. **Dynamic Pricing Security:** All package & add-on prices come from the D1 `packages` table (`0` renders as `Free`, `> 0` renders as `Rp...`). Never trust client-supplied prices; always compute & snapshot totals server-side in `POST /api/orders`.
3. **Admin Auth:** All `/api/admin/*` routes must stay behind `requireAdmin` (HMAC-SHA256 `HttpOnly` session cookie verified against D1 `admin_users` `is_active` and `token_version`). Public login/setup/logout live strictly under `/api/auth/admin/*`. Never set `DEV_BYPASS_ACCESS` in production, and always set a strong `ADMIN_SESSION_SECRET`.
4. **URL Preservation:** Never break `/`, `/adi-eva`, `/custom-name`, `/:slug`, `/:slug/custom-name`, `/order`, or `/order/:orderCode`.
5. **No Firebase:** Firebase has been completely removed; keep all data in D1 and media in R2.
6. **UI Craft:** Maintain the Lovree warm editorial palette (`Ibarra Real Nova`, `DM Sans`, `goldSand-*`, `codGray-*`, flat borders) on `/order`, `/order/:orderCode`, and `/admin`. Keep `AdminPage` lazy-loaded so guest invitation bundles stay minimal.
