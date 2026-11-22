# Theme Catalog Dashboard & CRUD Design

- **Date:** 2026-11-22
- **Status:** Approved (Approach A — D1 `templates` metadata table + `renderer_key` mapped to `src/templates/registry.js`)

## Goal
Provide an admin dashboard tab (`Tema Undangan`) in `/admin` with full CRUD for invitation themes stored in Cloudflare D1, while keeping React template rendering deterministically mapped via `renderer_key` to `src/templates/registry.js` and `src/templates/components.js`.

## Architecture
1. **Database (`migrations/0003_templates.sql`)**:
   - Table `templates` (`id`, `renderer_key`, `name`, `tag`, `description`, `demo_url`, `preview_image`, `is_active`, `sort_order`, `created_at`, `updated_at`), indexed on `(is_active, sort_order ASC)`.
   - Seeded with `editorial-classic` (`INSERT OR IGNORE`).
2. **Shared Pure-JS Registry (`src/templates/registry.js`)**:
   - Exports `TEMPLATE_RENDERERS` (`key`, `label`, `folder`) and `getTemplateRendererByKey(key)`.
   - Remains pure JS (no JSX/DOM) so both Vite and `worker/index.js` import it directly.
   - `src/templates/components.js` maps each `renderer_key` to its React component.
3. **Worker API (`worker/index.js`, `worker/helpers.js`)**:
   - Public `GET /api/catalog`, `POST /api/orders`, `GET /api/orders/:orderCode` query D1 `templates`.
   - Public `GET /api/invitations/:slug` performs `LEFT JOIN templates` to return `renderer_key`.
   - Admin endpoints behind `requireAdmin`:
     - `GET /api/admin/templates` (lists themes with `ordersCount`, `invitationsCount`, and available `renderers`)
     - `POST /api/admin/templates` (validates slug ID, name, registered `rendererKey`, safe URLs)
     - `PATCH /api/admin/templates/:id` (partial metadata/status/sort/renderer updates)
     - `DELETE /api/admin/templates/:id` (returns `409` if referenced by any order or invitation)
   - `POST /api/admin/invitations` and `PATCH /api/admin/invitations/:id` validate `template_id` against D1 `templates`.
4. **Admin UI (`src/components/admin/ThemesManager.jsx`, `AdminPage.jsx`, `InvitationEditor.jsx`)**:
   - Dedicated `Tema Undangan` tab in `/admin` with summary metrics, create form, inline edit, quick active toggle, delete guard, renderer folder display, and direct R2 thumbnail upload reusing `POST /api/admin/media/upload`.
   - Theme selection integrated into standalone invitation creation and `InvitationEditor` general settings + live preview renderer resolution.
