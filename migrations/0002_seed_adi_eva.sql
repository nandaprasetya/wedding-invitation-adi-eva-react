-- Seed initial packages & add-ons (harga 0 = Free, dapat diubah kapan saja lewat /admin)
INSERT OR IGNORE INTO packages (
  id, kind, name, price, duration_months, is_recommended, summary, features_json, is_active, sort_order
) VALUES
  (
    'premium',
    'package',
    'Premium',
    0,
    12,
    1,
    'Aktif 1 tahun, seluruh fitur lengkap tanpa batas tamu.',
    '["Custom nama tamu tanpa batas","Galeri foto, video YouTube & musik latar","Buku tamu, RSVP & Google Maps","Love Story & Amplop Digital"]',
    1,
    1
  ),
  (
    'standard',
    'package',
    'Standard',
    0,
    6,
    0,
    'Aktif 6 bulan, fitur inti undangan digital modern.',
    '["Custom nama tamu tanpa batas","Galeri foto & musik latar","Buku tamu, RSVP & Google Maps","Hitung mundur acara"]',
    1,
    2
  ),
  (
    'split_link',
    'addon',
    'Split Link',
    0,
    NULL,
    0,
    'Buat 2 link undangan berbeda dari 1 pesanan. Cocok untuk membedakan info acara antara tamu umum dan keluarga dekat.',
    '[]',
    1,
    3
  );

-- Seed default music preset
INSERT OR IGNORE INTO music_presets (
  id, title, artist, category, r2_key, public_url, is_active
) VALUES (
  'backsound-adi-eva',
  'Backsound Pawiwahan Klasik',
  'Ansel Moments',
  'romantis',
  'presets/backsound-adi-eva.mp3',
  '/assets/music/backsound-fix.mp3',
  1
);

