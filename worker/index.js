import { Hono } from 'hono';
import {
  ACTIVE_TEMPLATES,
  TEMPLATE_RENDERERS,
  buildDefaultSectionsForOrder,
} from '../src/templates/registry.js';
import {
  buildOrderPayload,
  extractYoutubeId,
  generateOrderCode,
  normalizeWhatsapp,
} from '../src/utils/orderHelpers.js';
import {
  LOGIN_LOCKOUT_MS,
  MAX_FAILED_LOGIN_ATTEMPTS,
  buildClearSessionCookie,
  buildSessionCookie,
  getAuthenticatedAdmin,
  hashPassword,
  isLocalRequestUrl,
  isValidAdminEmail,
  requireAdmin,
  resolveSessionSecret,
  signSessionToken,
  timingSafeEqualStrings,
  validateAdminPassword,
  verifyPassword,
} from './accessAuth.js';
import {
  buildMediaPublicUrl,
  computeServerPricing,
  isReservedSlug,
  isSqliteUniqueError,
  mapPackageRow,
  mapTemplateRow,
  maskWhatsapp,
  mimeToExtension,
  sanitizeR2KeySegment,
  validateOrderSubmission,
  validateSlugCandidate,
  validateTemplatePayload,
  validateUploadFile,
} from './helpers.js';

const ALLOWED_ATTENDANCE = new Set([
  'Hadir (accept with pleasure)',
  'Hadir',
  'Tidak Hadir',
  'Ragu-ragu',
]);

function escapeHtmlAttr(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseInvitationRow(row) {
  let sections = [];
  try {
    sections = JSON.parse(row.sections_json || '[]');
  } catch {
    sections = [];
  }
  return {
    id: row.id,
    slug: row.slug,
    template_id: row.template_id,
    renderer_key: row.template_renderer_key || row.renderer_key || row.template_id || 'editorial-classic',
    template_name: row.template_name || undefined,
    status: row.status,
    title: row.title,
    event_datetime: row.event_datetime || '',
    music_url: row.music_url || '',
    share_template: row.share_template || '',
    og_title: row.og_title || '',
    og_description: row.og_description || '',
    og_image_url: row.og_image_url || '',
    sections: Array.isArray(sections) ? sections : [],
    published_at: row.published_at || null,
    expires_at: row.expires_at || null,
  };
}

function isInvitationAccessible(row, previewToken) {
  if (!row) return { ok: false, status: 404, error: 'Undangan tidak ditemukan.' };
  const hasValidPreview =
    Boolean(previewToken) && Boolean(row.preview_token) && previewToken === row.preview_token;

  if (hasValidPreview) {
    return { ok: true, isPreview: row.status !== 'published' };
  }

  if (row.status !== 'published') {
    return { ok: false, status: 404, error: 'Undangan tidak ditemukan.' };
  }

  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, status: 410, expired: true, error: 'Masa aktif undangan ini telah berakhir.' };
  }

  return { ok: true, isPreview: false };
}

const app = new Hono();

// Health check
app.get('/api/health', (c) => c.json({ ok: true }));

// Public catalog: live active templates + live packages & addons from D1
app.get('/api/catalog', async (c) => {
  const [{ results: pkgResults }, { results: tplResults }] = await Promise.all([
    c.env.DB.prepare(
      'SELECT * FROM packages WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC'
    ).all(),
    c.env.DB.prepare(
      'SELECT * FROM templates WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC'
    ).all(),
  ]);

  const mapped = (pkgResults || []).map(mapPackageRow);
  const packages = mapped.filter((p) => p.kind === 'package');
  const addonsList = mapped.filter((p) => p.kind === 'addon');
  const splitLinkRow = addonsList.find((a) => a.id === 'split_link' || a.id === 'splitLink');

  const templates = (tplResults || []).map((row) => {
    const t = mapTemplateRow(row);
    return {
      id: t.id,
      rendererKey: t.rendererKey,
      name: t.name,
      tag: t.tag,
      description: t.description,
      demoUrl: t.demoUrl,
      previewImage: t.previewImage,
    };
  });

  return c.json({
    templates,
    packages,
    addons: {
      splitLink: splitLinkRow || null,
    },
  });
});

