import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialOrderState } from '../config/orderCatalog.js';
import {
  generateOrderCode,
  generateSlug,
  sanitizeInstagram,
  normalizeWhatsapp,
  extractYoutubeId,
  formatRupiah,
  formatDateIndo,
  calculateOrderPricing,
  validateStep,
  buildOrderPayload,
  buildAdminWhatsappUrl,
} from './orderHelpers.js';

test('generateOrderCode produces ANSL- followed by 6 unambiguous uppercase chars', () => {
  const code = generateOrderCode();
  assert.match(code, /^ANSL-[A-HJ-NP-Z2-9]{6}$/);
});

test('generateSlug normalizes accents, spaces, and punctuation', () => {
  assert.equal(generateSlug('Adi', 'Eva'), 'adi-eva');
  assert.equal(generateSlug('  Gede  Putra ', 'Ni Wayan!'), 'gede-putra-ni-wayan');
  assert.equal(generateSlug('', ''), '');
});

test('sanitizeInstagram strips leading @ and whitespace', () => {
  assert.equal(sanitizeInstagram(' @by.anselmoments '), 'by.anselmoments');
  assert.equal(sanitizeInstagram('@@@adi_eva'), 'adi_eva');
});

test('normalizeWhatsapp converts Indonesian local/international numbers and rejects invalid ones', () => {
  assert.equal(normalizeWhatsapp('0812-3456-7890'), '6281234567890');
  assert.equal(normalizeWhatsapp('+62 857 0084 8786'), '6285700848786');
  assert.equal(normalizeWhatsapp('628123456789'), '628123456789');
  assert.equal(normalizeWhatsapp('12345'), null);
  assert.equal(normalizeWhatsapp('abc'), null);
});

test('formatRupiah and formatDateIndo format display values cleanly', () => {
  assert.equal(formatRupiah(0), 'Free');
  assert.equal(formatRupiah(299000), 'Rp299.000');
  assert.equal(formatDateIndo('2026-08-19T15:00'), 'Rabu, 19 Agustus 2026');
  assert.equal(formatDateIndo('invalid'), '');
});

test('calculateOrderPricing supports both Free (0) and dynamic paid (>0) catalog prices', () => {
  const baseOnly = calculateOrderPricing('premium', { splitLink: false });
  assert.deepEqual(baseOnly, {
    currency: 'IDR',
    basePrice: 0,
    addonsTotal: 0,
    totalPrice: 0,
  });

  const paidCatalog = {
    packages: [{ id: 'premium', price: 299000 }],
    addons: { splitLink: { price: 49000 } },
  };
  const paidWithSplit = calculateOrderPricing('premium', { splitLink: true }, paidCatalog);
  assert.deepEqual(paidWithSplit, {
    currency: 'IDR',
    basePrice: 299000,
    addonsTotal: 49000,
    totalPrice: 348000,
  });
});

test('validateStep enforces required and conditional fields across steps 1-6', () => {
  const form = createInitialOrderState();

  // Step 1 requires allowSocialMedia
  assert.ok(validateStep(1, form).allowSocialMedia);
  form.allowSocialMedia = true;
  assert.deepEqual(validateStep(1, form), {});

  // Step 2 auto-selects editorial-classic, and rejects empty/invalid themeId
  assert.deepEqual(validateStep(2, form), {});
  form.themeId = '';
  assert.ok(validateStep(2, form).themeId);
  form.themeId = 'editorial-classic';
  assert.deepEqual(validateStep(2, form), {});

  // Step 3 requires couple names + conditional mepandes
  const step3Err = validateStep(3, form);
  assert.ok(step3Err['groom.fullName']);
  assert.ok(step3Err['bride.nickname']);
  form.groom.fullName = 'I Gede Adi Wijaya';
  form.groom.nickname = 'Adi';
  form.bride.fullName = 'Putu Eva Cahyani';
  form.bride.nickname = 'Eva';
  form.hasMepandes = true;
  form.mepandes = [{ fullName: '', description: '', instagram: '' }];
  assert.ok(validateStep(3, form)['mepandes.0.fullName']);
  form.mepandes[0].fullName = 'Komang Dika';
  assert.deepEqual(validateStep(3, form), {});

  // Step 4 requires primaryEventDateTime, event details, and validates optional mapsUrl
  assert.ok(validateStep(4, form).primaryEventDateTime);
  form.primaryEventDateTime = '2026-08-19T15:00';
  form.events = [
    {
      name: 'Pawiwahan',
      dateLabel: 'Rabu, 19 Agustus 2026',
      timeLabel: '15.00 WITA - Selesai',
      address: 'Jalan Raya Gadon No 4',
      mapsUrl: 'not-a-url',
    },
  ];
  assert.ok(validateStep(4, form)['events.0.mapsUrl']);
  form.events[0].mapsUrl = 'https://maps.app.goo.gl/test';
  assert.deepEqual(validateStep(4, form), {});

  // Step 5 validates enabled loveStory / digitalGift and media URLs
  form.features.digitalGiftEnabled = true;
  form.digitalGifts = [{ bankName: 'BNI', accountHolder: '', accountNumber: '' }];
  assert.ok(validateStep(5, form)['digitalGifts.0.accountHolder']);
  form.digitalGifts = [{ bankName: 'BNI', accountHolder: 'Adi', accountNumber: '0700899045' }];
  form.media.musicUrl = 'invalid-link';
  assert.ok(validateStep(5, form)['media.musicUrl']);
  form.media.musicUrl = 'https://www.youtube.com/watch?v=abc';
  assert.deepEqual(validateStep(5, form), {});

  // Step 6 validates slug, customerName, and whatsapp
  assert.ok(validateStep(6, form).requestedSlug);
  assert.ok(validateStep(6, form)['contact.customerName']);
  assert.ok(validateStep(6, form)['contact.whatsapp']);
  form.requestedSlug = 'adi-eva';
  form.contact.customerName = 'Nanda Putra';
  form.contact.whatsapp = '081234567890';
  assert.deepEqual(validateStep(6, form), {});
});

