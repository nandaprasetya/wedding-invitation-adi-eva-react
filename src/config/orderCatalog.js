export const BRAND_CONFIG = {
  name: 'Ansel Moments',
  domain: 'anselmoments.com',
  adminWhatsapp: '6285700848786',
  instagramHandle: '@by.anselmoments',
  logoUrl: '/assets/img/logo-ansel.png',
};

export const EVENT_TYPES = [
  { id: 'pernikahan', label: 'Pernikahan (Pawiwahan / Resepsi)' },
];

// Ubah atau tambah tema baru di array ini; previewImage menggunakan aset lokal.
export const ORDER_THEMES = [
  {
    id: 'editorial-classic',
    name: 'Editorial Classic',
    tag: 'Populer',
    description: 'Split-screen gelap elegan dengan tipografi serif klasik dan galeri penuh.',
    demoUrl: '/adi-eva',
    previewImage: '/assets/img/GIK-1.png',
  },
  {
    id: 'ivory-minimal',
    name: 'Ivory Minimal',
    tag: 'Minimalis',
    description: 'Layout terang bersih dengan ruang lega dan sentuhan editorial modern.',
    demoUrl: '/adi-eva',
    previewImage: '/assets/img/GIK-14.png',
  },
  {
    id: 'warm-sand',
    name: 'Warm Sand',
    tag: 'Hangat',
    description: 'Nuansa krem hangat dan aksen perunggu yang intim untuk upacara adat Bali.',
    demoUrl: '/adi-eva',
    previewImage: '/assets/img/GIK-4.png',
  },
];

export const ORDER_PACKAGES = [
  {
    id: 'premium',
    name: 'Premium',
    price: 0,
    recommended: true,
    summary: 'Aktif 1 tahun, seluruh fitur lengkap tanpa batas tamu.',
    features: [
      'Custom nama tamu tanpa batas',
      'Galeri foto, video YouTube & musik latar',
      'Buku tamu, RSVP & Google Maps',
      'Love Story & Amplop Digital',
    ],
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 0,
    recommended: false,
    summary: 'Aktif 6 bulan, fitur inti undangan digital modern.',
    features: [
      'Custom nama tamu tanpa batas',
      'Galeri foto & musik latar',
      'Buku tamu, RSVP & Google Maps',
      'Hitung mundur acara',
    ],
  },
];

export const ORDER_ADDONS = {
  splitLink: {
    id: 'splitLink',
    name: 'Split Link',
    price: 0,
    description:
      'Buat 2 link undangan berbeda dari 1 pesanan. Cocok untuk membedakan info acara antara tamu umum dan keluarga dekat.',
  },
};

export const ORDER_STEPS = [
  { number: 1, key: 'preferences', label: 'Pengaturan Awal', shortLabel: 'Awal' },
  { number: 2, key: 'theme', label: 'Pilih Tema', shortLabel: 'Tema' },
  { number: 3, key: 'couple', label: 'Data Mempelai', shortLabel: 'Mempelai' },
  { number: 4, key: 'events', label: 'Rangkaian Acara', shortLabel: 'Acara' },
  { number: 5, key: 'featuresMedia', label: 'Paket & Fitur', shortLabel: 'Paket' },
  { number: 6, key: 'review', label: 'Kontak & Konfirmasi', shortLabel: 'Konfirmasi' },
];

export const ORDER_STATUS_STEPS = [
  {
    key: 'pending_confirmation',
    label: 'Menunggu Konfirmasi',
    description: 'Konfirmasi pesanan ke WhatsApp admin agar tim kami segera memproses undangan Anda.',
  },
  {
    key: 'in_progress',
    label: 'Sedang Dikerjakan',
    description: 'Pesanan dikonfirmasi. Tim kami sedang menyusun undangan sesuai data Anda.',
  },
  {
    key: 'preview_ready',
    label: 'Siap Preview',
    description: 'Link preview telah dikirim ke WhatsApp Anda untuk pengecekan dan revisi.',
  },
  {
    key: 'published',
    label: 'Undangan Aktif',
    description: 'Undangan sudah online dan siap dibagikan kepada seluruh tamu.',
  },
];

export const ORDER_STATUS_META = {
  pending_confirmation: { label: 'Menunggu Konfirmasi', tone: 'sand' },
  pending_payment: { label: 'Menunggu Konfirmasi', tone: 'sand' },
  in_progress: { label: 'Sedang Dikerjakan', tone: 'sand' },
  preview_ready: { label: 'Siap Preview', tone: 'bronze' },
  published: { label: 'Undangan Aktif', tone: 'dark' },
  cancelled: { label: 'Dibatalkan', tone: 'muted' },
};

export function createEmptyEvent() {
  return { name: '', dateLabel: '', timeLabel: '', address: '', mapsUrl: '' };
}

export function createEmptyMepandes() {
  return { fullName: '', description: '', instagram: '' };
}

export function createEmptyLoveStory() {
  return { title: '', description: '' };
}

export function createEmptyDigitalGift() {
  return { bankName: '', accountHolder: '', accountNumber: '' };
}

export function createInitialOrderState() {
  return {
    eventType: 'pernikahan',
    hasMepandes: false,
    allowSocialMedia: null,
    themeId: '',
    groom: {
      fullName: '',
      nickname: '',
      parentDescription: '',
      address: '',
      instagram: '',
    },
    bride: {
      fullName: '',
      nickname: '',
      parentDescription: '',
      address: '',
      instagram: '',
    },
    mepandes: [],
    primaryEventDateTime: '',
    events: [createEmptyEvent()],
    packageId: ORDER_PACKAGES[0].id,
    features: {
      loveStoryEnabled: false,
      digitalGiftEnabled: false,
    },
    loveStories: [],
    digitalGifts: [],
    addons: {
      splitLink: false,
    },
    media: {
      musicUrl: '',
      videoUrl: '',
      photoDriveUrl: '',
    },
    notes: '',
    requestedSlug: '',
    isSlugEdited: false,
    contact: {
      customerName: '',
      whatsapp: '',
    },
  };
}
