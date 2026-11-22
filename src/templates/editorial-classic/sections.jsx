import React, { useEffect, useState } from 'react';
import { extractYoutubeId } from '../../utils/orderHelpers';

export { extractYoutubeId };

function renderMultiline(text) {
  const lines = String(text || '').split('\n');
  return lines.map((line, idx) => (
    <React.Fragment key={idx}>
      {line}
      {idx < lines.length - 1 && <br />}
    </React.Fragment>
  ));
}

function parseEventDateParts(item = {}) {
  if (item.dayLabel && item.dateNum && item.monthYear) {
    return {
      day: item.dayLabel,
      dateNum: item.dateNum,
      monthYear: item.monthYear,
    };
  }
  const raw = String(item.dateLabel || '').trim();
  if (!raw) {
    return { day: 'ACARA', dateNum: '-', monthYear: '' };
  }
  const commaParts = raw.split(',');
  const dayPart = commaParts.length > 1 ? commaParts[0].trim().toUpperCase() : 'HARI';
  const rest = (commaParts.length > 1 ? commaParts.slice(1).join(',') : raw).trim();
  const tokens = rest.split(/\s+/).filter(Boolean);
  if (tokens.length >= 3 && /^\d{1,2}$/.test(tokens[0])) {
    return {
      day: dayPart,
      dateNum: tokens[0],
      monthYear: tokens.slice(1).join(' ').toUpperCase(),
    };
  }
  return {
    day: dayPart,
    dateNum: tokens[0] || '-',
    monthYear: tokens.slice(1).join(' ').toUpperCase(),
  };
}

function splitTimeLabel(rawTime) {
  const value = String(rawTime || '').trim();
  if (!value) return { label: 'Pukul', val: '-' };
  if (/^pukul\s+/i.test(value)) {
    return { label: 'Pukul', val: value.replace(/^pukul\s+/i, '') };
  }
  return { label: 'Pukul', val: value };
}

