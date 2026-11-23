# Media Pool Photo Picker Modal Design

- **Date:** 2026-11-23
- **Status:** Approved (Approach A — Reuse `MediaPool` with `pickerOnly` inside native modal)

## Goal
Allow admins editing any invitation section (Cover, Couple, Pawiwahan, Gallery, Footer, or OG WhatsApp thumbnail) to pick photos via an instant centered modal pop-up instead of scrolling to the side Media Pool panel.

## Implementation Summary
- `src/components/admin/MediaPool.jsx`: Adds `pickerOnly` prop to hide the Music section, compact the upload dropzone, widen the grid (`md:grid-cols-5`) inside the modal, and cap right-panel grid height (`max-h-72 overflow-y-auto`) when embedded in the sidebar.
- `src/components/admin/InvitationEditor.jsx`:
  - Renders an accessible modal (`role="dialog"`, backdrop click, `Escape` key, body scroll lock) whenever `activeSlot` is active, reusing `<MediaPool pickerOnly />`.
  - Auto-closes on single-photo selection (`!activeSlot.multiple` and `og_image_url`), while keeping open with live selected count for multi-photo slots (`slides`, `photos`).
