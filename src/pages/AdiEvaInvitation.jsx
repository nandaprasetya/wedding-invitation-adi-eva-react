import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import GLightbox from 'glightbox';
import 'glightbox/dist/css/glightbox.min.css';
import '../styles/invitation.css';

const FIREBASE_API_URL = 'https://firestore.googleapis.com/v1/projects/wedding-invitation-2b7f9/databases/(default)/documents/wedding-Adi-Eva';

const galleryImages = [
  '/assets/img/GIK-1.png',
  '/assets/img/GIK-2.jpg',
  '/assets/img/GIK-3.jpg',
  '/assets/img/GIK-4.png',
  '/assets/img/GIK-13.jpg',
  '/assets/img/GIK-13(1).jpg',
  '/assets/img/GIK-14.png',
  '/assets/img/GIK-16.jpg',
  '/assets/img/GIK-19.jpg',
  '/assets/img/GIK-23.jpg',
  '/assets/img/GIK-26.jpg',
  '/assets/img/GIK-44.jpg',
  '/assets/img/GIK-46.jpg',
  '/assets/img/GIK-51.png',
  '/assets/img/Pepotrek-4.jpg',
  '/assets/img/Pepotrek-7.jpg',
  '/assets/img/Pepotrek-17.jpg',
  '/assets/img/Pepotrek-18.jpg',
  '/assets/img/Pepotrek-19.jpg',
  '/assets/img/Pepotrek-21.jpg',
  '/assets/img/Pepotrek-23.jpg',
  '/assets/img/Pepotrek-26.jpg',
  '/assets/img/Pepotrek-28.jpg',
  '/assets/img/Pepotrek-29.jpg',
  '/assets/img/fix-GIK-1.jpg',
  '/assets/img/fix-GIK-3.jpg',
  '/assets/img/fix-GIK-5.jpg',
  '/assets/img/fix-GIK-12.jpg',
  '/assets/img/fix-GIK-13.jpg',
];

const coverSlides = [
  '/assets/img/GIK-1.png',
  '/assets/img/GIK-14.png',
  '/assets/img/GIK-4.png',
  '/assets/img/GIK-51.png'
];

