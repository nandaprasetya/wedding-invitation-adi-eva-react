import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDefaultSectionsForOrder } from '../src/templates/registry.js';
import {
  buildClearSessionCookie,
  buildSessionCookie,
  hashPassword,
  isValidAdminEmail,
  parseCookies,
  resolveSessionSecret,
  signSessionToken,
  timingSafeEqualStrings,
  validateAdminPassword,
  verifyPassword,
  verifySessionToken,
} from './accessAuth.js';
import {
  maskWhatsapp,
  computeServerPricing,
  mapTemplateRow,
  validateTemplatePayload,
  validateOrderSubmission,
  validateUploadFile,
  sanitizeR2KeySegment,
  isReservedSlug,
  validateSlugCandidate,
  isSqliteUniqueError,
  mimeToExtension,
  buildMediaPublicUrl,
} from './helpers.js';

test('maskWhatsapp masks middle digits while preserving prefix and last 4 digits', () => {
  assert.equal(maskWhatsapp('6281234567890'), '+62812••••7890');
  assert.equal(maskWhatsapp('081234567890'), '+62812••••7890');
  assert.equal(maskWhatsapp(''), '-');
});

test('computeServerPricing handles Free (0) and Paid (>0) D1 package/addon rows', () => {
  const freePkg = { id: 'premium', name: 'Premium', price: 0, is_active: 1 };
  const freeAddon = [{ id: 'split_link', name: 'Split Link', price: 0, is_active: 1 }];
  assert.deepEqual(computeServerPricing(freePkg, freeAddon, { splitLink: true }), {
    currency: 'IDR',
    basePrice: 0,
    addonsTotal: 0,
    totalPrice: 0,
    initialStatus: 'pending_confirmation',
  });

  const paidPkg = { id: 'premium', name: 'Premium', price: 299000, is_active: 1 };
  const paidAddon = [{ id: 'split_link', name: 'Split Link', price: 49000, is_active: 1 }];
  assert.deepEqual(computeServerPricing(paidPkg, paidAddon, { splitLink: false }), {
    currency: 'IDR',
    basePrice: 299000,
    addonsTotal: 0,
    totalPrice: 299000,
    initialStatus: 'pending_payment',
  });
  assert.deepEqual(computeServerPricing(paidPkg, paidAddon, { splitLink: true }), {
    currency: 'IDR',
    basePrice: 299000,
    addonsTotal: 49000,
    totalPrice: 348000,
    initialStatus: 'pending_payment',
  });

  const inactiveAddon = [{ id: 'split_link', name: 'Split Link', price: 49000, is_active: 0 }];
  assert.deepEqual(computeServerPricing(paidPkg, inactiveAddon, { splitLink: true }), {
    currency: 'IDR',
    basePrice: 299000,
    addonsTotal: 0,
    totalPrice: 299000,
    initialStatus: 'pending_payment',
  });
});

test('buildDefaultSectionsForOrder toggles optional sections and populates couple/event/gift data', () => {
  const sections = buildDefaultSectionsForOrder({
    hasMepandes: true,
    invitationData: {
      groom: { fullName: 'I Gede Adi', nickname: 'Adi', parentDescription: 'Bpk & Ibu', address: 'Badung', instagram: 'adi' },
      bride: { fullName: 'Putu Eva', nickname: 'Eva', parentDescription: 'Bpk & Ibu', address: 'Denpasar', instagram: 'eva' },
      mepandes: [{ fullName: 'Komang Dika', description: 'Adik', instagram: 'dika' }],
      primaryEventDateTime: '2026-08-19T15:00',
      events: [{ name: 'Pawiwahan', dateLabel: 'Rabu, 19 Agustus 2026', timeLabel: '15.00 WITA', address: 'Gadon', mapsUrl: '' }],
      features: { loveStoryEnabled: false, digitalGiftEnabled: true },
      loveStories: [],
      digitalGifts: [{ bankName: 'BNI', accountHolder: 'Adi', accountNumber: '0700899045' }],
      media: { videoUrl: 'https://youtube.com/watch?v=test' },
    },
  });

  const byType = Object.fromEntries(sections.map((s) => [s.type, s]));
  assert.equal(byType.cover.data.title, 'Adi & Eva');
  assert.equal(byType.mepandes.visible, true);
  assert.equal(byType.mepandes.data.participants.length, 1);
  assert.equal(byType.love_story.visible, false);
  assert.equal(byType.gift.visible, true);
  assert.equal(byType.gift.data.accounts[0].accountNumber, '0700899045');
  assert.equal(byType.custom_note.visible, false);
});

