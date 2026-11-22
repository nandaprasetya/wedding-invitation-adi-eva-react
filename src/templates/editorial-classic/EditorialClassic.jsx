import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GLightbox from 'glightbox';
import 'glightbox/dist/css/glightbox.min.css';
import '../../styles/invitation.css';
import { extractYoutubeId } from '../../utils/orderHelpers';
import {
  CoupleSection,
  CoverSection,
  CustomNoteSection,
  EventsSection,
  FooterSection,
  GallerySection,
  GiftSection,
  GuestbookSection,
  LoveStorySection,
  MepandesSection,
  PawiwahanSection,
  QuoteSection,
} from './sections';

const SECTION_COMPONENTS = {
  cover: CoverSection,
  quote: QuoteSection,
  couple: CoupleSection,
  mepandes: MepandesSection,
  pawiwahan: PawiwahanSection,
  events: EventsSection,
  love_story: LoveStorySection,
  gallery: GallerySection,
  guestbook: GuestbookSection,
  gift: GiftSection,
  custom_note: CustomNoteSection,
  footer: FooterSection,
};

export default function EditorialClassic({
  invitation,
  guestName = 'Tamu Undangan',
  wishes = [],
  onSubmitWish,
  isPreview = false,
  embedded = false,
  embeddedMobile = false,
}) {
  const [isOpened, setIsOpened] = useState(embedded);
  const [isOpeningHidden, setIsOpeningHidden] = useState(embedded);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicError, setMusicError] = useState('');
  const [activeVideoId, setActiveVideoId] = useState('');
  const audioRef = useRef(null);
  const ytIframeRef = useRef(null);
  const desiredYtPlayRef = useRef(false);
  const ytConnectedRef = useRef(false);

  const musicUrl = invitation?.music_url || '';
  const musicYoutubeId = useMemo(() => extractYoutubeId(musicUrl), [musicUrl]);
  const isDirectAudio = Boolean(musicUrl) && !musicYoutubeId;

  const sendYoutubeCommand = useCallback((func, args = []) => {
    ytIframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      'https://www.youtube.com'
    );
  }, []);

  const sendYoutubeListening = useCallback(() => {
    ytIframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }),
      'https://www.youtube.com'
    );
  }, []);

  useEffect(() => {
    desiredYtPlayRef.current = false;
    ytConnectedRef.current = false;
    setIsMusicPlaying(false);
    setMusicError('');
  }, [musicUrl]);

  useEffect(() => {
    if (!musicYoutubeId || !isOpened || embedded) return undefined;
    ytConnectedRef.current = false;

    const handshakeTimer = setInterval(() => {
      if (ytConnectedRef.current) {
        clearInterval(handshakeTimer);
        return;
      }
      sendYoutubeListening();
    }, 300);

    const stopTimer = setTimeout(() => clearInterval(handshakeTimer), 8000);

    const onMessage = (event) => {
      if (event.origin !== 'https://www.youtube.com') return;
      let payload;
      try {
        payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (!payload || typeof payload !== 'object') return;

      if (!ytConnectedRef.current) {
        ytConnectedRef.current = true;
        clearInterval(handshakeTimer);
        sendYoutubeCommand('addEventListener', ['onStateChange']);
        sendYoutubeCommand('addEventListener', ['onError']);
      }

      if (payload.event === 'onError') {
        const code = payload.info;
        desiredYtPlayRef.current = false;
        setIsMusicPlaying(false);
        const msg =
          code === 101 || code === 150
            ? 'Video YouTube tidak mengizinkan pemutaran embed di domain ini.'
            : `Audio YouTube gagal diputar (kode ${code ?? 'unknown'}).`;
        setMusicError(msg);
        console.warn('[AnselMoments] YouTube background music error:', code, msg);
        return;
      }

      if (payload.event === 'onReady') {
        setMusicError('');
        if (desiredYtPlayRef.current) {
          sendYoutubeCommand('playVideo');
        }
        return;
      }

      const state =
        (payload.event === 'infoDelivery' || payload.event === 'initialDelivery') &&
        typeof payload.info?.playerState === 'number'
          ? payload.info.playerState
          : payload.event === 'onStateChange' && typeof payload.info === 'number'
            ? payload.info
            : null;
      if (state === 1) {
        setMusicError('');
        setIsMusicPlaying(true);
      } else if (state === 0) {
        if (desiredYtPlayRef.current) {
          sendYoutubeCommand('playVideo');
        } else {
          setIsMusicPlaying(false);
        }
      } else if (state === -1 || state === 2 || state === 5) {
        setIsMusicPlaying(false);
      }
    };

    window.addEventListener('message', onMessage);
    return () => {
      clearInterval(handshakeTimer);
      clearTimeout(stopTimer);
      window.removeEventListener('message', onMessage);
    };
  }, [musicYoutubeId, isOpened, embedded, sendYoutubeCommand, sendYoutubeListening]);

  const sections = useMemo(
    () => (Array.isArray(invitation?.sections) ? invitation.sections : []),
    [invitation?.sections]
  );

  const coverData = useMemo(() => {
    const coverSec = sections.find((s) => s.type === 'cover');
    return coverSec?.data || {};
  }, [sections]);

  const visibleSections = useMemo(
    () => sections.filter((section) => section && section.visible !== false),
    [sections]
  );

  const gallerySignature = useMemo(() => {
    const gallerySec = visibleSections.find((s) => s.type === 'gallery');
    return JSON.stringify(gallerySec?.data?.photos || []);
  }, [visibleSections]);

  useEffect(() => {
    if (embedded) return undefined;
    const lightbox = GLightbox({
      selector: '.glightbox',
      touchNavigation: true,
      loop: true,
      zoomable: true,
      width: '100vw',
      height: '100vh',
      openEffect: 'zoom',
      closeEffect: 'zoom',
    });
    return () => {
      lightbox.destroy();
    };
  }, [gallerySignature, embedded]);

  const handleOpenInvitation = () => {
    setIsOpened(true);
    if (musicYoutubeId) {
      desiredYtPlayRef.current = true;
      sendYoutubeCommand('playVideo');
    } else if (audioRef.current && isDirectAudio) {
      audioRef.current
        .play()
        .then(() => {
          setIsMusicPlaying(true);
        })
        .catch(() => {});
    }
    setTimeout(() => {
      setIsOpeningHidden(true);
    }, 1200);
  };

  const toggleMusic = () => {
    if (musicYoutubeId) {
      const next = !isMusicPlaying;
      desiredYtPlayRef.current = next;
      sendYoutubeCommand(next ? 'playVideo' : 'pauseVideo');
      setIsMusicPlaying(next);
      return;
    }
    if (!audioRef.current || !isDirectAudio) return;
    if (isMusicPlaying) {
      audioRef.current.pause();
      setIsMusicPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => {
          setIsMusicPlaying(true);
        })
        .catch(() => {});
    }
  };

  const handlePlayVideo = (youtubeId) => {
    setActiveVideoId(youtubeId);
    if (musicYoutubeId && isMusicPlaying) {
      desiredYtPlayRef.current = false;
      sendYoutubeCommand('pauseVideo');
      setIsMusicPlaying(false);
    } else if (audioRef.current && isMusicPlaying) {
      audioRef.current.pause();
      setIsMusicPlaying(false);
    }
  };

  const handleYoutubeIframeLoad = () => {
    sendYoutubeListening();
    sendYoutubeCommand('addEventListener', ['onStateChange']);
    sendYoutubeCommand('addEventListener', ['onError']);
    if (desiredYtPlayRef.current) {
      sendYoutubeCommand('playVideo');
    }
  };

  const openingBg = coverData.openingBg || coverData.slides?.[0] || '';
  const leftPanelBg = coverData.leftPanelBg || coverData.openingBg || coverData.slides?.[0] || '';
  const displayTitle = coverData.title || invitation?.title || 'Undangan';
  const ytOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const ytMusicEmbedSrc = musicYoutubeId
    ? `https://www.youtube.com/embed/${musicYoutubeId}?autoplay=1&loop=1&playlist=${musicYoutubeId}&enablejsapi=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&playsinline=1&rel=0&origin=${encodeURIComponent(ytOrigin)}`
    : '';

  return (
    <div
      className={`invitation-root ${embedded ? 'is-embedded' : ''} ${
        embeddedMobile ? 'is-mobile' : ''
      }`}
    >
      {isPreview && !embedded && (
        <div className="invitation-preview-banner">
          Mode Preview — Undangan ini masih berstatus <strong>{invitation?.status || 'draft'}</strong> dan belum dipublikasikan ke umum.
        </div>
      )}

      {!isOpeningHidden && (
        <div
          className={`opening-screen ${isOpened ? 'slide-up' : ''}`}
          style={
            openingBg
              ? { backgroundImage: `url('${openingBg}')` }
              : { backgroundColor: '#161412' }
          }
        >
          <div className="opening-overlay"></div>
          <div className="opening-content">
            <p className="opening-subtitle">{coverData.openingSubtitle || 'The Wedding of'}</p>
            <h1 className="opening-title">{displayTitle.toUpperCase()}</h1>

            <div className="opening-guest-box">
              <p className="opening-guest-label">Special Invitation to</p>
              <h2 className="opening-guest-name">{guestName}</h2>
              <p className="opening-apology">
                Mohon maaf apabila ada kesalahan penulisan nama/gelar
              </p>
            </div>

            <button className="btn-open-invitation" type="button" onClick={handleOpenInvitation}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <span>Buka Undangan</span>
            </button>
          </div>
        </div>
      )}

      {isDirectAudio && <audio ref={audioRef} loop src={musicUrl} preload="auto" />}

      {musicYoutubeId && isOpened && !embedded && (
        <iframe
          ref={ytIframeRef}
          src={ytMusicEmbedSrc}
          title="Background Music"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          aria-hidden="true"
          tabIndex={-1}
          onLoad={handleYoutubeIframeLoad}
          style={{
            position: 'fixed',
            width: '200px',
            height: '200px',
            right: 0,
            bottom: 0,
            opacity: 0.001,
            pointerEvents: 'none',
            zIndex: -1,
            border: 0,
          }}
        />
      )}

      {musicUrl && !embedded && (
        <button
          className={`btn-music-toggle ${!isOpened ? 'hidden' : ''} ${isMusicPlaying ? 'spinning' : ''}`}
          type="button"
          aria-label="Toggle Music"
          title={musicError || (isMusicPlaying ? 'Jeda Musik' : 'Putar Musik')}
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
      )}

      <div className="outer-page">
        <div
          className="left-page"
          style={
            leftPanelBg
              ? { backgroundImage: `url('${leftPanelBg}')` }
              : { backgroundColor: '#161412' }
          }
        >
          <div className="left-page-overlay"></div>
          <div className="left-page-content">
            <p className="left-subtitle">{coverData.subtitle || 'THE WEDDING OF'}</p>
            <h1 className="left-title">{displayTitle}</h1>
            <p className="left-desc">
              {coverData.leftDesc ||
                'Suatu kehormatan bagi kami, apabila bapak/ibu/saudara/i, berkenan hadir untuk memberikan doa restu kepada putra putri kami'}
            </p>
          </div>
        </div>

        <div className="right-page">
          {visibleSections.map((section) => {
            const SectionComponent = SECTION_COMPONENTS[section.type];
            if (!SectionComponent) return null;
            return (
              <SectionComponent
                key={section.id || section.type}
                data={section.data || {}}
                guestName={guestName}
                eventDatetime={invitation?.event_datetime}
                wishes={wishes}
                onSubmitWish={onSubmitWish}
                onPlayVideo={handlePlayVideo}
                embedded={embedded}
              />
            );
          })}
        </div>
      </div>

      {activeVideoId && (
        <div className="video-modal-overlay" onClick={() => setActiveVideoId('')}>
          <div className="video-modal-container" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="video-modal-close"
              onClick={() => setActiveVideoId('')}
              aria-label="Close Video"
            >
              ✕
            </button>
            <iframe
              className="video-modal-element video-modal-iframe"
              src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1&rel=0&playsinline=1&origin=${encodeURIComponent(ytOrigin)}`}
              title={`Wedding Video - ${displayTitle}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}