// Public order submission with server-side validation & D1 price calculation
app.post('/api/orders', async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Payload JSON tidak valid.' }, 400);
  }

  const [{ results: packageRows }, { results: templateRows }] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM packages').all(),
    c.env.DB.prepare('SELECT * FROM templates').all(),
  ]);
  const validation = validateOrderSubmission(body, packageRows || [], templateRows || []);
  if (!validation.ok) {
    const firstError = Object.values(validation.errors)[0] || 'Data pesanan tidak valid.';
    return c.json({ error: firstError, errors: validation.errors }, 400);
  }

  const { form, pkgRow, addonRows, cleanSlug } = validation;
  const splitAddonActive = addonRows.some(
    (row) => (row.id === 'split_link' || row.id === 'splitLink') && Number(row.is_active) === 1
  );
  const sanitizedAddons = {
    splitLink: Boolean(form.addons?.splitLink) && splitAddonActive,
  };
  const pricing = computeServerPricing(pkgRow, addonRows, sanitizedAddons);
  const orderCode = generateOrderCode();
  const id = crypto.randomUUID();
  const normalizedWa = normalizeWhatsapp(form.contact?.whatsapp) || '';

  const activeTemplates = (templateRows || [])
    .filter((row) => Number(row.is_active) === 1)
    .map(mapTemplateRow);

  const mappedCatalog = {
    themes: activeTemplates.length > 0 ? activeTemplates : ACTIVE_TEMPLATES,
    packages: [mapPackageRow(pkgRow)],
    addons: {
      splitLink: {
        price: pricing.addonsTotal,
      },
    },
  };

  const payload = buildOrderPayload(
    { ...form, addons: sanitizedAddons, requestedSlug: cleanSlug },
    orderCode,
    mappedCatalog
  );
  payload.status = pricing.initialStatus;
  payload.pricing = {
    currency: 'IDR',
    basePrice: pricing.basePrice,
    addonsTotal: pricing.addonsTotal,
    totalPrice: pricing.totalPrice,
  };

  await c.env.DB.prepare(
    `INSERT INTO orders (
      id, order_code, status, template_id, package_id, package_name,
      base_price, addons_total, total_price, event_type, has_mepandes,
      has_split_link, allow_social_media, requested_slug, customer_name,
      whatsapp, photo_drive_url, music_url, video_url, notes, form_payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      orderCode,
      pricing.initialStatus,
      payload.themeId,
      pkgRow.id,
      pkgRow.name,
      pricing.basePrice,
      pricing.addonsTotal,
      pricing.totalPrice,
      payload.eventType,
      payload.hasMepandes ? 1 : 0,
      payload.addons.splitLink ? 1 : 0,
      payload.allowSocialMedia ? 1 : 0,
      cleanSlug,
      payload.contact.customerName,
      normalizedWa,
      payload.invitationData.media.photoDriveUrl || '',
      payload.invitationData.media.musicUrl || '',
      payload.invitationData.media.videoUrl || '',
      payload.invitationData.notes || '',
      JSON.stringify(payload.invitationData)
    )
    .run();

  return c.json(
    {
      orderCode,
      order: {
        ...payload,
        contact: {
          customerName: payload.contact.customerName,
          whatsapp: maskWhatsapp(normalizedWa),
        },
        createdAt: new Date().toISOString(),
      },
    },
    201
  );
});

// Public order status lookup (sanitized)
app.get('/api/orders/:orderCode', async (c) => {
  const code = String(c.req.param('orderCode') || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  if (!code) {
    return c.json({ error: 'Kode pesanan tidak valid.' }, 400);
  }

  const row = await c.env.DB.prepare('SELECT * FROM orders WHERE order_code = ?').bind(code).first();
  if (!row) {
    return c.json({ error: 'Pesanan tidak ditemukan.' }, 404);
  }

  const { results: linkedInvitations } = await c.env.DB.prepare(
    'SELECT slug, status, title FROM invitations WHERE order_id = ? ORDER BY created_at ASC'
  )
    .bind(row.id)
    .all();

  let invitationData = {};
  try {
    invitationData = JSON.parse(row.form_payload_json || '{}');
  } catch {
    invitationData = {};
  }

  const templateRow = await c.env.DB.prepare('SELECT name FROM templates WHERE id = ?')
    .bind(row.template_id)
    .first();
  const fallbackTemplate = ACTIVE_TEMPLATES.find((t) => t.id === row.template_id);
  const publishedSlugs = (linkedInvitations || [])
    .filter((inv) => inv.status === 'published')
    .map((inv) => ({ slug: inv.slug, title: inv.title }));

  return c.json({
    orderCode: row.order_code,
    status: row.status,
    eventType: row.event_type,
    hasMepandes: Boolean(row.has_mepandes),
    allowSocialMedia: Boolean(row.allow_social_media),
    themeId: row.template_id,
    themeName: templateRow?.name || fallbackTemplate?.name || row.template_id,
    packageId: row.package_id,
    packageName: row.package_name,
    addons: { splitLink: Boolean(row.has_split_link) },
    pricing: {
      currency: 'IDR',
      basePrice: Number(row.base_price) || 0,
      addonsTotal: Number(row.addons_total) || 0,
      totalPrice: Number(row.total_price) || 0,
    },
    requestedSlug: row.requested_slug,
    publishedSlugs,
    contact: {
      customerName: row.customer_name,
      whatsapp: maskWhatsapp(row.whatsapp),
    },
    invitationData,
    createdAt: row.created_at,
  });
});

// Public invitation lookup
app.get('/api/invitations/:slug', async (c) => {
  const slug = String(c.req.param('slug') || '').trim().toLowerCase();
  const previewToken = c.req.query('preview') || '';
  const row = await c.env.DB.prepare(
    `SELECT i.*, t.renderer_key AS template_renderer_key, t.name AS template_name
     FROM invitations i
     LEFT JOIN templates t ON t.id = i.template_id
     WHERE i.slug = ?`
  )
    .bind(slug)
    .first();

  const access = isInvitationAccessible(row, previewToken);
  if (!access.ok) {
    return c.json({ error: access.error, expired: Boolean(access.expired) }, access.status);
  }

  const { results: wishes } = await c.env.DB.prepare(
    `SELECT id, guest_name, message, attendance, created_at
     FROM wishes
     WHERE invitation_id = ? AND is_hidden = 0
     ORDER BY created_at DESC, id DESC`
  )
    .bind(row.id)
    .all();

  return c.json({
    invitation: parseInvitationRow(row),
    wishes: wishes || [],
    isPreview: access.isPreview,
  });
});

// Public guestbook list
app.get('/api/invitations/:slug/wishes', async (c) => {
  const slug = String(c.req.param('slug') || '').trim().toLowerCase();
  const previewToken = c.req.query('preview') || '';
  const row = await c.env.DB.prepare(
    'SELECT id, status, preview_token, expires_at FROM invitations WHERE slug = ?'
  )
    .bind(slug)
    .first();

  const access = isInvitationAccessible(row, previewToken);
  if (!access.ok) {
    return c.json({ error: access.error }, access.status);
  }

  const { results: wishes } = await c.env.DB.prepare(
    `SELECT id, guest_name, message, attendance, created_at
     FROM wishes
     WHERE invitation_id = ? AND is_hidden = 0
     ORDER BY created_at DESC, id DESC`
  )
    .bind(row.id)
    .all();

  return c.json({ wishes: wishes || [] });
});

// Public guestbook wish submission
app.post('/api/invitations/:slug/wishes', async (c) => {
  const slug = String(c.req.param('slug') || '').trim().toLowerCase();
  const previewToken = c.req.query('preview') || '';
  const row = await c.env.DB.prepare(
    'SELECT id, status, preview_token, expires_at FROM invitations WHERE slug = ?'
  )
    .bind(slug)
    .first();

  const access = isInvitationAccessible(row, previewToken);
  if (!access.ok) {
    return c.json({ error: access.error }, access.status);
  }

  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Payload JSON tidak valid.' }, 400);
  }

  const guestName = String(body.guestName ?? body.guest_name ?? '').trim();
  const message = String(body.message ?? '').trim();
  const rawAttendance = String(body.attendance ?? 'Hadir (accept with pleasure)').trim();
  const attendance = ALLOWED_ATTENDANCE.has(rawAttendance)
    ? rawAttendance
    : 'Hadir (accept with pleasure)';

  if (guestName.length < 1 || guestName.length > 80) {
    return c.json({ error: 'Nama tamu wajib diisi (1–80 karakter).' }, 400);
  }
  if (message.length < 1 || message.length > 500) {
    return c.json({ error: 'Ucapan wajib diisi (1–500 karakter).' }, 400);
  }

  const result = await c.env.DB.prepare(
    'INSERT INTO wishes (invitation_id, guest_name, message, attendance) VALUES (?, ?, ?, ?) RETURNING id, guest_name, message, attendance, created_at'
  )
    .bind(row.id, guestName, message, attendance)
    .first();

  return c.json({ wish: result }, 201);
});

const ALLOWED_ORDER_STATUSES = new Set([
  'pending_confirmation',
  'pending_payment',
  'in_progress',
  'preview_ready',
  'published',
  'cancelled',
]);

const ALLOWED_INVITATION_STATUSES = new Set(['draft', 'preview', 'published', 'archived']);

const DEFAULT_SHARE_TEMPLATE = `               Kepada Yth.
*{{guestName}}*

*OM SWASTYASTU*,
Atas asung kerta wara nugraha Ida Sang Hyang Widhi Wasa, tanpa mengurangi rasa hormat, karena keterbatasan jarak dan waktu, kami bermaksud mengundang Bapak/Ibu/Saudara/i dalam Upacara Manusa Yadnya Pawiwahan (Pernikahan).

Undangan dapat dilihat dengan mengklik link dibawah ini :
{{link}}

Suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i dan teman-teman dapat hadir pada acara kami dan memberikan doa restu.🙏

Terima kasih.
OM SHANTI, SHANTI, SHANTI OM`;

function generatePreviewToken() {
  return `prev-${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

async function resolveUniqueSlug(db, baseSlug) {
  let candidate = baseSlug;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const existing = await db.prepare('SELECT id FROM invitations WHERE slug = ?').bind(candidate).first();
    if (!existing) return candidate;
    const suffix = crypto.randomUUID().slice(0, 4);
    candidate = `${baseSlug}-${suffix}`;
  }
  return `${baseSlug}-${Date.now().toString(36).slice(-4)}`;
}

// Local R2 media proxy fallback (production serves directly from custom domain media.anselmoments.com)
app.get('/api/media/*', async (c) => {
  if (!c.env?.MEDIA) {
    return c.text('Media storage not configured', 404);
  }
  const key = c.req.path.replace(/^\/api\/media\//, '');
  if (!key) return c.text('Not Found', 404);
  const object = await c.env.MEDIA.get(key);
  if (!object) return c.text('Not Found', 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  if (!headers.has('cache-control')) {
    headers.set('cache-control', 'public, max-age=31536000, immutable');
  }
  return new Response(object.body, { headers });
});

// Public Multi-Admin Authentication routes (/api/auth/admin/*)
const ALLOWED_ADMIN_ROLES = new Set(['owner', 'admin']);

function mapAdminUserRow(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role || 'admin',
    isActive: Number(row.is_active) === 1,
    lastLoginAt: row.last_login_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

app.get('/api/auth/admin/status', async (c) => {
  const countRow = await c.env.DB.prepare('SELECT COUNT(*) AS total FROM admin_users').first();
  const totalAdmins = Number(countRow?.total) || 0;
  const secret = resolveSessionSecret(c.env, c.req.url);
  const isLocalBypass = isLocalRequestUrl(c.req.url) && c.env?.DEV_BYPASS_ACCESS === 'true';
  const hasExplicitSecret = String(c.env?.ADMIN_SESSION_SECRET || '').trim().length >= 16;
  const admin = totalAdmins > 0 ? await getAuthenticatedAdmin(c) : null;

  return c.json({
    needsSetup: totalAdmins === 0,
    configured: Boolean(secret),
    requireSetupKey: !isLocalBypass || hasExplicitSecret,
    authenticated: Boolean(admin),
    admin,
  });
});

app.post('/api/auth/admin/setup', async (c) => {
  const secret = resolveSessionSecret(c.env, c.req.url);
  if (!secret) {
    return c.json(
      { error: 'ADMIN_SESSION_SECRET belum dikonfigurasi di Cloudflare Workers.' },
      503
    );
  }

  const countRow = await c.env.DB.prepare('SELECT COUNT(*) AS total FROM admin_users').first();
  if ((Number(countRow?.total) || 0) > 0) {
    return c.json({ error: 'Akun admin awal sudah dibuat. Silakan login.' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const isLocalBypass = isLocalRequestUrl(c.req.url) && c.env?.DEV_BYPASS_ACCESS === 'true';
  const hasExplicitSecret = String(c.env?.ADMIN_SESSION_SECRET || '').trim().length >= 16;
  if (!isLocalBypass || hasExplicitSecret) {
    const setupKey = String(body.setupKey || '').trim();
    const keyValid = await timingSafeEqualStrings(setupKey, secret);
    if (!keyValid) {
      return c.json({ error: 'Secret key tidak cocok dengan ADMIN_SESSION_SECRET.' }, 403);
    }
  }

  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const pwCheck = validateAdminPassword(body.password);

  if (name.length < 2 || name.length > 80) {
    return c.json({ error: 'Nama admin wajib diisi (2–80 karakter).' }, 400);
  }
  if (!isValidAdminEmail(email)) {
    return c.json({ error: 'Format email admin tidak valid.' }, 400);
  }
  if (!pwCheck.ok) {
    return c.json({ error: pwCheck.error }, 400);
  }

  const passwordHash = await hashPassword(pwCheck.password);
  const id = crypto.randomUUID();

  try {
    const row = await c.env.DB.prepare(
      `INSERT INTO admin_users (id, email, name, role, password_hash, token_version, is_active, last_login_at)
       SELECT ?, ?, ?, 'owner', ?, 1, 1, CURRENT_TIMESTAMP
       WHERE (SELECT COUNT(*) FROM admin_users) = 0
       RETURNING id, email, name, role, token_version, is_active`
    )
      .bind(id, email, name, passwordHash)
      .first();

    if (!row) {
      return c.json({ error: 'Akun admin awal sudah dibuat. Silakan login.' }, 403);
    }

    const token = await signSessionToken(
      { sub: row.id, email: row.email, name: row.name, role: row.role, tv: row.token_version },
      secret
    );
    const isSecure = new URL(c.req.url).protocol === 'https:';
    c.header('Set-Cookie', buildSessionCookie(token, { isSecure }));

    return c.json(
      {
        admin: { id: row.id, email: row.email, name: row.name, role: row.role },
      },
      201
    );
  } catch (err) {
    if (isSqliteUniqueError(err)) {
      return c.json({ error: 'Email sudah terdaftar.' }, 409);
    }
    throw err;
  }
});

app.post('/api/auth/admin/login', async (c) => {
  const secret = resolveSessionSecret(c.env, c.req.url);
  if (!secret) {
    return c.json(
      { error: 'ADMIN_SESSION_SECRET belum dikonfigurasi di Cloudflare Workers.' },
      503
    );
  }

  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!email || !password) {
    return c.json({ error: 'Email dan password wajib diisi.' }, 400);
  }

  const user = await c.env.DB.prepare('SELECT * FROM admin_users WHERE email = ?')
    .bind(email)
    .first();

  if (user && user.locked_until) {
    const lockUntilMs = new Date(user.locked_until).getTime();
    if (!Number.isNaN(lockUntilMs) && lockUntilMs > Date.now()) {
      const waitMin = Math.max(1, Math.ceil((lockUntilMs - Date.now()) / 60_000));
      return c.json(
        { error: `Terlalu banyak percobaan login gagal. Coba lagi dalam ${waitMin} menit.` },
        429
      );
    }
  }

  if (!user || Number(user.is_active) !== 1) {
    return c.json({ error: 'Email atau password salah.' }, 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    const nextFailed = (Number(user.failed_attempts) || 0) + 1;
    const lockedUntil =
      nextFailed >= MAX_FAILED_LOGIN_ATTEMPTS
        ? new Date(Date.now() + LOGIN_LOCKOUT_MS).toISOString()
        : null;
    await c.env.DB.prepare(
      'UPDATE admin_users SET failed_attempts = ?, locked_until = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    )
      .bind(nextFailed, lockedUntil, user.id)
      .run();

    if (lockedUntil) {
      return c.json(
        { error: 'Terlalu banyak percobaan gagal. Akun dikunci sementara selama 15 menit.' },
        429
      );
    }
    return c.json({ error: 'Email atau password salah.' }, 401);
  }

  await c.env.DB.prepare(
    'UPDATE admin_users SET failed_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  )
    .bind(user.id)
    .run();

  const token = await signSessionToken(
    { sub: user.id, email: user.email, name: user.name, role: user.role, tv: user.token_version },
    secret
  );
  const isSecure = new URL(c.req.url).protocol === 'https:';
  c.header('Set-Cookie', buildSessionCookie(token, { isSecure }));

  return c.json({
    admin: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'admin',
    },
  });
});

app.post('/api/auth/admin/logout', (c) => {
  const isSecure = new URL(c.req.url).protocol === 'https:';
  c.header('Set-Cookie', buildClearSessionCookie({ isSecure }));
  return c.json({ ok: true });
});

// Admin routes (D1 multi-admin signed HttpOnly cookie protected)
app.use('/api/admin/*', requireAdmin);
app.get('/api/admin/me', (c) =>
  c.json({ email: c.get('adminEmail'), admin: c.get('adminUser') })
);

app.post('/api/admin/change-password', async (c) => {
  const currentAdmin = c.get('adminUser');
  const secret = resolveSessionSecret(c.env, c.req.url);
  if (!secret) {
    return c.json({ error: 'ADMIN_SESSION_SECRET belum dikonfigurasi.' }, 503);
  }

  const body = await c.req.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword || '');
  const pwCheck = validateAdminPassword(body.newPassword);
  if (!currentPassword) {
    return c.json({ error: 'Password lama wajib diisi.' }, 400);
  }
  if (!pwCheck.ok) {
    return c.json({ error: pwCheck.error }, 400);
  }

  const user = await c.env.DB.prepare('SELECT * FROM admin_users WHERE id = ?')
    .bind(currentAdmin.id)
    .first();
  if (!user) {
    return c.json({ error: 'Akun admin tidak ditemukan.' }, 404);
  }

  const valid = await verifyPassword(currentPassword, user.password_hash);
  if (!valid) {
    return c.json({ error: 'Password lama tidak sesuai.' }, 400);
  }

  const nextHash = await hashPassword(pwCheck.password);
  const updated = await c.env.DB.prepare(
    `UPDATE admin_users
     SET password_hash = ?, token_version = token_version + 1, failed_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?
     RETURNING id, email, name, role, token_version`
  )
    .bind(nextHash, user.id)
    .first();

  const token = await signSessionToken(
    {
      sub: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      tv: updated.token_version,
    },
    secret
  );
  const isSecure = new URL(c.req.url).protocol === 'https:';
  c.header('Set-Cookie', buildSessionCookie(token, { isSecure }));

  return c.json({ ok: true });
});

// Multi-admin user management
app.get('/api/admin/users', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id, email, name, role, is_active, last_login_at, created_at, updated_at
     FROM admin_users
     ORDER BY CASE WHEN role = 'owner' THEN 0 ELSE 1 END, created_at ASC`
  ).all();
  return c.json({ users: (results || []).map(mapAdminUserRow) });
});

app.post('/api/admin/users', async (c) => {
  const currentAdmin = c.get('adminUser');
  if (currentAdmin?.role !== 'owner') {
    return c.json({ error: 'Hanya Owner yang dapat menambahkan akun admin baru.' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const role = ALLOWED_ADMIN_ROLES.has(body.role) ? body.role : 'admin';
  const pwCheck = validateAdminPassword(body.password);

  if (name.length < 2 || name.length > 80) {
    return c.json({ error: 'Nama admin wajib diisi (2–80 karakter).' }, 400);
  }
  if (!isValidAdminEmail(email)) {
    return c.json({ error: 'Format email admin tidak valid.' }, 400);
  }
  if (!pwCheck.ok) {
    return c.json({ error: pwCheck.error }, 400);
  }

  const passwordHash = await hashPassword(pwCheck.password);
  const id = crypto.randomUUID();

  try {
    const row = await c.env.DB.prepare(
      `INSERT INTO admin_users (id, email, name, role, password_hash, token_version, is_active)
       VALUES (?, ?, ?, ?, ?, 1, 1)
       RETURNING id, email, name, role, is_active, last_login_at, created_at, updated_at`
    )
      .bind(id, email, name, role, passwordHash)
      .first();

    return c.json({ user: mapAdminUserRow(row) }, 201);
  } catch (err) {
    if (isSqliteUniqueError(err)) {
      return c.json({ error: `Email "${email}" sudah terdaftar.` }, 409);
    }
    throw err;
  }
});

app.patch('/api/admin/users/:id', async (c) => {
  const currentAdmin = c.get('adminUser');
  if (currentAdmin?.role !== 'owner') {
    return c.json({ error: 'Hanya Owner yang dapat mengubah akun admin lain.' }, 403);
  }

  const targetId = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM admin_users WHERE id = ?')
    .bind(targetId)
    .first();
  if (!existing) {
    return c.json({ error: 'Akun admin tidak ditemukan.' }, 404);
  }

  const body = await c.req.json().catch(() => ({}));
  const nextName =
    body.name !== undefined ? String(body.name || '').trim() : existing.name;
  if (nextName.length < 2 || nextName.length > 80) {
    return c.json({ error: 'Nama admin wajib diisi (2–80 karakter).' }, 400);
  }

  const nextRole =
    body.role !== undefined && ALLOWED_ADMIN_ROLES.has(body.role) ? body.role : existing.role;
  const nextActive =
    body.isActive !== undefined ? (body.isActive ? 1 : 0) : Number(existing.is_active);

  if (targetId === currentAdmin.id && nextActive === 0) {
    return c.json({ error: 'Anda tidak dapat menonaktifkan akun Anda sendiri.' }, 400);
  }

  const wasActiveOwner = existing.role === 'owner' && Number(existing.is_active) === 1;
  const staysActiveOwner = nextRole === 'owner' && nextActive === 1;
  if (wasActiveOwner && !staysActiveOwner) {
    const otherOwner = await c.env.DB.prepare(
      "SELECT id FROM admin_users WHERE role = 'owner' AND is_active = 1 AND id != ? LIMIT 1"
    )
      .bind(targetId)
      .first();
    if (!otherOwner) {
      return c.json(
        { error: 'Minimal harus tersisa satu akun Owner aktif di sistem.' },
        400
      );
    }
  }

  let nextHash = existing.password_hash;
  let bumpTokenVersion = nextActive === 0 && Number(existing.is_active) === 1;
  if (body.newPassword) {
    const pwCheck = validateAdminPassword(body.newPassword);
    if (!pwCheck.ok) {
      return c.json({ error: pwCheck.error }, 400);
    }
    nextHash = await hashPassword(pwCheck.password);
    bumpTokenVersion = true;
  }

  const nextTokenVersion = bumpTokenVersion
    ? (Number(existing.token_version) || 1) + 1
    : Number(existing.token_version) || 1;

  const updated = await c.env.DB.prepare(
    `UPDATE admin_users
     SET name = ?, role = ?, is_active = ?, password_hash = ?, token_version = ?,
         failed_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?
     RETURNING id, email, name, role, is_active, last_login_at, created_at, updated_at`
  )
    .bind(nextName, nextRole, nextActive, nextHash, nextTokenVersion, targetId)
    .first();

  return c.json({ user: mapAdminUserRow(updated) });
});

app.delete('/api/admin/users/:id', async (c) => {
  const currentAdmin = c.get('adminUser');
  if (currentAdmin?.role !== 'owner') {
    return c.json({ error: 'Hanya Owner yang dapat menghapus akun admin.' }, 403);
  }

  const targetId = c.req.param('id');
  if (targetId === currentAdmin.id) {
    return c.json({ error: 'Anda tidak dapat menghapus akun Anda sendiri.' }, 400);
  }

  const existing = await c.env.DB.prepare('SELECT id, role, is_active FROM admin_users WHERE id = ?')
    .bind(targetId)
    .first();
  if (!existing) {
    return c.json({ error: 'Akun admin tidak ditemukan.' }, 404);
  }

  if (existing.role === 'owner' && Number(existing.is_active) === 1) {
    const otherOwner = await c.env.DB.prepare(
      "SELECT id FROM admin_users WHERE role = 'owner' AND is_active = 1 AND id != ? LIMIT 1"
    )
      .bind(targetId)
      .first();
    if (!otherOwner) {
      return c.json({ error: 'Minimal harus tersisa satu akun Owner aktif.' }, 400);
    }
  }

  await c.env.DB.prepare('DELETE FROM admin_users WHERE id = ?').bind(targetId).run();
  return c.json({ ok: true });
});

// Admin Orders
app.get('/api/admin/orders', async (c) => {
  const statusFilter = String(c.req.query('status') || '').trim();
  const query = statusFilter
    ? c.env.DB.prepare('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC').bind(
        statusFilter
      )
    : c.env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC');

  const { results: orders } = await query.all();
  const { results: invRows } = await c.env.DB.prepare(
    'SELECT id, order_id, slug, status, preview_token, title FROM invitations WHERE order_id IS NOT NULL'
  ).all();

  const invByOrder = new Map();
  for (const inv of invRows || []) {
    const list = invByOrder.get(inv.order_id) || [];
    list.push(inv);
    invByOrder.set(inv.order_id, list);
  }

  const enriched = (orders || []).map((row) => {
    let invitationData = {};
    try {
      invitationData = JSON.parse(row.form_payload_json || '{}');
    } catch {
      invitationData = {};
    }
    return {
      ...row,
      invitationData,
      invitations: invByOrder.get(row.id) || [],
    };
  });

  return c.json({ orders: enriched });
});

app.patch('/api/admin/orders/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const status = String(body.status || '').trim();
  if (!ALLOWED_ORDER_STATUSES.has(status)) {
    return c.json({ error: 'Status pesanan tidak valid.' }, 400);
  }

  const updated = await c.env.DB.prepare(
    'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *'
  )
    .bind(status, id)
    .first();

  if (!updated) {
    return c.json({ error: 'Pesanan tidak ditemukan.' }, 404);
  }
  return c.json({ order: updated });
});

app.post('/api/admin/orders/:id/convert', async (c) => {
  const id = c.req.param('id');
  const order = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
  if (!order) {
    return c.json({ error: 'Pesanan tidak ditemukan.' }, 404);
  }

  const { results: existing } = await c.env.DB.prepare(
    'SELECT * FROM invitations WHERE order_id = ?'
  )
    .bind(id)
    .all();
  if (existing && existing.length > 0) {
    return c.json({ invitations: existing.map((r) => ({ ...parseInvitationRow(r), preview_token: r.preview_token })) });
  }

  let invitationData = {};
  try {
    invitationData = JSON.parse(order.form_payload_json || '{}');
  } catch {
    invitationData = {};
  }

  const pkgRow = await c.env.DB.prepare('SELECT duration_months FROM packages WHERE id = ?')
    .bind(order.package_id)
    .first();
  const durationMonths = Number(pkgRow?.duration_months) || 12;
  const expiresAt = new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString();

  const coupleTitle =
    [invitationData?.groom?.nickname?.trim(), invitationData?.bride?.nickname?.trim()]
      .filter(Boolean)
      .join(' & ') || order.customer_name;

  const baseSections = buildDefaultSectionsForOrder({
    hasMepandes: Boolean(order.has_mepandes),
    customerName: order.customer_name,
    invitationData,
  });

  const targetCount = Number(order.has_split_link) === 1 ? 2 : 1;
  const created = [];

  for (let i = 0; i < targetCount; i += 1) {
    const rawCandidate = i === 0 ? order.requested_slug : `${order.requested_slug}-keluarga`;
    const slugCheck = validateSlugCandidate(rawCandidate);
    const baseSlug = slugCheck.ok ? slugCheck.slug : `undangan-${order.order_code.toLowerCase()}`;
    const finalSlug = await resolveUniqueSlug(c.env.DB, baseSlug);
    const invId = crypto.randomUUID();
    const previewToken = generatePreviewToken();
    const title = targetCount === 2 && i === 1 ? `${coupleTitle} (Keluarga)` : coupleTitle;
    const isSupportedMusic =
      /\.(mp3|m4a|ogg|wav)(\?|$)/i.test(order.music_url || '') ||
      Boolean(extractYoutubeId(order.music_url));

    const row = await c.env.DB.prepare(
      `INSERT INTO invitations (
        id, order_id, slug, template_id, status, preview_token, title,
        event_datetime, music_url, share_template, og_title, og_description,
        sections_json, expires_at
      ) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
    )
      .bind(
        invId,
        order.id,
        finalSlug,
        order.template_id || 'editorial-classic',
        previewToken,
        title,
        invitationData?.primaryEventDateTime || '',
        isSupportedMusic ? order.music_url : '',
        DEFAULT_SHARE_TEMPLATE,
        `Undangan Pernikahan ${coupleTitle}`,
        `Merupakan kehormatan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir pada acara ${coupleTitle}.`,
        JSON.stringify(baseSections),
        expiresAt
      )
      .first();

    created.push({
      ...parseInvitationRow(row),
      preview_token: row.preview_token,
    });
  }

  await c.env.DB.prepare(
    "UPDATE orders SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  )
    .bind(order.id)
    .run();

  return c.json({ invitations: created }, 201);
});

// Admin Invitations
app.get('/api/admin/invitations', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT i.*,
      t.renderer_key AS template_renderer_key,
      t.name AS template_name,
      (SELECT COUNT(*) FROM wishes w WHERE w.invitation_id = i.id) AS wishes_count
     FROM invitations i
     LEFT JOIN templates t ON t.id = i.template_id
     ORDER BY i.updated_at DESC, i.created_at DESC`
  ).all();

  return c.json({
    invitations: (results || []).map((row) => ({
      ...parseInvitationRow(row),
      order_id: row.order_id,
      preview_token: row.preview_token,
      music_preset_id: row.music_preset_id || null,
      wishes_count: Number(row.wishes_count) || 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })),
  });
});

app.post('/api/admin/invitations', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const slugCheck = validateSlugCandidate(body.slug);
  if (!slugCheck.ok) {
    return c.json({ error: slugCheck.error }, 400);
  }

  const title = String(body.title || '').trim();
  if (!title) {
    return c.json({ error: 'Judul undangan wajib diisi.' }, 400);
  }

  let templateId = 'editorial-classic';
  if (body.template_id) {
    const requestedTpl = await c.env.DB.prepare('SELECT id FROM templates WHERE id = ?')
      .bind(String(body.template_id).trim())
      .first();
    if (!requestedTpl) {
      return c.json({ error: 'Tema undangan tidak ditemukan.' }, 400);
    }
    templateId = requestedTpl.id;
  } else {
    const firstActiveTpl = await c.env.DB.prepare(
      'SELECT id FROM templates WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC LIMIT 1'
    ).first();
    if (firstActiveTpl?.id) {
      templateId = firstActiveTpl.id;
    }
  }
  const sections = Array.isArray(body.sections)
    ? body.sections
    : buildDefaultSectionsForOrder({ customerName: title });
  const invId = crypto.randomUUID();
  const previewToken = generatePreviewToken();

  try {
    const row = await c.env.DB.prepare(
      `INSERT INTO invitations (
        id, slug, template_id, status, preview_token, title,
        event_datetime, music_url, share_template, og_title, og_description,
        og_image_url, sections_json, expires_at
      ) VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
    )
      .bind(
        invId,
        slugCheck.slug,
        templateId,
        previewToken,
        title,
        String(body.event_datetime || ''),
        String(body.music_url || ''),
        String(body.share_template || DEFAULT_SHARE_TEMPLATE),
        String(body.og_title || `Undangan ${title}`),
        String(body.og_description || ''),
        String(body.og_image_url || ''),
        JSON.stringify(sections),
        body.expires_at || null
      )
      .first();

    return c.json(
      { invitation: { ...parseInvitationRow(row), preview_token: row.preview_token } },
      201
    );
  } catch (err) {
    if (isSqliteUniqueError(err)) {
      return c.json({ error: `Slug "${slugCheck.slug}" sudah dipakai undangan lain.` }, 409);
    }
    throw err;
  }
});

app.get('/api/admin/invitations/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare(
    `SELECT i.*, t.renderer_key AS template_renderer_key, t.name AS template_name
     FROM invitations i
     LEFT JOIN templates t ON t.id = i.template_id
     WHERE i.id = ?`
  )
    .bind(id)
    .first();
  if (!row) {
    return c.json({ error: 'Undangan tidak ditemukan.' }, 404);
  }

  const { results: mediaAssets } = await c.env.DB.prepare(
    `SELECT * FROM media_assets
     WHERE invitation_id = ? OR (order_id IS NOT NULL AND order_id = ?)
     ORDER BY created_at DESC`
  )
    .bind(row.id, row.order_id || '')
    .all();

  const { results: wishes } = await c.env.DB.prepare(
    'SELECT * FROM wishes WHERE invitation_id = ? ORDER BY created_at DESC, id DESC'
  )
    .bind(row.id)
    .all();

  return c.json({
    invitation: {
      ...parseInvitationRow(row),
      order_id: row.order_id,
      preview_token: row.preview_token,
      music_preset_id: row.music_preset_id || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
    mediaAssets: mediaAssets || [],
    wishes: wishes || [],
  });
});

app.patch('/api/admin/invitations/:id', async (c) => {
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM invitations WHERE id = ?')
    .bind(id)
    .first();
  if (!existing) {
    return c.json({ error: 'Undangan tidak ditemukan.' }, 404);
  }

  const body = await c.req.json().catch(() => ({}));
  let nextSlug = existing.slug;
  if (body.slug !== undefined) {
    const slugCheck = validateSlugCandidate(body.slug);
    if (!slugCheck.ok) {
      return c.json({ error: slugCheck.error }, 400);
    }
    nextSlug = slugCheck.slug;
  }

  let nextTemplateId = existing.template_id;
  if (body.template_id !== undefined) {
    const candidateTplId = String(body.template_id || '').trim();
    const tplRow = await c.env.DB.prepare('SELECT id FROM templates WHERE id = ?')
      .bind(candidateTplId)
      .first();
    if (!tplRow) {
      return c.json({ error: 'Tema undangan tidak ditemukan.' }, 400);
    }
    nextTemplateId = tplRow.id;
  }

  const nextStatus =
    body.status !== undefined && ALLOWED_INVITATION_STATUSES.has(body.status)
      ? body.status
      : existing.status;

  const nextSectionsJson =
    body.sections !== undefined
      ? JSON.stringify(body.sections)
      : body.sections_json !== undefined
        ? typeof body.sections_json === 'string'
          ? body.sections_json
          : JSON.stringify(body.sections_json)
        : existing.sections_json;

  const publishedAt =
    nextStatus === 'published' && !existing.published_at
      ? new Date().toISOString()
      : existing.published_at;

  try {
    const updated = await c.env.DB.prepare(
      `UPDATE invitations SET
        slug = ?,
        template_id = ?,
        status = ?,
        title = ?,
        event_datetime = ?,
        music_url = ?,
        music_preset_id = ?,
        share_template = ?,
        og_title = ?,
        og_description = ?,
        og_image_url = ?,
        sections_json = ?,
        published_at = ?,
        expires_at = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? RETURNING *`
    )
      .bind(
        nextSlug,
        nextTemplateId,
        nextStatus,
        body.title !== undefined ? String(body.title) : existing.title,
        body.event_datetime !== undefined ? String(body.event_datetime) : existing.event_datetime,
        body.music_url !== undefined ? String(body.music_url) : existing.music_url,
        body.music_preset_id !== undefined
          ? body.music_preset_id || null
          : existing.music_preset_id,
        body.share_template !== undefined ? String(body.share_template) : existing.share_template,
        body.og_title !== undefined ? String(body.og_title) : existing.og_title,
        body.og_description !== undefined ? String(body.og_description) : existing.og_description,
        body.og_image_url !== undefined ? String(body.og_image_url) : existing.og_image_url,
        nextSectionsJson,
        publishedAt,
        body.expires_at !== undefined ? body.expires_at || null : existing.expires_at,
        id
      )
      .first();

    const tplMeta = await c.env.DB.prepare('SELECT renderer_key, name FROM templates WHERE id = ?')
      .bind(updated.template_id)
      .first();

    return c.json({
      invitation: {
        ...parseInvitationRow({
          ...updated,
          template_renderer_key: tplMeta?.renderer_key,
          template_name: tplMeta?.name,
        }),
        order_id: updated.order_id,
        preview_token: updated.preview_token,
        music_preset_id: updated.music_preset_id || null,
      },
    });
  } catch (err) {
    if (isSqliteUniqueError(err)) {
      return c.json({ error: `Slug "${nextSlug}" sudah dipakai undangan lain.` }, 409);
    }
    throw err;
  }
});

app.delete('/api/admin/invitations/:id', async (c) => {
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT id, order_id FROM invitations WHERE id = ?')
    .bind(id)
    .first();
  if (!existing) {
    return c.json({ error: 'Undangan tidak ditemukan.' }, 404);
  }

  let hasSiblingInSameOrder = false;
  if (existing.order_id) {
    const sibling = await c.env.DB.prepare(
      'SELECT id FROM invitations WHERE order_id = ? AND id != ? LIMIT 1'
    )
      .bind(existing.order_id, id)
      .first();
    hasSiblingInSameOrder = Boolean(sibling);
  }

  if (hasSiblingInSameOrder) {
    // Keep R2 objects that may still be referenced by sibling split-link invitation(s)
    await c.env.DB.prepare('UPDATE media_assets SET invitation_id = NULL WHERE invitation_id = ?')
      .bind(id)
      .run();
  } else {
    const { results: assets } = existing.order_id
      ? await c.env.DB.prepare(
          'SELECT id, r2_key FROM media_assets WHERE invitation_id = ? OR order_id = ?'
        )
          .bind(id, existing.order_id)
          .all()
      : await c.env.DB.prepare('SELECT id, r2_key FROM media_assets WHERE invitation_id = ?')
          .bind(id)
          .all();

    if (c.env?.MEDIA && assets?.length) {
      await Promise.allSettled(assets.map((a) => c.env.MEDIA.delete(a.r2_key)));
    }

    if (existing.order_id) {
      await c.env.DB.prepare('DELETE FROM media_assets WHERE invitation_id = ? OR order_id = ?')
        .bind(id, existing.order_id)
        .run();
    } else {
      await c.env.DB.prepare('DELETE FROM media_assets WHERE invitation_id = ?').bind(id).run();
    }
  }

  await c.env.DB.prepare('DELETE FROM invitations WHERE id = ?').bind(id).run();
  return c.json({ ok: true });
});

// Admin R2 Media Pool
app.get('/api/admin/media', async (c) => {
  const orderId = String(c.req.query('orderId') || '').trim();
  const invitationId = String(c.req.query('invitationId') || '').trim();

  let results = [];
  if (invitationId && orderId) {
    const res = await c.env.DB.prepare(
      'SELECT * FROM media_assets WHERE invitation_id = ? OR order_id = ? ORDER BY created_at DESC'
    )
      .bind(invitationId, orderId)
      .all();
    results = res.results || [];
  } else if (invitationId) {
    const res = await c.env.DB.prepare(
      'SELECT * FROM media_assets WHERE invitation_id = ? ORDER BY created_at DESC'
    )
      .bind(invitationId)
      .all();
    results = res.results || [];
  } else if (orderId) {
    const res = await c.env.DB.prepare(
      'SELECT * FROM media_assets WHERE order_id = ? ORDER BY created_at DESC'
    )
      .bind(orderId)
      .all();
    results = res.results || [];
  } else {
    const res = await c.env.DB.prepare(
      'SELECT * FROM media_assets ORDER BY created_at DESC LIMIT 200'
    ).all();
    results = res.results || [];
  }

  return c.json({ assets: results });
});

app.post('/api/admin/media/upload', async (c) => {
  const formData = await c.req.formData().catch(() => null);
  if (!formData) {
    return c.json({ error: 'FormData upload tidak valid.' }, 400);
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return c.json({ error: 'File wajib disertakan.' }, 400);
  }

  const validation = validateUploadFile(file);
  if (!validation.ok) {
    return c.json({ error: validation.error }, 400);
  }

  if (!c.env?.MEDIA) {
    return c.json({ error: 'R2 bucket binding MEDIA belum dikonfigurasi.' }, 500);
  }

  const slug = sanitizeR2KeySegment(formData.get('slug') || 'general');
  const orderId = String(formData.get('orderId') || '').trim() || null;
  const invitationId = String(formData.get('invitationId') || '').trim() || null;
  const width = formData.get('width') ? Number(formData.get('width')) : null;
  const height = formData.get('height') ? Number(formData.get('height')) : null;
  const assetType = validation.mime.startsWith('audio/') ? 'audio' : 'image';
  const ext = mimeToExtension(validation.mime);
  const r2Key = `invitations/${slug}/${crypto.randomUUID()}.${ext}`;
  const publicUrl = buildMediaPublicUrl({
    requestUrl: c.req.url,
    env: c.env,
    r2Key,
  });

  await c.env.MEDIA.put(r2Key, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: validation.mime,
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });

  const assetId = crypto.randomUUID();
  const asset = await c.env.DB.prepare(
    `INSERT INTO media_assets (
      id, order_id, invitation_id, r2_key, public_url, asset_type, mime_type, size_bytes, width, height
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
  )
    .bind(
      assetId,
      orderId,
      invitationId,
      r2Key,
      publicUrl,
      assetType,
      validation.mime,
      validation.size,
      Number.isFinite(width) ? width : null,
      Number.isFinite(height) ? height : null
    )
    .first();

  return c.json({ asset }, 201);
});

app.delete('/api/admin/media/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT * FROM media_assets WHERE id = ?').bind(id).first();
  if (!row) {
    return c.json({ error: 'Aset media tidak ditemukan.' }, 404);
  }

  if (c.env?.MEDIA) {
    await c.env.MEDIA.delete(row.r2_key);
  }
  await c.env.DB.prepare('DELETE FROM media_assets WHERE id = ?').bind(id).run();
  return c.json({ ok: true });
});

// Admin Wishes moderation
app.get('/api/admin/wishes', async (c) => {
  const invitationId = String(c.req.query('invitationId') || '').trim();
  const stmt = invitationId
    ? c.env.DB.prepare(
        `SELECT w.*, i.slug AS invitation_slug, i.title AS invitation_title
         FROM wishes w
         JOIN invitations i ON i.id = w.invitation_id
         WHERE w.invitation_id = ?
         ORDER BY w.created_at DESC, w.id DESC`
      ).bind(invitationId)
    : c.env.DB.prepare(
        `SELECT w.*, i.slug AS invitation_slug, i.title AS invitation_title
         FROM wishes w
         JOIN invitations i ON i.id = w.invitation_id
         ORDER BY w.created_at DESC, w.id DESC
         LIMIT 200`
      );

  const { results } = await stmt.all();
  return c.json({ wishes: results || [] });
});

app.patch('/api/admin/wishes/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json().catch(() => ({}));
  const isHidden = body.is_hidden ? 1 : 0;

  const updated = await c.env.DB.prepare(
    'UPDATE wishes SET is_hidden = ? WHERE id = ? RETURNING *'
  )
    .bind(isHidden, id)
    .first();

  if (!updated) {
    return c.json({ error: 'Ucapan tidak ditemukan.' }, 404);
  }
  return c.json({ wish: updated });
});

app.delete('/api/admin/wishes/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const result = await c.env.DB.prepare('DELETE FROM wishes WHERE id = ?').bind(id).run();
  if (!result.meta?.changes) {
    return c.json({ error: 'Ucapan tidak ditemukan.' }, 404);
  }
  return c.json({ ok: true });
});

// Admin Templates (Themes Catalog CRUD)
app.get('/api/admin/templates', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT t.*,
      (SELECT COUNT(*) FROM orders o WHERE o.template_id = t.id) AS orders_count,
      (SELECT COUNT(*) FROM invitations i WHERE i.template_id = t.id) AS invitations_count
     FROM templates t
     ORDER BY t.sort_order ASC, t.created_at ASC`
  ).all();

  return c.json({
    templates: (results || []).map(mapTemplateRow),
    renderers: TEMPLATE_RENDERERS,
  });
});