test('validateOrderSubmission rejects invalid contact, templateId, or inactive package', () => {
  const activePackages = [
    { id: 'premium', kind: 'package', name: 'Premium', price: 0, is_active: 1 },
    { id: 'legacy', kind: 'package', name: 'Legacy', price: 0, is_active: 0 },
  ];

  const validBody = {
    eventType: 'pernikahan',
    allowSocialMedia: true,
    themeId: 'editorial-classic',
    packageId: 'premium',
    requestedSlug: 'adi-eva',
    contact: { customerName: 'Adi Wijaya', whatsapp: '081234567890' },
    groom: { fullName: 'I Gede Adi', nickname: 'Adi' },
    bride: { fullName: 'Putu Eva', nickname: 'Eva' },
    primaryEventDateTime: '2026-08-19T15:00',
    events: [{ name: 'Pawiwahan', dateLabel: 'Rabu', timeLabel: '15.00', address: 'Bali', mapsUrl: '' }],
  };

  assert.equal(validateOrderSubmission(validBody, activePackages).ok, true);

  const missingName = validateOrderSubmission({
    ...validBody,
    contact: { customerName: '', whatsapp: '081234567890' },
  }, activePackages);
  assert.equal(missingName.ok, false);

  const badWa = validateOrderSubmission({
    ...validBody,
    contact: { customerName: 'Adi', whatsapp: '123' },
  }, activePackages);
  assert.equal(badWa.ok, false);

  const badTemplate = validateOrderSubmission({
    ...validBody,
    themeId: 'ivory-minimal',
  }, activePackages);
  assert.equal(badTemplate.ok, false);

  const inactivePkg = validateOrderSubmission({
    ...validBody,
    packageId: 'legacy',
  }, activePackages);
  assert.equal(inactivePkg.ok, false);

  const d1Templates = [
    { id: 'editorial-classic', renderer_key: 'editorial-classic', name: 'Editorial Classic', is_active: 1 },
    { id: 'bali-heritage', renderer_key: 'editorial-classic', name: 'Bali Heritage', is_active: 1 },
    { id: 'archived-theme', renderer_key: 'editorial-classic', name: 'Archived', is_active: 0 },
  ];
  assert.equal(
    validateOrderSubmission({ ...validBody, themeId: 'bali-heritage' }, activePackages, d1Templates).ok,
    true
  );
  assert.equal(
    validateOrderSubmission({ ...validBody, themeId: 'archived-theme' }, activePackages, d1Templates).ok,
    false
  );
});

test('mapTemplateRow and validateTemplatePayload enforce renderer registry, slugs, and safe URLs', () => {
  const mapped = mapTemplateRow({
    id: 'bali-klasik',
    renderer_key: 'editorial-classic',
    name: 'Bali Klasik',
    tag: 'Terbaru',
    description: 'Tema adat Bali',
    demo_url: '/adi-eva',
    preview_image: '/assets/img/GIK-1.png',
    is_active: 1,
    sort_order: 2,
    orders_count: 3,
    invitations_count: 2,
  });
  assert.equal(mapped.rendererFolder, 'src/templates/editorial-classic');
  assert.equal(mapped.isActive, true);
  assert.equal(mapped.ordersCount, 3);
  assert.equal(mapped.invitationsCount, 2);

  const okCreate = validateTemplatePayload(
    {
      name: 'Bali Klasik',
      rendererKey: 'editorial-classic',
      tag: 'Terbaru',
      demoUrl: '/tude-maha',
      previewImage: 'https://media.anselmoments.com/invitations/theme-previews/thumb.webp',
      sortOrder: 3,
    },
    { isUpdate: false }
  );
  assert.equal(okCreate.ok, true);
  assert.equal(okCreate.data.id, 'bali-klasik');

  const badRenderer = validateTemplatePayload(
    { name: 'Test', rendererKey: 'nonexistent-folder' },
    { isUpdate: false }
  );
  assert.equal(badRenderer.ok, false);

  const badDemoUrl = validateTemplatePayload(
    { demoUrl: 'javascript:alert(1)' },
    { isUpdate: true }
  );
  assert.equal(badDemoUrl.ok, false);

  const okPartialUpdate = validateTemplatePayload({ isActive: false }, { isUpdate: true });
  assert.equal(okPartialUpdate.ok, true);
  assert.deepEqual(okPartialUpdate.data, { isActive: false });
});