test('buildOrderPayload strips inactive conditional arrays and normalizes fields', () => {
  const form = createInitialOrderState();
  form.allowSocialMedia = false;
  form.hasMepandes = false;
  form.mepandes = [{ fullName: 'Stale Entry', description: '', instagram: '' }];
  form.themeId = 'editorial-classic';
  form.groom = { fullName: 'Adi Wijaya', nickname: 'Adi', parentDescription: '', address: '', instagram: '@adi' };
  form.bride = { fullName: 'Eva Cahyani', nickname: 'Eva', parentDescription: '', address: '', instagram: '@eva' };
  form.primaryEventDateTime = '2026-08-19T15:00';
  form.events = [{ name: 'Pawiwahan', dateLabel: 'Rabu', timeLabel: '15.00', address: 'Bali', mapsUrl: '' }];
  form.features.loveStoryEnabled = false;
  form.loveStories = [{ title: 'Stale', description: 'Stale' }];
  form.addons.splitLink = true;
  form.requestedSlug = 'Adi Eva!';
  form.contact = { customerName: 'Nanda Putra', whatsapp: '0812-3456-7890' };

  const payload = buildOrderPayload(form, 'ANSL-7K9M2X');
  assert.equal(payload.orderCode, 'ANSL-7K9M2X');
  assert.equal(payload.status, 'pending_confirmation');
  assert.equal(payload.requestedSlug, 'adi-eva');
  assert.equal(payload.contact.whatsapp, '6281234567890');
  assert.equal(payload.contact.customerName, 'Nanda Putra');
  assert.deepEqual(payload.invitationData.mepandes, []);
  assert.deepEqual(payload.invitationData.loveStories, []);
  assert.equal(payload.invitationData.groom.instagram, 'adi');
  assert.equal(payload.pricing.totalPrice, 0);

  const waUrl = buildAdminWhatsappUrl(payload, 'https://anselmoments.com');
  assert.ok(waUrl.startsWith('https://wa.me/6285700848786?text='));
  const decoded = decodeURIComponent(waUrl.split('text=')[1]);
  assert.match(decoded, /ANSL-7K9M2X/);
  assert.match(decoded, /Nama Pemesan: Nanda Putra/);
  assert.match(decoded, /Biaya: \*Free\*/);
  assert.doesNotMatch(decoded, /Rp\d/);
  assert.match(decoded, /Split Link/);
  assert.match(decoded, /https:\/\/anselmoments\.com\/order\/ANSL-7K9M2X/);

  const paidCatalog = {
    packages: [{ id: 'premium', name: 'Premium', price: 299000 }],
    addons: { splitLink: { price: 49000 } },
  };
  const paidPayload = buildOrderPayload(form, 'ANSL-9P2Q3R', paidCatalog);
  assert.equal(paidPayload.status, 'pending_payment');
  assert.equal(paidPayload.pricing.totalPrice, 348000);
  const paidWa = decodeURIComponent(
    buildAdminWhatsappUrl(paidPayload, 'https://anselmoments.com').split('text=')[1]
  );
  assert.match(paidWa, /Biaya: \*Rp348\.000\*/);
});

test('extractYoutubeId parses standard, short, music, shorts, and embed YouTube URLs only', () => {
  assert.equal(extractYoutubeId('https://youtu.be/PEM0Vs8jf1w?si=kT8qhfO000lCtn6r'), 'PEM0Vs8jf1w');
  assert.equal(extractYoutubeId('https://www.youtube.com/watch?v=SokqIN0Fj0c'), 'SokqIN0Fj0c');
  assert.equal(extractYoutubeId('https://music.youtube.com/watch?v=PEM0Vs8jf1w&feature=share'), 'PEM0Vs8jf1w');
  assert.equal(extractYoutubeId('https://www.youtube.com/shorts/PEM0Vs8jf1w'), 'PEM0Vs8jf1w');
  assert.equal(extractYoutubeId('https://www.youtube.com/embed/PEM0Vs8jf1w'), 'PEM0Vs8jf1w');
  assert.equal(extractYoutubeId('/assets/music/backsound-fix.mp3'), '');
  assert.equal(extractYoutubeId('https://example.com/song.mp3?v=1234567890'), '');
});
