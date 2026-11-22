import {
  ACTIVE_TEMPLATES,
  TEMPLATE_RENDERERS,
  getTemplateRendererByKey,
} from '../src/templates/registry.js';
import {
  normalizeWhatsapp,
  slugifyText,
  validateStep,
} from '../src/utils/orderHelpers.js';

export const ALLOWED_UPLOAD_MIMES = new Set([
  'image/webp',
  'image/jpeg',
  'image/png',
  'audio/mpeg',
]);

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export const RESERVED_SLUGS = new Set([
  'api',
  'order',
  'admin',
  'custom-name',
  'assets',
  'favicon.ico',
  '404',
]);

export function isReservedSlug(slug) {
  return RESERVED_SLUGS.has(slugifyText(slug));
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateSlugCandidate(rawSlug) {
  const clean = slugifyText(rawSlug);
  if (!clean || clean.length < 2 || !SLUG_REGEX.test(clean)) {
    return { ok: false, error: 'Slug minimal 2 karakter (huruf kecil, angka, dan tanda hubung).' };
  }
  if (isReservedSlug(clean)) {
    return { ok: false, error: 'Slug menggunakan kata yang dicadangkan sistem.' };
  }
  return { ok: true, slug: clean };
}

export function isSqliteUniqueError(err) {
  const msg = String(err?.message || '').toLowerCase();
  return msg.includes('unique') || msg.includes('constraint');
}

export function mimeToExtension(mime) {
  switch (String(mime || '').toLowerCase()) {
    case 'image/webp':
      return 'webp';
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'audio/mpeg':
      return 'mp3';
    default:
      return 'bin';
  }
}

export function buildMediaPublicUrl({ requestUrl, env, r2Key }) {
  const url = new URL(requestUrl);
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (isLocal && env?.DEV_BYPASS_ACCESS === 'true') {
    return `/api/media/${r2Key}`;
  }
  const base = String(env?.R2_PUBLIC_BASE_URL || 'https://media.anselmoments.com').replace(
    /\/+$/,
    ''
  );
  return `${base}/${r2Key}`;
}

export function sanitizeR2KeySegment(input) {
  return slugifyText(input) || 'item';
}

export function validateUploadFile(file) {
  const mime = String(file?.type || '').toLowerCase();
  const size = Number(file?.size) || 0;
  if (!ALLOWED_UPLOAD_MIMES.has(mime)) {
    return {
      ok: false,
      error: 'Format file tidak didukung. Gunakan WebP, JPEG, PNG, atau MP3.',
    };
  }
  if (size <= 0 || size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: 'Ukuran file maksimal 15 MB.',
    };
  }
  return { ok: true, mime, size };
}

export function maskWhatsapp(raw) {
  const normalized = normalizeWhatsapp(raw) || String(raw || '').replace(/\D/g, '');
  if (!normalized) return '-';
  if (normalized.length < 9) {
    return `+${normalized.slice(0, 3)}••••${normalized.slice(-2)}`;
  }
  return `+${normalized.slice(0, 5)}••••${normalized.slice(-4)}`;
}

export function computeServerPricing(pkgRow, addonRows = [], addons = {}) {
  const basePrice = Math.max(0, Number(pkgRow?.price) || 0);
  let addonsTotal = 0;
  if (addons?.splitLink) {
    const splitRow = (addonRows || []).find(
      (row) => (row.id === 'split_link' || row.id === 'splitLink') && Number(row.is_active) === 1
    );
    addonsTotal += Math.max(0, Number(splitRow?.price) || 0);
  }
  const totalPrice = basePrice + addonsTotal;
  return {
    currency: 'IDR',
    basePrice,
    addonsTotal,
    totalPrice,
    initialStatus: totalPrice > 0 ? 'pending_payment' : 'pending_confirmation',
  };
}

export function mapPackageRow(row) {
  let features = [];
  try {
    features = JSON.parse(row.features_json || '[]');
  } catch {
    features = [];
  }
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    price: Number(row.price) || 0,
    durationMonths: row.duration_months != null ? Number(row.duration_months) : null,
    recommended: Boolean(row.is_recommended),
    summary: row.summary || '',
    features: Array.isArray(features) ? features : [],
    isActive: Number(row.is_active) === 1,
    sortOrder: Number(row.sort_order) || 0,
  };
}

export function normalizeOrderBody(rawBody = {}) {
  // Support both raw form state and buildOrderPayload-shaped objects
  if (rawBody.invitationData) {
    const inv = rawBody.invitationData;
    return {
      eventType: rawBody.eventType || 'pernikahan',
      hasMepandes: Boolean(rawBody.hasMepandes),
      allowSocialMedia: rawBody.allowSocialMedia,
      themeId: rawBody.themeId || rawBody.templateId || '',
      packageId: rawBody.packageId || '',
      addons: { splitLink: Boolean(rawBody.addons?.splitLink) },
      requestedSlug: rawBody.requestedSlug || '',
      contact: rawBody.contact || {},
      groom: inv.groom || {},
      bride: inv.bride || {},
      mepandes: inv.mepandes || [],
      primaryEventDateTime: inv.primaryEventDateTime || '',
      events: inv.events || [],
      features: inv.features || {},
      loveStories: inv.loveStories || [],
      digitalGifts: inv.digitalGifts || [],
      media: inv.media || {},
      notes: inv.notes || '',
    };
  }
  return rawBody;
}