app.post('/api/admin/templates', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const check = validateTemplatePayload(body, { isUpdate: false });
  if (!check.ok) {
    return c.json({ error: check.error }, 400);
  }
  const { id, rendererKey, name, tag, description, demoUrl, previewImage, isActive, sortOrder } =
    check.data;

  try {
    const row = await c.env.DB.prepare(
      `INSERT INTO templates (
        id, renderer_key, name, tag, description, demo_url, preview_image, is_active, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
    )
      .bind(
        id,
        rendererKey,
        name,
        tag,
        description,
        demoUrl,
        previewImage,
        isActive ? 1 : 0,
        sortOrder
      )
      .first();

    return c.json(
      {
        template: mapTemplateRow({ ...row, orders_count: 0, invitations_count: 0 }),
      },
      201
    );
  } catch (err) {
    if (isSqliteUniqueError(err)) {
      return c.json({ error: `ID tema "${id}" sudah ada.` }, 409);
    }
    throw err;
  }
});

app.patch('/api/admin/templates/:id', async (c) => {
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM templates WHERE id = ?').bind(id).first();
  if (!existing) {
    return c.json({ error: 'Tema tidak ditemukan.' }, 404);
  }

  const body = await c.req.json().catch(() => ({}));
  const check = validateTemplatePayload(body, { isUpdate: true });
  if (!check.ok) {
    return c.json({ error: check.error }, 400);
  }
  const patch = check.data;

  const updated = await c.env.DB.prepare(
    `UPDATE templates SET
      renderer_key = ?,
      name = ?,
      tag = ?,
      description = ?,
      demo_url = ?,
      preview_image = ?,
      is_active = ?,
      sort_order = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? RETURNING *`
  )
    .bind(
      patch.rendererKey !== undefined ? patch.rendererKey : existing.renderer_key,
      patch.name !== undefined ? patch.name : existing.name,
      patch.tag !== undefined ? patch.tag : existing.tag,
      patch.description !== undefined ? patch.description : existing.description,
      patch.demoUrl !== undefined ? patch.demoUrl : existing.demo_url,
      patch.previewImage !== undefined ? patch.previewImage : existing.preview_image,
      patch.isActive !== undefined ? (patch.isActive ? 1 : 0) : existing.is_active,
      patch.sortOrder !== undefined ? patch.sortOrder : existing.sort_order,
      id
    )
    .first();

  const counts = await c.env.DB.prepare(
    `SELECT
      (SELECT COUNT(*) FROM orders o WHERE o.template_id = ?) AS orders_count,
      (SELECT COUNT(*) FROM invitations i WHERE i.template_id = ?) AS invitations_count`
  )
    .bind(id, id)
    .first();

  return c.json({
    template: mapTemplateRow({
      ...updated,
      orders_count: counts?.orders_count ?? 0,
      invitations_count: counts?.invitations_count ?? 0,
    }),
  });
});

app.delete('/api/admin/templates/:id', async (c) => {
  const id = c.req.param('id');
  const [usedByOrder, usedByInvitation] = await Promise.all([
    c.env.DB.prepare('SELECT id FROM orders WHERE template_id = ? LIMIT 1').bind(id).first(),
    c.env.DB.prepare('SELECT id FROM invitations WHERE template_id = ? LIMIT 1').bind(id).first(),
  ]);

  if (usedByOrder || usedByInvitation) {
    return c.json(
      {
        error:
          'Tema masih dipakai oleh pesanan atau undangan yang ada. Nonaktifkan saja daripada menghapus.',
      },
      409
    );
  }

  const result = await c.env.DB.prepare('DELETE FROM templates WHERE id = ?').bind(id).run();
  if (!result.meta?.changes) {
    return c.json({ error: 'Tema tidak ditemukan.' }, 404);
  }
  return c.json({ ok: true });
});

// Admin Packages & Add-Ons
app.get('/api/admin/packages', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM packages ORDER BY sort_order ASC, created_at ASC'
  ).all();
  return c.json({ packages: (results || []).map(mapPackageRow) });
});

app.post('/api/admin/packages', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const id = sanitizeR2KeySegment(body.id || body.name || crypto.randomUUID().slice(0, 8)).replace(
    /-/g,
    '_'
  );
  const name = String(body.name || '').trim();
  if (!name) {
    return c.json({ error: 'Nama paket wajib diisi.' }, 400);
  }
  const kind = body.kind === 'addon' ? 'addon' : 'package';
  const price = Math.max(0, Math.round(Number(body.price) || 0));
  const durationMonths =
    kind === 'addon' ? null : Math.max(1, Math.round(Number(body.durationMonths ?? 12)));
  const features = Array.isArray(body.features) ? body.features : [];

  try {
    const row = await c.env.DB.prepare(
      `INSERT INTO packages (
        id, kind, name, price, duration_months, is_recommended, summary, features_json, is_active, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
    )
      .bind(
        id,
        kind,
        name,
        price,
        durationMonths,
        body.recommended ? 1 : 0,
        String(body.summary || ''),
        JSON.stringify(features),
        body.isActive === false ? 0 : 1,
        Number(body.sortOrder) || 10
      )
      .first();

    return c.json({ package: mapPackageRow(row) }, 201);
  } catch (err) {
    if (isSqliteUniqueError(err)) {
      return c.json({ error: `ID paket "${id}" sudah ada.` }, 409);
    }
    throw err;
  }
});

