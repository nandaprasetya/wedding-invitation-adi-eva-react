import {
  BRAND_CONFIG,
  ORDER_ADDONS,
  ORDER_PACKAGES,
  ORDER_THEMES,
} from '../config/orderCatalog.js';

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const INDONESIAN_DAYS = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function generateOrderCode() {
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  let suffix = '';
  for (let i = 0; i < bytes.length; i += 1) {
    suffix += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `ANSL-${suffix}`;
}

export function slugifyText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function generateSlug(groomNickname, brideNickname) {
  const parts = [slugifyText(groomNickname), slugifyText(brideNickname)].filter(Boolean);
  return parts.join('-');
}

export function sanitizeInstagram(value) {
  return String(value || '').trim().replace(/^@+/, '');
}

export function normalizeWhatsapp(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return null;

  let normalized = digits;
  if (normalized.startsWith('0')) {
    normalized = `62${normalized.slice(1)}`;
  } else if (normalized.startsWith('8')) {
    normalized = `62${normalized}`;
  }

  if (!/^628\d{7,13}$/.test(normalized)) {
    return null;
  }
  return normalized;
}

export function isValidOptionalHttpUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function formatRupiah(amount) {
  const num = Number(amount) || 0;
  if (num <= 0) return 'Free';
  return `Rp${Math.round(num).toLocaleString('id-ID')}`;
}

export function formatDateIndo(dateTimeLocal) {
  if (!dateTimeLocal) return '';
  const datePart = String(dateTimeLocal).split('T')[0];
  const parts = datePart.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return '';
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return '';
  }
  return `${INDONESIAN_DAYS[date.getDay()]}, ${day} ${INDONESIAN_MONTHS[month - 1]} ${year}`;
}

export function calculateOrderPricing(packageId, addons = {}) {
  const pkg = ORDER_PACKAGES.find((item) => item.id === packageId) || ORDER_PACKAGES[0];
  const basePrice = pkg ? pkg.price : 0;
  const addonsTotal = addons?.splitLink ? ORDER_ADDONS.splitLink.price : 0;

  return {
    currency: 'IDR',
    basePrice,
    addonsTotal,
    totalPrice: basePrice + addonsTotal,
  };
}

