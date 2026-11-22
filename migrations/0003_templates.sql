-- 7. Katalog tema undangan dinamis (metadata + pemetaan renderer React)
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  renderer_key TEXT NOT NULL DEFAULT 'editorial-classic',
  name TEXT NOT NULL,
  tag TEXT DEFAULT '',
  description TEXT DEFAULT '',
  demo_url TEXT DEFAULT '',
  preview_image TEXT DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_templates_active ON templates(is_active, sort_order ASC);

INSERT OR IGNORE INTO templates (
  id, renderer_key, name, tag, description, demo_url, preview_image, is_active, sort_order
) VALUES (
  'editorial-classic',
  'editorial-classic',
  'Editorial Classic',
  'Populer',
  'Split-screen gelap elegan dengan tipografi serif klasik dan galeri penuh.',
  '/adi-eva',
  '/assets/img/GIK-1.png',
  1,
  1
);