function getRelativeTime(dateString) {
  if (!dateString) return 'Baru saja';
  const normalized =
    typeof dateString === 'string' && !dateString.includes('T') && !dateString.endsWith('Z')
      ? `${dateString.replace(' ', 'T')}Z`
      : dateString;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return 'Baru saja';
  const diffInSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return 'Baru saja';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} jam lalu`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} hari lalu`;
  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} bulan lalu`;
}

export function CoverSection({ data = {}, guestName }) {
  const slides =
    Array.isArray(data.slides) && data.slides.length > 0
      ? data.slides
      : [data.openingBg || data.leftPanelBg].filter(Boolean);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <div className="section-cover">
      <div className="carousel-container">
        {slides.map((slide, idx) => (
          <div
            key={`${slide}-${idx}`}
            className={`slide ${idx === currentSlide ? 'active' : ''}`}
            style={{ backgroundImage: `url('${slide}')` }}
          />
        ))}
      </div>
      <div className="carousel-overlay"></div>
      <div className="content-overlay">
        <div className="header-section">
          <p className="subtitle">{data.subtitle || 'THE WEDDING OF'}</p>
          <h1 className="title">{data.title || 'Mempelai'}</h1>
          {data.dateLabel && <p className="date">{data.dateLabel}</p>}
        </div>
        <div className="guest-section">
          <p className="dear">Dear</p>
          <h2 className="guest-name">{guestName}</h2>
        </div>
      </div>
    </div>
  );
}

export function QuoteSection({ data = {} }) {
  return (
    <div className="section-quote">
      <div className="quote-container">
        {data.quoteText && <p className="quote-text">{data.quoteText}</p>}
        {data.quoteSource && <p className="quote-source">{data.quoteSource}</p>}
        {data.greetingTitle && <h2 className="greeting-title">{data.greetingTitle}</h2>}
        {data.greetingBody && <p className="greeting-text">{data.greetingBody}</p>}
      </div>
    </div>
  );
}

export function CoupleSection({ data = {} }) {
  const groom = data.groom || {};
  const bride = data.bride || {};

  return (
    <div className="section-couple">
      <div
        className="couple-card groom-card"
        style={groom.photoUrl ? { backgroundImage: `url('${groom.photoUrl}')` } : { backgroundColor: '#1f1d1a' }}
      >
        <div className="couple-overlay"></div>
        <div className="couple-info groom-info">
          <h2 className="couple-name">{groom.fullName || groom.nickname || 'Mempelai Pria'}</h2>
          {groom.relationText && <p className="couple-relation">{groom.relationText}</p>}
          {groom.parents && <p className="couple-parents">{renderMultiline(groom.parents)}</p>}
          {groom.address && <p className="couple-address">{groom.address}</p>}
          {groom.instagram && (
            <a
              className="couple-ig"
              href={`https://instagram.com/${groom.instagram.replace(/^@+/, '')}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              @{groom.instagram.replace(/^@+/, '')}
            </a>
          )}
        </div>
      </div>

      <div
        className="couple-card bride-card"
        style={bride.photoUrl ? { backgroundImage: `url('${bride.photoUrl}')` } : { backgroundColor: '#24211d' }}
      >
        <div className="couple-overlay"></div>
        <div className="couple-info bride-info">
          <h2 className="couple-name">{bride.fullName || bride.nickname || 'Mempelai Wanita'}</h2>
          {bride.relationText && <p className="couple-relation">{bride.relationText}</p>}
          {bride.parents && <p className="couple-parents">{renderMultiline(bride.parents)}</p>}
          {bride.address && <p className="couple-address">{bride.address}</p>}
          {bride.instagram && (
            <a
              className="couple-ig"
              href={`https://instagram.com/${bride.instagram.replace(/^@+/, '')}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              @{bride.instagram.replace(/^@+/, '')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function MepandesSection({ data = {} }) {
  const participants = Array.isArray(data.participants) ? data.participants : [];
  if (participants.length === 0) return null;

  return (
    <div className="section-mepandes">
      <div className="editorial-subcontainer">
        <h2 className="editorial-script-title">{data.title || 'Metatah / Mepandes'}</h2>
        {data.subtitle && <p className="editorial-sublabel">{data.subtitle}</p>}
        <div className="mepandes-list">
          {participants.map((person, idx) => (
            <div key={idx} className="mepandes-card">
              <h3 className="mepandes-name">{person.fullName}</h3>
              {person.description && <p className="mepandes-desc">{person.description}</p>}
              {person.instagram && (
                <a
                  className="mepandes-ig"
                  href={`https://instagram.com/${person.instagram.replace(/^@+/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  @{person.instagram.replace(/^@+/, '')}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PawiwahanSection({ data = {} }) {
  return (
    <div className="section-pawiwahan">
      <div className="pawiwahan-container">
        <h2 className="pawiwahan-title">{data.title || 'Pawiwahan'}</h2>

        <div className="pawiwahan-names">
          <p className="pawiwahan-name">{data.groomName}</p>
          <p className="pawiwahan-amp">&amp;</p>
          <p className="pawiwahan-name">{data.brideName}</p>
        </div>

        {data.photoUrl && (
          <div
            className="pawiwahan-photo-frame"
            style={{ backgroundImage: `url('${data.photoUrl}')` }}
          ></div>
        )}

        {data.invitationText && <p className="pawiwahan-invitation">{data.invitationText}</p>}
      </div>
    </div>
  );
}

export function EventsSection({ data = {}, eventDatetime }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const targetRaw = data.countdownTarget || eventDatetime;

  useEffect(() => {
    if (!targetRaw) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return undefined;
    }
    const hasOffset = /[Z+-]\d{2}:?\d{2}$/.test(String(targetRaw)) || String(targetRaw).endsWith('Z');
    const parsedDate = new Date(hasOffset ? targetRaw : `${targetRaw}+08:00`);
    const targetTime = parsedDate.getTime();
    if (Number.isNaN(targetTime)) return undefined;

    const updateTimer = () => {
      const distance = targetTime - Date.now();
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
  }, [targetRaw]);

  const items = Array.isArray(data.items) ? data.items : [];

  return (
    <div className="section-event">
      <div className="event-container">
        <h2 className="event-title">{data.title || 'ACARA KAMI'}</h2>

        {items.map((item, idx) => {
          const { day, dateNum, monthYear } = parseEventDateParts(item);
          const { label, val } = splitTimeLabel(item.timeLabel);
          const showItemHeading = items.length > 1 || Boolean(item.showName);

          return (
            <div key={idx} className="event-item-block">
              {showItemHeading && item.name && <h3 className="event-item-name">{item.name}</h3>}
              <div className="event-grid">
                <div className="grid-cell cell-day">
                  <p>{day}</p>
                </div>
                <div className="grid-cell cell-time">
                  <p className="label">{label}</p>
                  <p className="val">{val}</p>
                </div>
                <div className="grid-cell cell-date">
                  <p className="date-num">{dateNum}</p>
                  <p className="month-year">{monthYear}</p>
                </div>
                <div className="grid-cell cell-location">
                  <p className="loc-title">{item.address || '-'}</p>
                  <p className="loc-desc">{item.locationLabel || 'Lokasi Upacara'}</p>
                </div>
              </div>

              {idx === 0 && (
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
              )}

              {item.mapsUrl && (
                <div className="maps-wrapper">
                  <hr className="maps-divider" />
                  <a
                    href={item.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="maps-button"
                  >
                    GOOGLE MAPS
                  </a>
                  <hr className="maps-divider" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LoveStorySection({ data = {} }) {
  const stories = Array.isArray(data.stories) ? data.stories : [];
  if (stories.length === 0) return null;

  return (
    <div className="section-love-story">
      <div className="editorial-subcontainer">
        <h2 className="editorial-script-title">{data.title || 'Love Story'}</h2>
        <div className="story-timeline" style={{ marginTop: '1.8rem' }}>
          {stories.map((story, idx) => (
            <div key={idx} className="story-item">
              <h3 className="story-title">{story.title}</h3>
              <p className="story-desc">{story.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function GallerySection({ data = {}, onPlayVideo, embedded = false }) {
  const youtubeId = extractYoutubeId(data.videoUrl);
  const photos = Array.isArray(data.photos) ? data.photos : [];
  const fallbackPoster = photos[0]?.url || photos[0] || '/assets/img/GIK-13.jpg';

  return (
    <div className="section-gallery">
      <div className="gallery-container">
        <h2 className="gallery-title">{data.title || 'Our Capture Moment'}</h2>

        {youtubeId && (
          <div className="gallery-video-wrapper">
            <div className="gallery-video-poster" onClick={() => onPlayVideo?.(youtubeId)}>
              <img
                src={`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`}
                onError={(e) => {
                  e.currentTarget.src = fallbackPoster;
                }}
                alt="Wedding Video Thumbnail"
                className="video-poster-img"
              />
              <div className="video-poster-overlay">
                <button type="button" className="video-play-btn" aria-label="Play Video">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="36" height="36">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="gallery-grid">
          {photos.map((photo, index) => {
            const imgSrc = typeof photo === 'string' ? photo : photo?.url;
            if (!imgSrc) return null;
            return (
              <a
                key={`${imgSrc}-${index}`}
                href={imgSrc}
                className="glightbox gallery-item"
                data-gallery="wedding-gallery"
                onClick={embedded ? (e) => e.preventDefault() : undefined}
              >
                <img src={imgSrc} alt={`Capture Moment ${index + 1}`} loading="lazy" />
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function GuestbookSection({ data = {}, wishes = [], onSubmitWish }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [formName, setFormName] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formAttendance, setFormAttendance] = useState('Hadir (accept with pleasure)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const itemsPerPage = 5;

  const totalPages = Math.ceil(wishes.length / itemsPerPage);
  const safePage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1;
  const paginatedWishes = wishes.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formMessage.trim() || !onSubmitWish) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      await onSubmitWish({
        guestName: formName.trim(),
        message: formMessage.trim(),
        attendance: formAttendance,
      });
      setFormName('');
      setFormMessage('');
      setFormAttendance('Hadir (accept with pleasure)');
      setCurrentPage(1);
    } catch (err) {
      setSubmitError(err?.message || 'Gagal mengirim ucapan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="section-guestbook">
      <div className="guestbook-container">
        <h2 className="guestbook-title">{data.title || 'Buku Tamu'}</h2>
        <p className="guestbook-subtitle">
          {data.subtitle || 'Ucapkan sesuatu untuk hari bahagia kami'}
        </p>

        <div className="guestbook-card">
          <div className="gb-card-header">
            <span>{wishes.length} Wishes (Wishes)</span>
          </div>

          <form className="gb-form" onSubmit={handleSubmit}>
            <input
              type="text"
              className="gb-input"
              placeholder="Nama (name)"
              maxLength={80}
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

            {submitError && (
              <p style={{ color: '#b91c1c', fontSize: '0.85rem', fontFamily: 'Montserrat, sans-serif' }}>
                {submitError}
              </p>
            )}

            <button type="submit" className="gb-btn-send" disabled={isSubmitting}>
              {isSubmitting ? 'Mengirim...' : 'Kirim (Send)'}
            </button>
          </form>

          <div className="wishes-list">
            {paginatedWishes.map((wish, idx) => {
              const name = wish.guest_name || wish.nama || 'Tamu Undangan';
              const message = wish.message || wish.ucapan || '';
              const attendance = wish.attendance || wish.konfirmasi || 'Hadir';
              const relativeTime = getRelativeTime(wish.created_at || wish.createTime);

              return (
                <div key={wish.id || idx} className="wish-item">
                  <div className="wish-header">
                    <span className="wish-name">{name}</span>
                    <span className="wish-badge">
                      <i className="check-icon">✓</i> {attendance}
                    </span>
                  </div>
                  <p className="wish-time">{relativeTime}</p>
                  <p className="wish-text">{message}</p>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="gb-pagination">
              <span
                className={`page-nav ${safePage === 1 ? 'disabled' : ''}`}
                onClick={() => safePage > 1 && setCurrentPage(safePage - 1)}
              >
                &laquo; Previous
              </span>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <span
                  key={pageNum}
                  className={`page-num ${pageNum === safePage ? 'active' : ''}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </span>
              ))}
              <span
                className={`page-nav ${safePage === totalPages ? 'disabled' : ''}`}
                onClick={() => safePage < totalPages && setCurrentPage(safePage + 1)}
              >
                Next &raquo;
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function GiftSection({ data = {} }) {
  const [isGiftVisible, setIsGiftVisible] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const accounts = Array.isArray(data.accounts) ? data.accounts : [];

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="section-gift">
      <div className="gift-container">
        <h2 className="gift-title">{data.title || 'Wedding Gift'}</h2>
        <p className="gift-desc">
          {data.description ||
            'Bagi yang ingin memberikan tanda kasih kepada mempelai, Anda dapat menggunakan akun virtual atau E-wallet di bawah ini:'}
        </p>

        <button
          className="btn-toggle-gift"
          type="button"
          onClick={() => setIsGiftVisible(!isGiftVisible)}
        >
          <svg
            className="eye-icon"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
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
            {accounts.map((acc, idx) => {
              const cardKey = `${acc.bankName}-${idx}`;
              return (
                <div key={cardKey} className="gift-card">
                  <div className="card-content">
                    <h3 className="bank-name">{acc.bankName}</h3>
                    <p className="acc-label">No Rekening</p>
                    <p className="acc-number">{acc.accountNumber}</p>
                    <p className="acc-holder">{acc.accountHolder}</p>
                    <div className="card-divider"></div>
                  </div>
                  <button
                    className={`btn-copy ${copiedId === cardKey ? 'copied' : ''}`}
                    type="button"
                    title="Salin Nomor Rekening"
                    onClick={() => copyToClipboard(acc.accountNumber, cardKey)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span className="copy-tooltip">Disalin!</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function CustomNoteSection({ data = {} }) {
  return (
    <div className="section-custom-note">
      <div className="editorial-subcontainer">
        <div className="custom-note-card">
          {data.title && <h2 className="custom-note-title">{data.title}</h2>}
          {data.body && <p className="custom-note-body">{data.body}</p>}
          {data.buttonLabel && data.buttonUrl && /^https?:\/\//i.test(data.buttonUrl) && (
            <a
              href={data.buttonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="custom-note-btn"
            >
              {data.buttonLabel}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function FooterSection({ data = {} }) {
  return (
    <div
      className="section-footer"
      style={data.bgUrl ? { backgroundImage: `url('${data.bgUrl}')` } : { backgroundColor: '#121212' }}
    >
      <div className="footer-overlay"></div>
      <div className="footer-content">
        <h2 className="footer-title">{data.title || 'Matur Suksma'}</h2>
        <p className="footer-desc">
          {data.message ||
            'Setiap ucapan dan doa yang kamu berikan, jadi bagian indah dalam cerita kami. Kami tak sabar menyambutmu di hari spesial nanti.'}
        </p>

        <div className="footer-branding">
          <p className="creator-text">created by anselmoments</p>

          <div className="social-links">
            <a
              href="https://www.instagram.com/by.anselmoments/"
              target="_blank"
              rel="noopener noreferrer"
              className="social-item"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
              <span>@by.anselmoments</span>
            </a>

            <a
              href="https://instagram.com/anselphotobooth"
              target="_blank"
              rel="noopener noreferrer"
              className="social-item"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
              <span>@anselphotobooth</span>
            </a>

            <a
              href="https://tiktok.com/@anselphotobooth"
              target="_blank"
              rel="noopener noreferrer"
              className="social-item"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>
              </svg>
              <span>@anselphotobooth</span>
            </a>

            <a
              href="https://wa.me/6285700848786"
              target="_blank"
              rel="noopener noreferrer"
              className="social-item"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              <span>+6285700848786</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
