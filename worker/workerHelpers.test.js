import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDefaultSectionsForOrder } from '../src/templates/registry.js';
import { verifyAccessJwt } from './accessAuth.js';
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

function toBase64Url(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signTestJwt(privateKey, header, payload) {
  const signingInput = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(payload))}`;
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signingInput)
  );
  return `${signingInput}.${toBase64Url(sig)}`;
}

test('verifyAccessJwt validates RS256 signature, issuer, audience, and expiry via Web Crypto', async () => {
  const { publicKey, privateKey } = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  );

  const publicJwk = await crypto.subtle.exportKey('jwk', publicKey);
  publicJwk.kid = 'test-key-1';
  const teamDomain = 'https://ansel-test.cloudflareaccess.com';
  const aud = 'test-aud-tag-123';
  const nowSec = Math.floor(Date.now() / 1000);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(url, `${teamDomain}/cdn-cgi/access/certs`);
    return new Response(JSON.stringify({ keys: [publicJwk] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const validJwt = await signTestJwt(
      privateKey,
      { alg: 'RS256', kid: 'test-key-1', typ: 'JWT' },
      { iss: teamDomain, aud: [aud], email: 'admin@anselmoments.com', exp: nowSec + 300, nbf: nowSec - 10 }
    );
    const payload = await verifyAccessJwt(validJwt, { teamDomain, aud });
    assert.equal(payload.email, 'admin@anselmoments.com');

    const expiredJwt = await signTestJwt(
      privateKey,
      { alg: 'RS256', kid: 'test-key-1' },
      { iss: teamDomain, aud: [aud], email: 'admin@anselmoments.com', exp: nowSec - 60 }
    );
    await assert.rejects(() => verifyAccessJwt(expiredJwt, { teamDomain, aud }), /expired/i);

    const wrongAudJwt = await signTestJwt(
      privateKey,
      { alg: 'RS256', kid: 'test-key-1' },
      { iss: teamDomain, aud: ['wrong-aud'], exp: nowSec + 300 }
    );
    await assert.rejects(() => verifyAccessJwt(wrongAudJwt, { teamDomain, aud }), /audience/i);

    const wrongIssJwt = await signTestJwt(
      privateKey,
      { alg: 'RS256', kid: 'test-key-1' },
      { iss: 'https://evil.example.com', aud: [aud], exp: nowSec + 300 }
    );
    await assert.rejects(() => verifyAccessJwt(wrongIssJwt, { teamDomain, aud }), /issuer/i);

    const tamperedJwt = `${validJwt.slice(0, -4)}AAAA`;
    await assert.rejects(() => verifyAccessJwt(tamperedJwt, { teamDomain, aud }), /signature/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