export function mapTemplateRow(row) {
  const renderer = getTemplateRendererByKey(row.renderer_key) || TEMPLATE_RENDERERS[0];
  const mapped = {
    id: row.id,
    rendererKey: row.renderer_key || 'editorial-classic',
    rendererLabel: renderer?.label || row.renderer_key || 'editorial-classic',
    rendererFolder: renderer?.folder || `src/templates/${row.renderer_key || 'editorial-classic'}`,
    name: row.name,
    tag: row.tag || '',
    description: row.description || '',
    demoUrl: row.demo_url || '',
    previewImage: row.preview_image || '',
    isActive: Number(row.is_active) === 1,
    sortOrder: Number(row.sort_order) || 0,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
  if (row.orders_count !== undefined) {
    mapped.ordersCount = Number(row.orders_count) || 0;
  }
  if (row.invitations_count !== undefined) {
    mapped.invitationsCount = Number(row.invitations_count) || 0;
  }
  return mapped;
}

function isSafeRelativeOrHttpUrl(raw) {
  const val = String(raw || '').trim();
  if (!val) return true;
  if (val.startsWith('/') && !val.startsWith('//')) return true;
  try {
    const parsed = new URL(val);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateTemplatePayload(rawBody = {}, { isUpdate = false } = {}) {
  const result = {};

  if (!isUpdate) {
    const cleanId = slugifyText(rawBody.id || rawBody.name);
    if (!cleanId || cleanId.length < 2 || !SLUG_REGEX.test(cleanId)) {
      return {
        ok: false,
        error: 'ID tema minimal 2 karakter (huruf kecil, angka, dan tanda hubung).',
      };
    }
    result.id = cleanId;
  }

  if (!isUpdate || rawBody.name !== undefined) {
    const name = String(rawBody.name || '').trim();
    if (name.length < 2 || name.length > 80) {
      return { ok: false, error: 'Nama tema wajib diisi (2–80 karakter).' };
    }
    result.name = name;
  }

  if (!isUpdate || rawBody.rendererKey !== undefined || rawBody.renderer_key !== undefined) {
    const rendererKey = String(
      rawBody.rendererKey ?? rawBody.renderer_key ?? 'editorial-classic'
    ).trim();
    if (!getTemplateRendererByKey(rendererKey)) {
      return {
        ok: false,
        error: `Folder template "${rendererKey}" tidak terdaftar di registry.`,
      };
    }
    result.rendererKey = rendererKey;
  }

  if (!isUpdate || rawBody.tag !== undefined) {
    result.tag = String(rawBody.tag || '').trim().slice(0, 40);
  }

  if (!isUpdate || rawBody.description !== undefined) {
    result.description = String(rawBody.description || '').trim().slice(0, 300);
  }

  if (!isUpdate || rawBody.demoUrl !== undefined || rawBody.demo_url !== undefined) {
    const demoUrl = String(rawBody.demoUrl ?? rawBody.demo_url ?? '').trim();
    if (!isSafeRelativeOrHttpUrl(demoUrl)) {
      return { ok: false, error: 'URL demo harus berupa path (mis. /adi-eva) atau URL http/https.' };
    }
    result.demoUrl = demoUrl;
  }

  if (!isUpdate || rawBody.previewImage !== undefined || rawBody.preview_image !== undefined) {
    const previewImage = String(rawBody.previewImage ?? rawBody.preview_image ?? '').trim();
    if (!isSafeRelativeOrHttpUrl(previewImage)) {
      return {
        ok: false,
        error: 'URL thumbnail preview harus berupa path lokal atau URL http/https.',
      };
    }
    result.previewImage = previewImage;
  }

  if (!isUpdate || rawBody.isActive !== undefined || rawBody.is_active !== undefined) {
    const rawActive = rawBody.isActive ?? rawBody.is_active;
    result.isActive = rawActive === undefined ? true : Boolean(rawActive);
  }

  if (!isUpdate || rawBody.sortOrder !== undefined || rawBody.sort_order !== undefined) {
    const rawSort = rawBody.sortOrder ?? rawBody.sort_order;
    const parsedSort = Number(rawSort);
    result.sortOrder = Number.isFinite(parsedSort) ? Math.max(0, Math.round(parsedSort)) : 10;
  }

  return { ok: true, data: result };
}

export function validateOrderSubmission(rawBody, packageRows = [], templateRows = null) {
  const form = normalizeOrderBody(rawBody);
  const activePackages = packageRows.filter(
    (row) => row.kind === 'package' && Number(row.is_active) === 1
  );
  const activeAddons = packageRows.filter(
    (row) => row.kind === 'addon' && Number(row.is_active) === 1
  );
  const activeTemplates = Array.isArray(templateRows)
    ? templateRows.filter((row) => Number(row.is_active) === 1).map(mapTemplateRow)
    : ACTIVE_TEMPLATES;

  if (!activeTemplates.some((t) => t.id === form.themeId)) {
    return { ok: false, errors: { themeId: 'Tema tidak tersedia atau tidak aktif.' } };
  }

  const pkgRow = activePackages.find((p) => p.id === form.packageId);
  if (!pkgRow) {
    return { ok: false, errors: { packageId: 'Paket tidak tersedia atau tidak aktif.' } };
  }

  const allErrors = {};
  for (let step = 1; step <= 6; step += 1) {
    Object.assign(
      allErrors,
      validateStep(step, form, { themes: activeTemplates, packages: activePackages })
    );
  }

  const cleanSlug = slugifyText(form.requestedSlug);
  if (isReservedSlug(cleanSlug)) {
    allErrors.requestedSlug = 'Link undangan menggunakan kata yang dicadangkan sistem.';
  }

  if (Object.keys(allErrors).length > 0) {
    return { ok: false, errors: allErrors };
  }

  return {
    ok: true,
    form,
    pkgRow,
    addonRows: activeAddons,
    cleanSlug,
  };
}