app.patch('/api/admin/packages/:id', async (c) => {
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM packages WHERE id = ?').bind(id).first();
  if (!existing) {
    return c.json({ error: 'Paket tidak ditemukan.' }, 404);
  }

  const body = await c.req.json().catch(() => ({}));
  const nextPrice =
    body.price !== undefined ? Math.max(0, Math.round(Number(body.price) || 0)) : existing.price;
  const nextFeatures =
    body.features !== undefined ? JSON.stringify(body.features) : existing.features_json;

  const updated = await c.env.DB.prepare(
    `UPDATE packages SET
      name = ?,
      price = ?,
      duration_months = ?,
      is_recommended = ?,
      summary = ?,
      features_json = ?,
      is_active = ?,
      sort_order = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? RETURNING *`
  )
    .bind(
      body.name !== undefined ? String(body.name).trim() || existing.name : existing.name,
      nextPrice,
      body.durationMonths !== undefined
        ? body.durationMonths === null
          ? null
          : Math.max(1, Math.round(Number(body.durationMonths) || 12))
        : existing.duration_months,
      body.recommended !== undefined ? (body.recommended ? 1 : 0) : existing.is_recommended,
      body.summary !== undefined ? String(body.summary) : existing.summary,
      nextFeatures,
      body.isActive !== undefined ? (body.isActive ? 1 : 0) : existing.is_active,
      body.sortOrder !== undefined ? Number(body.sortOrder) || 0 : existing.sort_order,
      id
    )
    .first();

  return c.json({ package: mapPackageRow(updated) });
});