export default function AdiEvaInvitation() {
  const [searchParams] = useSearchParams();
  const guestName = searchParams.get('to')?.trim() || 'Tamu Undangan';

  // Opening & Music States
  const [isOpened, setIsOpened] = useState(false);
  const [isOpeningHidden, setIsOpeningHidden] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = useRef(null);

  // Cover Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);

  // Video State (Loaded on Demand & Fullscreen Modal)
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // Countdown State
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Guestbook States
  const [wishes, setWishes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [formName, setFormName] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formAttendance, setFormAttendance] = useState('Hadir (accept with pleasure)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const itemsPerPage = 5;

  // Gift Section States
  const [isGiftVisible, setIsGiftVisible] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  // Background Carousel Effect
  useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % coverSlides.length);
    }, 4000);
    return () => clearInterval(slideInterval);
  }, []);

  // Countdown Timer Effect (Target: 19 Agustus 2026 15:00 WITA)
  useEffect(() => {
    const targetDate = new Date('2026-08-19T15:00:00+08:00').getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  // Initialize GLightbox
  useEffect(() => {
    const lightbox = GLightbox({
      selector: '.glightbox',
      touchNavigation: true,
      loop: true,
      zoomable: true,
      width: '100vw',
      height: '100vh',
      openEffect: 'zoom',
      closeEffect: 'zoom'
    });
    return () => {
      lightbox.destroy();
    };
  }, []);

  // Load Wishes from Firestore REST API
  const loadWishes = async () => {
    try {
      const res = await fetch(FIREBASE_API_URL);
      if (!res.ok) return;
      const data = await res.json();
      const docs = data.documents || [];
      docs.sort((a, b) => new Date(b.createTime || 0) - new Date(a.createTime || 0));
      setWishes(docs);
    } catch (err) {
      console.error('Error fetching wishes:', err);
    }
  };

  useEffect(() => {
    loadWishes();
  }, []);

  // Handle Open Invitation Button Click
  const handleOpenInvitation = () => {
    setIsOpened(true);
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        setIsMusicPlaying(true);
      }).catch((err) => {
        console.log('Audio autoplay blocked:', err);
      });
    }
    setTimeout(() => {
      setIsOpeningHidden(true);
    }, 1200);
  };

  // Toggle Music Play/Pause
  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (isMusicPlaying) {
      audioRef.current.pause();
      setIsMusicPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsMusicPlaying(true);
      }).catch((err) => console.log('Audio error:', err));
    }
  };

  // Handle Play Video (Pause Music & Open Fullscreen Video Modal)
  const handlePlayVideo = () => {
    setIsVideoLoaded(true);
    setIsVideoModalOpen(true);
    if (audioRef.current && isMusicPlaying) {
      audioRef.current.pause();
      setIsMusicPlaying(false);
    }
  };

  const handleCloseVideoModal = () => {
    setIsVideoModalOpen(false);
  };

  // Guestbook Form Submit Handler
  const handleGuestbookSubmit = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formMessage.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        fields: {
          nama: { stringValue: formName.trim() },
          ucapan: { stringValue: formMessage.trim() },
          konfirmasi: { stringValue: formAttendance }
        }
      };

      const res = await fetch(FIREBASE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to post wish');

      setFormName('');
      setFormMessage('');
      setFormAttendance('Hadir (accept with pleasure)');
      await loadWishes();
      setCurrentPage(1);
    } catch (err) {
      console.error('Error sending wish:', err);
      alert('Gagal mengirim ucapan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper: Copy to Clipboard
  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Helper: Relative Time Format
  const getRelativeTime = (dateString) => {
    if (!dateString) return 'Baru saja';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Baru saja';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} jam lalu`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays} hari lalu`;
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} bulan lalu`;
  };

  // Guestbook Pagination Slicing
  const totalPages = Math.ceil(wishes.length / itemsPerPage);
  const paginatedWishes = wishes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      {/* Opening Cover Screen Overlay */}
      {!isOpeningHidden && (
        <div
          className={`opening-screen ${isOpened ? 'slide-up' : ''}`}
          style={{ backgroundImage: "url('/assets/img/GIK-1.png')" }}
        >
          <div className="opening-overlay"></div>
          <div className="opening-content">
            <p className="opening-subtitle">The Wedding of</p>
            <h1 className="opening-title">ADI &amp; EVA</h1>

            <div className="opening-guest-box">
              <p className="opening-guest-label">Special Invitation to</p>
              <h2 className="opening-guest-name">{guestName}</h2>
              <p className="opening-apology">Mohon maaf apabila ada kesalahan penulisan nama/gelar</p>
            </div>

            <button className="btn-open-invitation" type="button" onClick={handleOpenInvitation}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <span>Buka Undangan</span>
            </button>
          </div>
        </div>
      )}

      {/* Audio Element & Floating Music Control */}
      <audio ref={audioRef} loop src="/assets/music/backsound-fix.mp3" preload="auto" />

      <button
        className={`btn-music-toggle ${!isOpened ? 'hidden' : ''} ${isMusicPlaying ? 'spinning' : ''}`}
        type="button"
        aria-label="Toggle Music"
        onClick={toggleMusic}
      >
        {isMusicPlaying ? (
          <svg className="music-icon" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
        ) : (
          <svg className="music-icon" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        )}
      </button>

      {/* Main Outer Layout */}
      <div className="outer-page">
        {/* Desktop Left Sticky Panel */}
        <div className="left-page" style={{ backgroundImage: "url('/assets/img/GIK-1.png')" }}>
          <div className="left-page-overlay"></div>
          <div className="left-page-content">
            <p className="left-subtitle">THE WEDDING OF</p>
            <h1 className="left-title">Adi &amp; Eva</h1>
            <p className="left-desc">
              Suatu kehormatan bagi kami, apabila bapak/ibu/sodara/i, berkenan hadir untuk memberikan doa restu kepada putra putri kami
            </p>
          </div>
        </div>

        {/* Right Scrollable Content Panel */}
        <div className="right-page">
          {/* Cover Carousel Section */}
          <div className="section-cover">
            <div className="carousel-container">
              {coverSlides.map((slide, idx) => (
                <div
                  key={idx}
                  className={`slide ${idx === currentSlide ? 'active' : ''}`}
                  style={{ backgroundImage: `url('${slide}')` }}
                />
              ))}
            </div>
            <div className="carousel-overlay"></div>
            <div className="content-overlay">
              <div className="header-section">
                <p className="subtitle">THE WEDDING OF</p>
                <h1 className="title">Adi &amp; Eva</h1>
                <p className="date">Rabu, 19 Agustus 2026</p>
              </div>
              <div className="guest-section">
                <p className="dear">Dear</p>
                <h2 className="guest-name">{guestName}</h2>
              </div>
            </div>
          </div>

          {/* Quote & Om Swastyastu Section */}
          <div className="section-quote">
            <div className="quote-container">
              <p className="quote-text">
                “Ya Tuhan Yang Maha Pengasih, anugrahkanlah kepada pasangan ini tanpa terpisahkan, panjang umur, semoga pernikahan ini dianugrahkan putra-putri dan cucu yang memberi penghiburan, tinggal di rumah yang penuh kebahagiaan.”
              </p>
              <p className="quote-source">(Reg Weda X. 85.42)</p>

              <h2 className="greeting-title">OM SWASTYASTU</h2>

              <p className="greeting-text">
                Atas Asung Kertha Wara Nugraha Ida Sang Hyang Widhi Wasa/Tuhan Yang Maha Esa, kami bermaksud mengundang Bapak/Ibu/Saudara/i, pada Acara Pawiwahan (Pernikahan) kami :
              </p>
            </div>
          </div>

          {/* Couple Section (Mempelai Pria & Wanita) */}
          <div className="section-couple">
            {/* Mempelai Pria */}
            <div className="couple-card groom-card" style={{ backgroundImage: "url('/assets/img/GIK.jpg')" }}>
              <div className="couple-overlay"></div>
              <div className="couple-info groom-info">
                <h2 className="couple-name">I Gede Adi Wijaya</h2>
                <p className="couple-relation">Putra pertama dari pasangan</p>
                <p className="couple-parents">
                  Bpk. I Nyoman Sukra<br />&amp; Ibu Ni Wayan Darsih
                </p>
                <p className="couple-address">Link Gadon GG Manggis No 4</p>
              </div>
            </div>

            {/* Mempelai Wanita */}
            <div className="couple-card bride-card" style={{ backgroundImage: "url('/assets/img/GIK-10.jpg')" }}>
              <div className="couple-overlay"></div>
              <div className="couple-info bride-info">
                <h2 className="couple-name">Putu Eva Cahyani</h2>
                <p className="couple-relation">Putri pertama dari pasangan</p>
                <p className="couple-parents">
                  Bpk. I Nyoman Kertiyasa<br />&amp; Ibu Dewa Ayu Citrawati
                </p>
                <p className="couple-address">Sesetan, Denpasar Selatan</p>
              </div>
            </div>
          </div>

          {/* Pawiwahan Section */}
          <div className="section-pawiwahan">
            <div className="pawiwahan-container">
              <h2 className="pawiwahan-title">Pawiwahan</h2>

              <div className="pawiwahan-names">
                <p className="pawiwahan-name">I Gede Adi Wijaya</p>
                <p className="pawiwahan-amp">&amp;</p>
                <p className="pawiwahan-name">Putu Eva Cahyani</p>
              </div>

              <div className="pawiwahan-photo-frame" style={{ backgroundImage: "url('/assets/img/GIK-2.jpg')" }}></div>

              <p className="pawiwahan-invitation">
                Merupakan suatu kehormatan dan kebahagiaan bagi kami sekeluarga, apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu kepada kedua mempelai pada:
              </p>
            </div>
          </div>

          {/* Event Section (Acara Kami) */}
          <div className="section-event">
            <div className="event-container">
              <h2 className="event-title">ACARA KAMI</h2>

              <div className="event-grid">
                <div className="grid-cell cell-day">
                  <p>RABU</p>
                </div>
                <div className="grid-cell cell-time">
                  <p className="label">Pukul</p>
                  <p className="val">15.00 WITA – Selesai</p>
                </div>
                <div className="grid-cell cell-date">
                  <p className="date-num">19</p>
                  <p className="month-year">AGUSTUS 2026</p>
                </div>
                <div className="grid-cell cell-location">
                  <p className="loc-title">Jalan Raya Gadon, Gg Manggis No 4</p>
                  <p className="loc-desc">Lokasi Upacara</p>
                </div>
              </div>

              {/* Countdown Timer */}
              <div className="countdown-container">
                <div className="cd-item">
                  <span className="cd-num">{timeLeft.days}</span>
                  <span className="cd-label">Days</span>
                </div>
                <div className="cd-item">
                  <span className="cd-num">{timeLeft.hours}</span>
                  <span className="cd-label">Hours</span>
                </div>
                <div className="cd-item">
                  <span className="cd-num">{timeLeft.minutes}</span>
                  <span className="cd-label">Minutes</span>
                </div>
                <div className="cd-item">
                  <span className="cd-num">{timeLeft.seconds}</span>
                  <span className="cd-label">Seconds</span>
                </div>
              </div>

              {/* Google Maps Link */}
              <div className="maps-wrapper">
                <hr className="maps-divider" />
                <a
                  href="https://maps.app.goo.gl/hG8v8ggMFQ8XfUv5A"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="maps-button"
                >
                  GOOGLE MAPS
                </a>
                <hr className="maps-divider" />
              </div>
            </div>
          </div>

          {/* Gallery Section */}
          <div className="section-gallery">
            <div className="gallery-container">
              <h2 className="gallery-title">Our Capture Moment</h2>

              {/* Video Player Poster (Loaded on Demand & Opens Fullscreen) */}
              <div className="gallery-video-wrapper">
                <div
                  className="gallery-video-poster"
                  onClick={handlePlayVideo}
                >
                  <img
                    src="https://img.youtube.com/vi/SokqIN0Fj0c/maxresdefault.jpg"
                    onError={(e) => { e.target.src = '/assets/img/GIK-13.jpg'; }}
                    alt="Wedding Video Thumbnail"
                    className="video-poster-img"
                  />
                  <div className="video-poster-overlay">
                    <button className="video-play-btn" aria-label="Play Video">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="36" height="36">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div className="gallery-grid">
                {galleryImages.map((imgSrc, index) => (
                  <a
                    key={index}
                    href={imgSrc}
                    className="glightbox gallery-item"
                    data-gallery="wedding-gallery"
                  >
                    <img src={imgSrc} alt={`Capture Moment ${index + 1}`} loading="lazy" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Guestbook Section */}
          <div className="section-guestbook">
            <div className="guestbook-container">
              <h2 className="guestbook-title">Buku Tamu</h2>
              <p className="guestbook-subtitle">Ucapkan sesuatu untuk hari bahagia kami</p>

              <div className="guestbook-card">
                <div className="gb-card-header">
                  <span>{wishes.length} Wishes (Wishes)</span>
                </div>

                <form className="gb-form" onSubmit={handleGuestbookSubmit}>
                  <input
                    type="text"
                    className="gb-input"
                    placeholder="Nama (name)"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />

                  <div className="gb-textarea-wrapper">
                    <textarea
                      className="gb-textarea"
                      placeholder="Ucapan (wishes)"
                      maxLength={500}
                      rows={3}
                      value={formMessage}
                      onChange={(e) => setFormMessage(e.target.value)}
                      required
                    />
                    <span className="gb-char-counter">{500 - formMessage.length}</span>
                  </div>

                  <select
                    className="gb-select"
                    value={formAttendance}
                    onChange={(e) => setFormAttendance(e.target.value)}
                    required
                  >
                    <option value="Hadir (accept with pleasure)">Hadir (accept with pleasure)</option>
                    <option value="Tidak Hadir">Tidak Hadir</option>
                    <option value="Ragu-ragu">Ragu-ragu</option>
                  </select>

                  <button type="submit" className="gb-btn-send" disabled={isSubmitting}>
                    {isSubmitting ? 'Mengirim...' : 'Kirim (Send)'}
                  </button>
                </form>

                {/* Wishes List */}
                <div className="wishes-list">
                  {paginatedWishes.map((doc, idx) => {
                    const fields = doc.fields || {};
                    const name = fields.nama?.stringValue || 'Tamu Undangan';
                    const ucapan = fields.ucapan?.stringValue || '';
                    const konfirmasi = fields.konfirmasi?.stringValue || 'Hadir';
                    const relativeTime = getRelativeTime(doc.createTime);

                    return (
                      <div key={doc.name || idx} className="wish-item">
                        <div className="wish-header">
                          <span className="wish-name">{name}</span>
                          <span className="wish-badge">
                            <i className="check-icon">✓</i> {konfirmasi}
                          </span>
                        </div>
                        <p className="wish-time">{relativeTime}</p>
                        <p className="wish-text">{ucapan}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="gb-pagination">
                    <span
                      className={`page-nav ${currentPage === 1 ? 'disabled' : ''}`}
                      onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                    >
                      &laquo; Previous
                    </span>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <span
                        key={pageNum}
                        className={`page-num ${pageNum === currentPage ? 'active' : ''}`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </span>
                    ))}
                    <span
                      className={`page-nav ${currentPage === totalPages ? 'disabled' : ''}`}
                      onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                    >
                      Next &raquo;
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Wedding Gift Section */}
          <div className="section-gift">
            <div className="gift-container">
              <h2 className="gift-title">Wedding Gift</h2>
              <p className="gift-desc">
                Bagi yang ingin memberikan tanda kasih kepada mempelai, Anda dapat menggunakan akun virtual atau E-wallet di bawah ini:
              </p>

              <button
                className="btn-toggle-gift"
                type="button"
                onClick={() => setIsGiftVisible(!isGiftVisible)}
              >
                <svg className="eye-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {isGiftVisible ? (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </>
                  )}
                </svg>
                <span>{isGiftVisible ? 'Sembunyikan Rekening' : 'Tampilkan Rekening'}</span>
              </button>

              {isGiftVisible && (
                <div className="gift-cards-container">
                  {/* Card Bank BNI - I Gede Adi Wijaya (Urutan 1) */}
                  <div className="gift-card">
                    <div className="card-content">
                      <h3 className="bank-name">Bank BNI</h3>
                      <p className="acc-label">No Rekening</p>
                      <p className="acc-number">0700899045</p>
                      <p className="acc-holder">I Gede Adi Wijaya</p>
                      <div className="card-divider"></div>
                    </div>
                    <button
                      className={`btn-copy ${copiedId === 'adi' ? 'copied' : ''}`}
                      type="button"
                      title="Salin Nomor Rekening"
                      onClick={() => copyToClipboard('0700899045', 'adi')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                      <span className="copy-tooltip">Disalin!</span>
                    </button>
                  </div>

                  {/* Card Bank BNI - Putu Eva Cahyani (Urutan 2) */}
                  <div className="gift-card">
                    <div className="card-content">
                      <h3 className="bank-name">Bank BNI</h3>
                      <p className="acc-label">No Rekening</p>
                      <p className="acc-number">1937397663</p>
                      <p className="acc-holder">Putu Eva Cahyani</p>
                      <div className="card-divider"></div>
                    </div>
                    <button
                      className={`btn-copy ${copiedId === 'eva' ? 'copied' : ''}`}
                      type="button"
                      title="Salin Nomor Rekening"
                      onClick={() => copyToClipboard('1937397663', 'eva')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                      <span className="copy-tooltip">Disalin!</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Section */}
          <div className="section-footer" style={{ backgroundImage: "url('/assets/img/GIK-1.png')" }}>
            <div className="footer-overlay"></div>
            <div className="footer-content">
              <h2 className="footer-title">Matur Suksma</h2>
              <p className="footer-desc">
                Setiap ucapan dan doa yang kamu berikan, jadi bagian indah dalam cerita kami. Kami tak sabar menyambutmu di hari spesial nanti.
              </p>

              <div className="footer-branding">
                <p className="creator-text">created by anselmoments</p>

                <div className="social-links">
                  <a href="https://www.instagram.com/by.anselmoments/" target="_blank" rel="noopener noreferrer" className="social-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                    </svg>
                    <span>@by.anselmoments</span>
                  </a>

                  <a href="https://instagram.com/anselphotobooth" target="_blank" rel="noopener noreferrer" className="social-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                    </svg>
                    <span>@anselphotobooth</span>
                  </a>

                  <a href="https://tiktok.com/@anselphotobooth" target="_blank" rel="noopener noreferrer" className="social-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>
                    </svg>
                    <span>@anselphotobooth</span>
                  </a>

                  <a href="https://wa.me/6285700848786" target="_blank" rel="noopener noreferrer" className="social-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    <span>+6285700848786</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Video Modal */}
      {isVideoModalOpen && (
        <div className="video-modal-overlay" onClick={handleCloseVideoModal}>
          <div className="video-modal-container" onClick={(e) => e.stopPropagation()}>
            <button className="video-modal-close" onClick={handleCloseVideoModal} aria-label="Close Video">
              ✕
            </button>
            <iframe
              className="video-modal-element video-modal-iframe"
              src="https://www.youtube.com/embed/SokqIN0Fj0c?autoplay=1&rel=0"
              title="Wedding Video - Adi & Eva"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </>
  );
}
