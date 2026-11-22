const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
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

function formatDateLabel(dateTimeLocal) {
  if (!dateTimeLocal) return '';
  const datePart = String(dateTimeLocal).split('T')[0];
  const parts = datePart.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return '';
  const [year, month, day] = parts;
  const d = new Date(year, month - 1, day);
  if (
    Number.isNaN(d.getTime()) ||
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return '';
  }
  return `${INDONESIAN_DAYS[d.getDay()]}, ${day} ${INDONESIAN_MONTHS[month - 1]} ${year}`;
}

export const SECTION_DEFINITIONS = {
  cover: {
    type: 'cover',
    label: 'Cover & Opening',
    description: 'Sampul pembuka, panel kiri desktop, dan carousel hero.',
    defaultVisible: true,
    removable: false,
    repeatable: false,
    photoSlots: [
      { path: 'openingBg', label: 'Background Opening Cover' },
      { path: 'leftPanelBg', label: 'Background Panel Kiri (Desktop)' },
      { path: 'slides', label: 'Slide Carousel Cover', multiple: true },
    ],
    createDefaultData: () => ({
      openingSubtitle: 'The Wedding of',
      subtitle: 'THE WEDDING OF',
      title: 'Mempelai',
      dateLabel: '',
      leftDesc:
        'Suatu kehormatan bagi kami, apabila bapak/ibu/saudara/i, berkenan hadir untuk memberikan doa restu kepada putra putri kami',
      openingBg: '',
      leftPanelBg: '',
      slides: [],
    }),
  },
  quote: {
    type: 'quote',
    label: 'Kutipan & Pembuka',
    description: 'Kutipan doa / kitab suci serta salam pembuka acara.',
    defaultVisible: true,
    removable: true,
    repeatable: false,
    photoSlots: [],
    createDefaultData: () => ({
      quoteText:
        '“Ya Tuhan Yang Maha Pengasih, anugrahkanlah kepada pasangan ini tanpa terpisahkan, panjang umur, semoga pernikahan ini dianugrahkan putra-putri dan cucu yang memberi penghiburan, tinggal di rumah yang penuh kebahagiaan.”',
      quoteSource: '(Reg Weda X. 85.42)',
      greetingTitle: 'OM SWASTYASTU',
      greetingBody:
        'Atas Asung Kertha Wara Nugraha Ida Sang Hyang Widhi Wasa/Tuhan Yang Maha Esa, kami bermaksud mengundang Bapak/Ibu/Saudara/i, pada Acara Pawiwahan (Pernikahan) kami :',
    }),
  },
  couple: {
    type: 'couple',
    label: 'Profil Mempelai',
    description: 'Kartu foto penuh mempelai pria dan mempelai wanita.',
    defaultVisible: true,
    removable: false,
    repeatable: false,
    photoSlots: [
      { path: 'groom.photoUrl', label: 'Foto Mempelai Pria' },
      { path: 'bride.photoUrl', label: 'Foto Mempelai Wanita' },
    ],
    createDefaultData: () => ({
      groom: {
        fullName: '',
        nickname: '',
        relationText: 'Putra pertama dari pasangan',
        parents: '',
        address: '',
        instagram: '',
        photoUrl: '',
      },
      bride: {
        fullName: '',
        nickname: '',
        relationText: 'Putri pertama dari pasangan',
        parents: '',
        address: '',
        instagram: '',
        photoUrl: '',
      },
    }),
  },
  mepandes: {
    type: 'mepandes',
    label: 'Metatah / Mepandes',
    description: 'Daftar peserta upacara Metatah / Mepandes (opsional).',
    defaultVisible: false,
    removable: true,
    repeatable: false,
    photoSlots: [],
    createDefaultData: () => ({
      title: 'Metatah / Mepandes',
      subtitle: 'Peserta Upacara',
      participants: [],
    }),
  },
  pawiwahan: {
    type: 'pawiwahan',
    label: 'Sorotan Upacara',
    description: 'Bingkai foto arch dengan nama lengkap kedua mempelai.',
    defaultVisible: true,
    removable: true,
    repeatable: false,
    photoSlots: [{ path: 'photoUrl', label: 'Foto Bingkai Pawiwahan' }],
    createDefaultData: () => ({
      title: 'Pawiwahan',
      groomName: '',
      brideName: '',
      photoUrl: '',
      invitationText:
        'Merupakan suatu kehormatan dan kebahagiaan bagi kami sekeluarga, apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu kepada kedua mempelai pada:',
    }),
  },
  events: {
    type: 'events',
    label: 'Rangkaian Acara & Countdown',
    description: 'Detail hari, jam, lokasi acara, countdown, dan Google Maps.',
    defaultVisible: true,
    removable: false,
    repeatable: false,
    photoSlots: [],
    createDefaultData: () => ({
      title: 'ACARA KAMI',
      items: [],
    }),
  },
  love_story: {
    type: 'love_story',
    label: 'Love Story',
    description: 'Linimasa kisah cinta kedua mempelai (opsional).',
    defaultVisible: false,
    removable: true,
    repeatable: false,
    photoSlots: [],
    createDefaultData: () => ({
      title: 'Love Story',
      stories: [],
    }),
  },
  gallery: {
    type: 'gallery',
    label: 'Galeri Foto & Video',
    description: 'Video YouTube opsional dan grid foto lightbox.',
    defaultVisible: true,
    removable: true,
    repeatable: false,
    photoSlots: [{ path: 'photos', label: 'Foto Galeri', multiple: true }],
    createDefaultData: () => ({
      title: 'Our Capture Moment',
      videoUrl: '',
      photos: [],
    }),
  },
  guestbook: {
    type: 'guestbook',
    label: 'Buku Tamu & RSVP',
    description: 'Form ucapan, konfirmasi kehadiran, dan daftar doa tamu.',
    defaultVisible: true,
    removable: true,
    repeatable: false,
    photoSlots: [],
    createDefaultData: () => ({
      title: 'Buku Tamu',
      subtitle: 'Ucapkan sesuatu untuk hari bahagia kami',
    }),
  },
  gift: {
    type: 'gift',
    label: 'Wedding Gift',
    description: 'Daftar rekening atau e-wallet untuk tanda kasih (opsional).',
    defaultVisible: true,
    removable: true,
    repeatable: false,
    photoSlots: [],
    createDefaultData: () => ({
      title: 'Wedding Gift',
      description:
        'Bagi yang ingin memberikan tanda kasih kepada mempelai, Anda dapat menggunakan akun virtual atau E-wallet di bawah ini:',
      accounts: [],
    }),
  },
  custom_note: {
    type: 'custom_note',
    label: 'Catatan Tambahan',
    description: 'Section fleksibel untuk Dresscode, Live Streaming, atau Turut Mengundang.',
    defaultVisible: false,
    removable: true,
    repeatable: true,
    photoSlots: [],
    createDefaultData: () => ({
      title: 'Informasi Tambahan',
      body: '',
      buttonLabel: '',
      buttonUrl: '',
    }),
  },
  footer: {
    type: 'footer',
    label: 'Penutup & Branding',
    description: 'Ucapan terima kasih penutup dan tautan Ansel Moments.',
    defaultVisible: true,
    removable: false,
    repeatable: false,
    photoSlots: [{ path: 'bgUrl', label: 'Background Footer' }],
    createDefaultData: () => ({
      title: 'Matur Suksma',
      message:
        'Setiap ucapan dan doa yang kamu berikan, jadi bagian indah dalam cerita kami. Kami tak sabar menyambutmu di hari spesial nanti.',
      bgUrl: '',
    }),
  },
};