app.delete('/api/admin/packages/:id', async (c) => {
  const id = c.req.param('id');
  const used = await c.env.DB.prepare('SELECT id FROM orders WHERE package_id = ? LIMIT 1')
    .bind(id)
    .first();
  if (used) {
    return c.json(
      { error: 'Paket sudah dipakai oleh pesanan yang ada. Nonaktifkan saja daripada menghapus.' },
      409
    );
  }
  const result = await c.env.DB.prepare('DELETE FROM packages WHERE id = ?').bind(id).run();
  if (!result.meta?.changes) {
    return c.json({ error: 'Paket tidak ditemukan.' }, 404);
  }
  return c.json({ ok: true });
});

// Admin Music Presets
app.get('/api/admin/music-presets', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM music_presets ORDER BY created_at DESC'
  ).all();
  return c.json({ presets: results || [] });
});

app.post('/api/admin/music-presets', async (c) => {
  const formData = await c.req.formData().catch(() => null);
  if (!formData) {
    return c.json({ error: 'FormData tidak valid.' }, 400);
  }
  const title = String(formData.get('title') || '').trim();
  const artist = String(formData.get('artist') || '').trim();
  const category = String(formData.get('category') || 'romantis').trim();
  const file = formData.get('file');

  if (!title) {
    return c.json({ error: 'Judul lagu wajib diisi.' }, 400);
  }
  if (!file || typeof file === 'string') {
    return c.json({ error: 'File MP3 wajib diunggah.' }, 400);
  }
  const validation = validateUploadFile(file);
  if (!validation.ok || validation.mime !== 'audio/mpeg') {
    return c.json({ error: 'Gunakan file audio MP3 (maksimal 15 MB).' }, 400);
  }
  if (!c.env?.MEDIA) {
    return c.json({ error: 'R2 bucket binding MEDIA belum dikonfigurasi.' }, 500);
  }

  const presetId = crypto.randomUUID();
  const r2Key = `presets/${sanitizeR2KeySegment(title)}-${presetId.slice(0, 8)}.mp3`;
  const publicUrl = buildMediaPublicUrl({
    requestUrl: c.req.url,
    env: c.env,
    r2Key,
  });

  await c.env.MEDIA.put(r2Key, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: 'audio/mpeg',
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });

  const preset = await c.env.DB.prepare(
    `INSERT INTO music_presets (id, title, artist, category, r2_key, public_url, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 1) RETURNING *`
  )
    .bind(presetId, title, artist, category, r2Key, publicUrl)
    .first();

  return c.json({ preset }, 201);
});