export function validateStep(step, form) {
  const errors = {};

  if (step === 1) {
    if (!form.eventType) {
      errors.eventType = 'Pilih jenis undangan terlebih dahulu.';
    }
    if (form.allowSocialMedia !== true && form.allowSocialMedia !== false) {
      errors.allowSocialMedia = 'Silakan pilih izin penampilan foto di media sosial.';
    }
  }

  if (step === 2) {
    if (!form.themeId || !ORDER_THEMES.some((t) => t.id === form.themeId)) {
      errors.themeId = 'Pilih salah satu tema undangan untuk melanjutkan.';
    }
  }

  if (step === 3) {
    if (!form.groom?.fullName?.trim()) {
      errors['groom.fullName'] = 'Nama lengkap mempelai pria wajib diisi.';
    }
    if (!form.groom?.nickname?.trim()) {
      errors['groom.nickname'] = 'Nama panggilan mempelai pria wajib diisi.';
    }
    if (!form.bride?.fullName?.trim()) {
      errors['bride.fullName'] = 'Nama lengkap mempelai wanita wajib diisi.';
    }
    if (!form.bride?.nickname?.trim()) {
      errors['bride.nickname'] = 'Nama panggilan mempelai wanita wajib diisi.';
    }
    if (form.hasMepandes) {
      const list = Array.isArray(form.mepandes) ? form.mepandes : [];
      if (list.length === 0) {
        errors.mepandes = 'Tambahkan minimal satu peserta Metatah / Mepandes.';
      } else {
        list.forEach((person, idx) => {
          if (!person?.fullName?.trim()) {
            errors[`mepandes.${idx}.fullName`] = 'Nama lengkap peserta Mepandes wajib diisi.';
          }
        });
      }
    }
  }

  if (step === 4) {
    if (!form.primaryEventDateTime?.trim()) {
      errors.primaryEventDateTime = 'Tanggal & waktu dimulainya acara wajib dipilih.';
    }
    const events = Array.isArray(form.events) ? form.events : [];
    if (events.length === 0) {
      errors.events = 'Tambahkan minimal satu rangkaian acara.';
    } else {
      events.forEach((ev, idx) => {
        if (!ev?.name?.trim()) errors[`events.${idx}.name`] = 'Nama acara wajib diisi.';
        if (!ev?.dateLabel?.trim()) errors[`events.${idx}.dateLabel`] = 'Tanggal acara wajib diisi.';
        if (!ev?.timeLabel?.trim()) errors[`events.${idx}.timeLabel`] = 'Waktu acara wajib diisi.';
        if (!ev?.address?.trim()) errors[`events.${idx}.address`] = 'Alamat acara wajib diisi.';
        if (!isValidOptionalHttpUrl(ev?.mapsUrl)) {
          errors[`events.${idx}.mapsUrl`] = 'Link Google Maps harus diawali https:// atau http://.';
        }
      });
    }
  }

  if (step === 5) {
    if (!form.packageId || !ORDER_PACKAGES.some((p) => p.id === form.packageId)) {
      errors.packageId = 'Pilih paket undangan terlebih dahulu.';
    }
    if (form.features?.loveStoryEnabled) {
      const stories = Array.isArray(form.loveStories) ? form.loveStories : [];
      if (stories.length === 0) {
        errors.loveStories = 'Tambahkan minimal satu cerita atau matikan fitur Love Story.';
      } else {
        stories.forEach((story, idx) => {
          if (!story?.title?.trim()) errors[`loveStories.${idx}.title`] = 'Judul cerita wajib diisi.';
          if (!story?.description?.trim()) {
            errors[`loveStories.${idx}.description`] = 'Deskripsi cerita wajib diisi.';
          }
        });
      }
    }
    if (form.features?.digitalGiftEnabled) {
      const gifts = Array.isArray(form.digitalGifts) ? form.digitalGifts : [];
      if (gifts.length === 0) {
        errors.digitalGifts = 'Tambahkan minimal satu rekening atau matikan Amplop Digital.';
      } else {
        gifts.forEach((gift, idx) => {
          if (!gift?.bankName?.trim()) errors[`digitalGifts.${idx}.bankName`] = 'Nama bank / e-wallet wajib diisi.';
          if (!gift?.accountHolder?.trim()) {
            errors[`digitalGifts.${idx}.accountHolder`] = 'Nama pemilik rekening wajib diisi.';
          }
          if (!gift?.accountNumber?.trim()) {
            errors[`digitalGifts.${idx}.accountNumber`] = 'Nomor rekening / e-wallet wajib diisi.';
          }
        });
      }
    }
    if (!isValidOptionalHttpUrl(form.media?.musicUrl)) {
      errors['media.musicUrl'] = 'Link musik harus berupa URL valid (https://...).';
    }
    if (!isValidOptionalHttpUrl(form.media?.videoUrl)) {
      errors['media.videoUrl'] = 'Link video harus berupa URL valid (https://...).';
    }
    if (!isValidOptionalHttpUrl(form.media?.photoDriveUrl)) {
      errors['media.photoDriveUrl'] = 'Tautan folder foto harus berupa URL valid (https://...).';
    }
  }

  if (step === 6) {
    const cleanSlug = slugifyText(form.requestedSlug);
    if (!cleanSlug || cleanSlug.length < 2 || !SLUG_REGEX.test(cleanSlug)) {
      errors.requestedSlug = 'Link undangan minimal 2 karakter (hanya huruf, angka, dan tanda hubung).';
    }
    if ((form.contact?.customerName?.trim() || '').length < 2) {
      errors['contact.customerName'] = 'Nama pemesan wajib diisi (minimal 2 karakter).';
    }
    if (!normalizeWhatsapp(form.contact?.whatsapp)) {
      errors['contact.whatsapp'] = 'Masukkan nomor WhatsApp Indonesia yang valid (contoh: 081234567890).';
    }
  }

  return errors;
}