export const SECTION_TYPES = Object.keys(SECTION_DEFINITIONS);

export function createSectionInstance(type, overrides = {}) {
  const def = SECTION_DEFINITIONS[type];
  if (!def) {
    throw new Error(`Unknown section type: ${type}`);
  }
  const suffix = Math.random().toString(36).slice(2, 7);
  return {
    id: overrides.id || `sec-${type}-${suffix}`,
    type,
    visible: overrides.visible !== undefined ? Boolean(overrides.visible) : def.defaultVisible,
    data: {
      ...def.createDefaultData(),
      ...(overrides.data || {}),
    },
  };
}

export function buildDefaultSectionsForOrder(orderPayload = {}) {
  const inv = orderPayload.invitationData || orderPayload;
  const groom = inv.groom || {};
  const bride = inv.bride || {};
  const coupleShort =
    [groom.nickname?.trim(), bride.nickname?.trim()].filter(Boolean).join(' & ') ||
    orderPayload.customerName ||
    'Mempelai';
  const dateLabel = formatDateLabel(inv.primaryEventDateTime);
  const events = Array.isArray(inv.events) ? inv.events : [];
  const mepandesList = Array.isArray(inv.mepandes) ? inv.mepandes : [];
  const stories = Array.isArray(inv.loveStories) ? inv.loveStories : [];
  const gifts = Array.isArray(inv.digitalGifts) ? inv.digitalGifts : [];
  const features = inv.features || {};
  const hasMepandes = Boolean(orderPayload.hasMepandes ?? mepandesList.length > 0);
  const loveStoryEnabled = Boolean(features.loveStoryEnabled ?? stories.length > 0);
  const digitalGiftEnabled = Boolean(features.digitalGiftEnabled ?? gifts.length > 0);

  return [
    createSectionInstance('cover', {
      id: 'sec-cover',
      visible: true,
      data: {
        openingSubtitle: 'The Wedding of',
        subtitle: 'THE WEDDING OF',
        title: coupleShort,
        dateLabel,
      },
    }),
    createSectionInstance('quote', {
      id: 'sec-quote',
      visible: true,
    }),
    createSectionInstance('couple', {
      id: 'sec-couple',
      visible: true,
      data: {
        groom: {
          fullName: groom.fullName || '',
          nickname: groom.nickname || '',
          relationText: '',
          parents: groom.parentDescription || '',
          address: groom.address || '',
          instagram: groom.instagram || '',
          photoUrl: '',
        },
        bride: {
          fullName: bride.fullName || '',
          nickname: bride.nickname || '',
          relationText: '',
          parents: bride.parentDescription || '',
          address: bride.address || '',
          instagram: bride.instagram || '',
          photoUrl: '',
        },
      },
    }),
    createSectionInstance('mepandes', {
      id: 'sec-mepandes',
      visible: hasMepandes && mepandesList.length > 0,
      data: {
        title: 'Metatah / Mepandes',
        subtitle: 'Peserta Upacara',
        participants: mepandesList.map((p) => ({
          fullName: p.fullName || '',
          description: p.description || '',
          instagram: p.instagram || '',
        })),
      },
    }),
    createSectionInstance('pawiwahan', {
      id: 'sec-pawiwahan',
      visible: true,
      data: {
        title: 'Pawiwahan',
        groomName: groom.fullName || groom.nickname || '',
        brideName: bride.fullName || bride.nickname || '',
      },
    }),
    createSectionInstance('events', {
      id: 'sec-events',
      visible: true,
      data: {
        title: 'ACARA KAMI',
        items: events.map((ev) => ({
          name: ev.name || 'Pawiwahan',
          dateLabel: ev.dateLabel || '',
          timeLabel: ev.timeLabel || '',
          address: ev.address || '',
          mapsUrl: ev.mapsUrl || '',
        })),
      },
    }),
    createSectionInstance('love_story', {
      id: 'sec-love-story',
      visible: loveStoryEnabled && stories.length > 0,
      data: {
        title: 'Love Story',
        stories: stories.map((s) => ({
          title: s.title || '',
          description: s.description || '',
        })),
      },
    }),
    createSectionInstance('gallery', {
      id: 'sec-gallery',
      visible: true,
      data: {
        title: 'Our Capture Moment',
        videoUrl: inv.media?.videoUrl || '',
        photos: [],
      },
    }),
    createSectionInstance('guestbook', {
      id: 'sec-guestbook',
      visible: true,
    }),
    createSectionInstance('gift', {
      id: 'sec-gift',
      visible: digitalGiftEnabled && gifts.length > 0,
      data: {
        accounts: gifts.map((g) => ({
          bankName: g.bankName || '',
          accountHolder: g.accountHolder || '',
          accountNumber: g.accountNumber || '',
        })),
      },
    }),
    createSectionInstance('custom_note', {
      id: 'sec-custom-note',
      visible: false,
    }),
    createSectionInstance('footer', {
      id: 'sec-footer',
      visible: true,
    }),
  ];
}

export const TEMPLATE_RENDERERS = [
  {
    key: 'editorial-classic',
    label: 'Editorial Classic',
    folder: 'src/templates/editorial-classic',
  },
];

export function getTemplateRendererByKey(key) {
  return TEMPLATE_RENDERERS.find((renderer) => renderer.key === key) || null;
}

export const TEMPLATES = [
  {
    id: 'editorial-classic',
    rendererKey: 'editorial-classic',
    name: 'Editorial Classic',
    tag: 'Populer',
    description: 'Split-screen gelap elegan dengan tipografi serif klasik dan galeri penuh.',
    demoUrl: '/adi-eva',
    previewImage: '/assets/img/GIK-1.png',
    isActive: true,
    defaultSections: buildDefaultSectionsForOrder({}),
  },
];

export const ACTIVE_TEMPLATES = TEMPLATES.filter((template) => template.isActive);

export function getTemplateById(id) {
  return TEMPLATES.find((template) => template.id === id) || null;
}