app.delete('/api/admin/music-presets/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT * FROM music_presets WHERE id = ?').bind(id).first();
  if (!row) {
    return c.json({ error: 'Preset musik tidak ditemukan.' }, 404);
  }
  if (c.env?.MEDIA && row.r2_key && !row.public_url.startsWith('/assets/')) {
    await c.env.MEDIA.delete(row.r2_key);
  }
  await c.env.DB.prepare('DELETE FROM music_presets WHERE id = ?').bind(id).run();
  return c.json({ ok: true });
});

// Edge OG Meta injection + SPA Asset fallback
app.all('*', async (c) => {
  if (!c.env?.ASSETS) {
    return c.text('Not Found', 404);
  }

  const req = c.req.raw;
  const url = new URL(req.url);
  const path = url.pathname;

  // In local Wrangler dev, YouTube rejects embeds from bare IP origin 127.0.0.1 (Error 150).
  // Redirect browser HTML navigations to localhost while leaving /api/* and asset fetches untouched.
  if (
    req.method === 'GET' &&
    url.hostname === '127.0.0.1' &&
    c.env?.DEV_BYPASS_ACCESS === 'true' &&
    (req.headers.get('accept') || '').includes('text/html')
  ) {
    url.hostname = 'localhost';
    return Response.redirect(url.toString(), 302);
  }

  if (req.method === 'GET' && typeof HTMLRewriter !== 'undefined') {
    const slugMatch = path === '/' ? ['', 'adi-eva'] : path.match(/^\/([a-z0-9-]+)\/?$/);
    const candidateSlug = slugMatch?.[1] || '';

    if (candidateSlug && !isReservedSlug(candidateSlug)) {
      const inv = await c.env.DB.prepare(
        `SELECT slug, title, og_title, og_description, og_image_url
         FROM invitations
         WHERE slug = ? AND status = 'published'`
      )
        .bind(candidateSlug)
        .first();

      if (inv) {
        const assetRes = await c.env.ASSETS.fetch(new Request(new URL('/index.html', url.origin)));
        const ogTitle = inv.og_title || `Undangan ${inv.title}`;
        const ogDesc = inv.og_description || `Undangan Digital ${inv.title} — Ansel Moments`;
        const ogImage = inv.og_image_url
          ? inv.og_image_url.startsWith('http')
            ? inv.og_image_url
            : `${url.origin}${inv.og_image_url}`
          : '';

        return new HTMLRewriter()
          .on('title', {
            element(el) {
              el.setInnerContent(ogTitle);
            },
          })
          .on('head', {
            element(el) {
              el.append(
                `<meta property="og:type" content="website" />` +
                  `<meta property="og:title" content="${escapeHtmlAttr(ogTitle)}" />` +
                  `<meta property="og:description" content="${escapeHtmlAttr(ogDesc)}" />` +
                  (ogImage
                    ? `<meta property="og:image" content="${escapeHtmlAttr(ogImage)}" />`
                    : '') +
                  `<meta name="twitter:card" content="summary_large_image" />`,
                { html: true }
              );
            },
          })
          .transform(assetRes);
      }
    }
  }

  return c.env.ASSETS.fetch(req);
});

export default app;