export function buildOrderPayload(form, orderCode) {
  const theme = ORDER_THEMES.find((t) => t.id === form.themeId);
  const pkg = ORDER_PACKAGES.find((p) => p.id === form.packageId) || ORDER_PACKAGES[0];
  const pricing = calculateOrderPricing(pkg.id, form.addons);
  const cleanSlug =
    slugifyText(form.requestedSlug) ||
    generateSlug(form.groom?.nickname, form.bride?.nickname) ||
    orderCode.toLowerCase();

  const coupleTitle = [form.groom?.nickname?.trim(), form.bride?.nickname?.trim()]
    .filter(Boolean)
    .join(' & ');

  const normalizedWa = normalizeWhatsapp(form.contact?.whatsapp) || '';

  return {
    orderCode,
    schemaVersion: 1,
    status: 'pending_confirmation',
    eventType: form.eventType || 'pernikahan',
    hasMepandes: Boolean(form.hasMepandes),
    allowSocialMedia: Boolean(form.allowSocialMedia),
    themeId: theme?.id || form.themeId,
    themeName: theme?.name || form.themeId,
    packageId: pkg.id,
    packageName: pkg.name,
    addons: {
      splitLink: Boolean(form.addons?.splitLink),
    },
    pricing,
    requestedSlug: cleanSlug,
    publishedSlug: null,
    contact: {
      customerName: form.contact?.customerName?.trim() || '',
      whatsapp: normalizedWa,
    },
    invitationData: {
      groom: {
        fullName: form.groom?.fullName?.trim() || '',
        nickname: form.groom?.nickname?.trim() || '',
        parentDescription: form.groom?.parentDescription?.trim() || '',
        address: form.groom?.address?.trim() || '',
        instagram: sanitizeInstagram(form.groom?.instagram),
      },
      bride: {
        fullName: form.bride?.fullName?.trim() || '',
        nickname: form.bride?.nickname?.trim() || '',
        parentDescription: form.bride?.parentDescription?.trim() || '',
        address: form.bride?.address?.trim() || '',
        instagram: sanitizeInstagram(form.bride?.instagram),
      },
      mepandes: form.hasMepandes
        ? (form.mepandes || [])
            .filter((p) => p?.fullName?.trim())
            .map((p) => ({
              fullName: p.fullName.trim(),
              description: p.description?.trim() || '',
              instagram: sanitizeInstagram(p.instagram),
            }))
        : [],
      primaryEventDateTime: form.primaryEventDateTime || '',
      events: (form.events || []).map((ev) => ({
        name: ev.name?.trim() || '',
        dateLabel: ev.dateLabel?.trim() || '',
        timeLabel: ev.timeLabel?.trim() || '',
        address: ev.address?.trim() || '',
        mapsUrl: ev.mapsUrl?.trim() || '',
      })),
      features: {
        loveStoryEnabled: Boolean(form.features?.loveStoryEnabled),
        digitalGiftEnabled: Boolean(form.features?.digitalGiftEnabled),
      },
      loveStories: form.features?.loveStoryEnabled
        ? (form.loveStories || [])
            .filter((s) => s?.title?.trim() || s?.description?.trim())
            .map((s) => ({
              title: s.title?.trim() || '',
              description: s.description?.trim() || '',
            }))
        : [],
      digitalGifts: form.features?.digitalGiftEnabled
        ? (form.digitalGifts || [])
            .filter((g) => g?.bankName?.trim() || g?.accountNumber?.trim())
            .map((g) => ({
              bankName: g.bankName?.trim() || '',
              accountHolder: g.accountHolder?.trim() || '',
              accountNumber: g.accountNumber?.trim() || '',
            }))
        : [],
      media: {
        musicUrl: form.media?.musicUrl?.trim() || '',
        videoUrl: form.media?.videoUrl?.trim() || '',
        photoDriveUrl: form.media?.photoDriveUrl?.trim() || '',
      },
      notes: form.notes?.trim() || '',
    },
  };
}

export function buildAdminWhatsappUrl(order, origin) {
  const baseOrigin =
    origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))
      ? origin
      : `https://${BRAND_CONFIG.domain}`;

  const coupleTitle = [
    order?.invitationData?.groom?.nickname,
    order?.invitationData?.bride?.nickname,
  ]
    .filter(Boolean)
    .join(' & ');

  const lines = [
    `Halo Admin ${BRAND_CONFIG.name}, saya sudah mengisi formulir pemesanan undangan digital.`,
    '',
    '*Detail Pesanan:*',
    `• Kode Order: ${order.orderCode}`,
    `• Nama Pemesan: ${order?.contact?.customerName || '-'}`,
    `• Mempelai: ${coupleTitle || '-'}`,
    `• Tema: ${order.themeName || '-'}`,
    `• Paket: ${order.packageName} (Free)`,
  ];

  if (order?.addons?.splitLink) {
    lines.push(`• Add-On: ${ORDER_ADDONS.splitLink.name} (Free)`);
  }
  if (order?.hasMepandes) {
    lines.push('• Tambahan Acara: Metatah / Mepandes');
  }

  lines.push(
    '• Biaya: *Free*',
    `• Request Link: ${BRAND_CONFIG.domain}/${order.requestedSlug}`,
    '',
    'Link status pesanan:',
    `${baseOrigin}/order/${order.orderCode}`,
    '',
    'Mohon konfirmasi untuk melanjutkan proses pengerjaan undangan ya. Terima kasih!'
  );

  return `https://wa.me/${BRAND_CONFIG.adminWhatsapp}?text=${encodeURIComponent(lines.join('\n'))}`;
}