-- Seed Adi & Eva as dynamic invitation #1
INSERT OR IGNORE INTO invitations (
  id,
  order_id,
  slug,
  template_id,
  status,
  preview_token,
  title,
  event_datetime,
  music_url,
  music_preset_id,
  share_template,
  og_title,
  og_description,
  og_image_url,
  sections_json,
  published_at
) VALUES (
  'inv-adi-eva',
  NULL,
  'adi-eva',
  'editorial-classic',
  'published',
  'prev-adi-eva-9f8b2a',
  'Adi & Eva',
  '2026-08-19T15:00:00+08:00',
  '/assets/music/backsound-fix.mp3',
  'backsound-adi-eva',
  '               Kepada Yth.
*{{guestName}}*

*OM SWASTYASTU*,
Atas asung kerta wara nugraha Ida Sang Hyang Widhi Wasa, tanpa mengurangi rasa hormat, karena keterbatasan jarak dan waktu, kami bermaksud mengundang Bapak/Ibu/Saudara/i dalam Upacara Manusa Yadnya Pawiwahan (Pernikahan).

Undangan dapat dilihat dengan mengklik link dibawah ini :
{{link}}

Suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i dan teman-teman dapat hadir pada acara kami dan memberikan doa restu.🙏

Terima kasih.
OM SHANTI, SHANTI, SHANTI OM',
  'Undangan Pernikahan Adi & Eva',
  'Rabu, 19 Agustus 2026 — Pawiwahan I Gede Adi Wijaya & Putu Eva Cahyani',
  '/assets/img/GIK-1.png',
  '[
    {
      "id": "sec-cover",
      "type": "cover",
      "visible": true,
      "data": {
        "openingSubtitle": "The Wedding of",
        "subtitle": "THE WEDDING OF",
        "title": "Adi & Eva",
        "dateLabel": "Rabu, 19 Agustus 2026",
        "leftDesc": "Suatu kehormatan bagi kami, apabila bapak/ibu/sodara/i, berkenan hadir untuk memberikan doa restu kepada putra putri kami",
        "openingBg": "/assets/img/GIK-1.png",
        "leftPanelBg": "/assets/img/GIK-1.png",
        "slides": [
          "/assets/img/GIK-1.png",
          "/assets/img/GIK-14.png",
          "/assets/img/GIK-4.png",
          "/assets/img/GIK-51.png"
        ]
      }
    },
    {
      "id": "sec-quote",
      "type": "quote",
      "visible": true,
      "data": {
        "quoteText": "“Ya Tuhan Yang Maha Pengasih, anugrahkanlah kepada pasangan ini tanpa terpisahkan, panjang umur, semoga pernikahan ini dianugrahkan putra-putri dan cucu yang memberi penghiburan, tinggal di rumah yang penuh kebahagiaan.”",
        "quoteSource": "(Reg Weda X. 85.42)",
        "greetingTitle": "OM SWASTYASTU",
        "greetingBody": "Atas Asung Kertha Wara Nugraha Ida Sang Hyang Widhi Wasa/Tuhan Yang Maha Esa, kami bermaksud mengundang Bapak/Ibu/Saudara/i, pada Acara Pawiwahan (Pernikahan) kami :"
      }
    },
    {
      "id": "sec-couple",
      "type": "couple",
      "visible": true,
      "data": {
        "groom": {
          "fullName": "I Gede Adi Wijaya",
          "nickname": "Adi",
          "relationText": "Putra pertama dari pasangan",
          "parents": "Bpk. I Nyoman Sukra\n& Ibu Ni Wayan Darsih",
          "address": "Link Gadon GG Manggis No 4",
          "instagram": "",
          "photoUrl": "/assets/img/GIK.jpg"
        },
        "bride": {
          "fullName": "Putu Eva Cahyani",
          "nickname": "Eva",
          "relationText": "Putri pertama dari pasangan",
          "parents": "Bpk. I Nyoman Kertiyasa\n& Ibu Dewa Ayu Citrawati",
          "address": "Sesetan, Denpasar Selatan",
          "instagram": "",
          "photoUrl": "/assets/img/GIK-10.jpg"
        }
      }
    },
    {
      "id": "sec-mepandes",
      "type": "mepandes",
      "visible": false,
      "data": {
        "title": "Metatah / Mepandes",
        "subtitle": "Peserta Upacara",
        "participants": []
      }
    },
    {
      "id": "sec-pawiwahan",
      "type": "pawiwahan",
      "visible": true,
      "data": {
        "title": "Pawiwahan",
        "groomName": "I Gede Adi Wijaya",
        "brideName": "Putu Eva Cahyani",
        "photoUrl": "/assets/img/GIK-2.jpg",
        "invitationText": "Merupakan suatu kehormatan dan kebahagiaan bagi kami sekeluarga, apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu kepada kedua mempelai pada:"
      }
    },
    {
      "id": "sec-events",
      "type": "events",
      "visible": true,
      "data": {
        "title": "ACARA KAMI",
        "items": [
          {
            "name": "Pawiwahan",
            "dateLabel": "Rabu, 19 Agustus 2026",
            "timeLabel": "Pukul 15.00 WITA – Selesai",
            "address": "Jalan Raya Gadon, Gg Manggis No 4",
            "locationLabel": "Lokasi Upacara",
            "mapsUrl": "https://maps.app.goo.gl/hG8v8ggMFQ8XfUv5A"
          }
        ]
      }
    },
    {
      "id": "sec-love-story",
      "type": "love_story",
      "visible": false,
      "data": {
        "title": "Love Story",
        "stories": []
      }
    },
    {
      "id": "sec-gallery",
      "type": "gallery",
      "visible": true,
      "data": {
        "title": "Our Capture Moment",
        "videoUrl": "https://www.youtube.com/watch?v=SokqIN0Fj0c",
        "photos": [
          "/assets/img/GIK-1.png",
          "/assets/img/GIK-2.jpg",
          "/assets/img/GIK-3.jpg",
          "/assets/img/GIK-4.png",
          "/assets/img/GIK-13.jpg",
          "/assets/img/GIK-13(1).jpg",
          "/assets/img/GIK-14.png",
          "/assets/img/GIK-16.jpg",
          "/assets/img/GIK-19.jpg",
          "/assets/img/GIK-23.jpg",
          "/assets/img/GIK-26.jpg",
          "/assets/img/GIK-44.jpg",
          "/assets/img/GIK-46.jpg",
          "/assets/img/GIK-51.png",
          "/assets/img/Pepotrek-4.jpg",
          "/assets/img/Pepotrek-7.jpg",
          "/assets/img/Pepotrek-17.jpg",
          "/assets/img/Pepotrek-18.jpg",
          "/assets/img/Pepotrek-19.jpg",
          "/assets/img/Pepotrek-21.jpg",
          "/assets/img/Pepotrek-23.jpg",
          "/assets/img/Pepotrek-26.jpg",
          "/assets/img/Pepotrek-28.jpg",
          "/assets/img/Pepotrek-29.jpg",
          "/assets/img/fix-GIK-1.jpg",
          "/assets/img/fix-GIK-3.jpg",
          "/assets/img/fix-GIK-5.jpg",
          "/assets/img/fix-GIK-12.jpg",
          "/assets/img/fix-GIK-13.jpg"
        ]
      }
    },
    {
      "id": "sec-guestbook",
      "type": "guestbook",
      "visible": true,
      "data": {
        "title": "Buku Tamu",
        "subtitle": "Ucapkan sesuatu untuk hari bahagia kami"
      }
    },
    {
      "id": "sec-gift",
      "type": "gift",
      "visible": true,
      "data": {
        "title": "Wedding Gift",
        "description": "Bagi yang ingin memberikan tanda kasih kepada mempelai, Anda dapat menggunakan akun virtual atau E-wallet di bawah ini:",
        "accounts": [
          {
            "bankName": "Bank BNI",
            "accountNumber": "0700899045",
            "accountHolder": "I Gede Adi Wijaya"
          },
          {
            "bankName": "Bank BNI",
            "accountNumber": "1937397663",
            "accountHolder": "Putu Eva Cahyani"
          }
        ]
      }
    },
    {
      "id": "sec-footer",
      "type": "footer",
      "visible": true,
      "data": {
        "title": "Matur Suksma",
        "message": "Setiap ucapan dan doa yang kamu berikan, jadi bagian indah dalam cerita kami. Kami tak sabar menyambutmu di hari spesial nanti.",
        "bgUrl": "/assets/img/GIK-1.png"
      }
    }
  ]',
  CURRENT_TIMESTAMP
);