test('validateUploadFile, sanitizeR2KeySegment, and isReservedSlug enforce upload & slug safety', () => {
  assert.equal(validateUploadFile({ type: 'image/webp', size: 150_000 }).ok, true);
  assert.equal(validateUploadFile({ type: 'audio/mpeg', size: 4_000_000 }).ok, true);
  assert.equal(validateUploadFile({ type: 'image/svg+xml', size: 1000 }).ok, false);
  assert.equal(validateUploadFile({ type: 'image/jpeg', size: 20 * 1024 * 1024 }).ok, false);
  assert.equal(sanitizeR2KeySegment('Adi & Eva!!/..'), 'adi-eva');
  assert.equal(isReservedSlug('admin'), true);
  assert.equal(isReservedSlug('order'), true);
  assert.equal(isReservedSlug('adi-eva'), false);

  assert.equal(validateSlugCandidate('Adi & Eva').slug, 'adi-eva');
  assert.equal(validateSlugCandidate('admin').ok, false);
  assert.equal(validateSlugCandidate('a').ok, false);
  assert.equal(isSqliteUniqueError(new Error('UNIQUE constraint failed: invitations.slug')), true);
  assert.equal(mimeToExtension('image/webp'), 'webp');
  assert.equal(mimeToExtension('audio/mpeg'), 'mp3');
  assert.equal(
    buildMediaPublicUrl({
      requestUrl: 'https://anselmoments.com/api/admin/media/upload',
      env: { R2_PUBLIC_BASE_URL: 'https://media.anselmoments.com/' },
      r2Key: 'invitations/adi-eva/123.webp',
    }),
    'https://media.anselmoments.com/invitations/adi-eva/123.webp'
  );
  assert.equal(
    buildMediaPublicUrl({
      requestUrl: 'http://127.0.0.1:8787/api/admin/media/upload',
      env: { DEV_BYPASS_ACCESS: 'true', R2_PUBLIC_BASE_URL: 'https://media.anselmoments.com' },
      r2Key: 'invitations/adi-eva/123.webp',
    }),
    '/api/media/invitations/adi-eva/123.webp'
  );
});

test('PBKDF2 password hashing and HMAC session cookies enforce authentication security', async () => {
  const hash = await hashPassword('RahasiaStudio#2026');
  assert.match(hash, /^pbkdf2_sha256\$100000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
  assert.equal(await verifyPassword('RahasiaStudio#2026', hash), true);
  assert.equal(await verifyPassword('PasswordSalah123', hash), false);
  assert.equal(await verifyPassword('RahasiaStudio#2026', 'invalid-format'), false);

  assert.equal(isValidAdminEmail('owner@anselmoments.com'), true);
  assert.equal(isValidAdminEmail('not-an-email'), false);
  assert.equal(validateAdminPassword('1234567').ok, false);
  assert.equal(validateAdminPassword('12345678').ok, true);

  assert.equal(await timingSafeEqualStrings('secret-key-123', 'secret-key-123'), true);
  assert.equal(await timingSafeEqualStrings('secret-key-123', 'secret-key-124'), false);
  assert.equal(await timingSafeEqualStrings('short', 'much-longer-string'), false);

  const secret = 'super-secret-signing-key-at-least-32-chars';
  const token = await signSessionToken(
    { sub: 'usr-1', email: 'owner@anselmoments.com', name: 'Owner', role: 'owner', tv: 2 },
    secret,
    300
  );
  const payload = await verifySessionToken(token, secret);
  assert.equal(payload.sub, 'usr-1');
  assert.equal(payload.email, 'owner@anselmoments.com');
  assert.equal(payload.tv, 2);

  await assert.rejects(() => verifySessionToken(token, 'wrong-secret-key-1234567890'), /signature/i);
  await assert.rejects(() => verifySessionToken(`${token.slice(0, -4)}AAAA`, secret), /signature/i);

  const expiredToken = await signSessionToken(
    { sub: 'usr-1', email: 'owner@anselmoments.com', name: 'Owner', role: 'owner', tv: 1 },
    secret,
    -10
  );
  await assert.rejects(() => verifySessionToken(expiredToken, secret), /expired/i);

  const setCookie = buildSessionCookie(token, { isSecure: true, maxAge: 3600 });
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Lax/);
  assert.match(setCookie, /Secure/);
  const parsed = parseCookies(`foo=bar; ansel_admin_session=${encodeURIComponent(token)}`);
  assert.equal(parsed.ansel_admin_session, token);
  assert.match(buildClearSessionCookie({ isSecure: true }), /Max-Age=0/);

  assert.equal(resolveSessionSecret({}, 'https://anselmoments.com/api/auth/admin/login'), '');
  assert.equal(
    resolveSessionSecret({ DEV_BYPASS_ACCESS: 'true' }, 'http://localhost:8787/api/auth/admin/login').length >= 16,
    true
  );
  assert.equal(
    resolveSessionSecret({ ADMIN_SESSION_SECRET: secret }, 'https://anselmoments.com/api/auth/admin/login'),
    secret
  );
});
