-- 1. Paket & Add-On (harga dikelola dari Admin; price = 0 tampil sebagai Free)
CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'package',
  name TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  duration_months INTEGER DEFAULT 12,
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
