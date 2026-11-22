import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Search, X } from 'lucide-react';
import {
  BRAND_CONFIG,
  ORDER_ADDONS,
  ORDER_PACKAGES,
  ORDER_STEPS,
  ORDER_THEMES,
} from '../../config/orderCatalog';
import {
  formatDateIndo,
  generateSlug,
  slugifyText,
} from '../../utils/orderHelpers';
import { normalizeOrderCode } from '../../services/orderService';

export function OrderShell({ children }) {
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupCode, setLookupCode] = useState('');
  const navigate = useNavigate();

  const handleLookupSubmit = (e) => {
    e.preventDefault();
    const cleaned = normalizeOrderCode(lookupCode);
    if (!cleaned) return;
    setLookupOpen(false);
    setLookupCode('');
    navigate(`/order/${encodeURIComponent(cleaned)}`);
  };

  return (
    <div className="min-h-screen bg-goldSand-50 font-dm text-codGray-900 flex flex-col">
      <header className="sticky top-0 z-30 bg-goldSand-50 border-b border-goldSand-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          <Link to="/order" className="flex items-center gap-3 group">
            <img
              src={BRAND_CONFIG.logoUrl}
              alt={BRAND_CONFIG.name}
              className="w-8 h-8 object-contain"
            />
            <span className="font-ibarra text-xl font-semibold tracking-tight text-codGray-950">
              {BRAND_CONFIG.name}
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setLookupOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-codGray-900 bg-white px-4 py-2 text-sm font-medium text-codGray-900 hover:bg-codGray-50 transition-colors cursor-pointer"
          >
            <Search size={15} />
            <span>Cek Status</span>
          </button>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t border-goldSand-100 bg-goldSand-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-codGray-500">
          <p className="font-ibarra text-base text-codGray-900 font-medium">{BRAND_CONFIG.name}</p>
          <p>
            Butuh bantuan?{' '}
            <a
              href={`https://wa.me/${BRAND_CONFIG.adminWhatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-goldSand-800 underline underline-offset-4 hover:text-codGray-950"
            >
              Hubungi WhatsApp Admin
            </a>
          </p>
        </div>
      </footer>

      {lookupOpen && (
        <div
          className="fixed inset-0 z-50 bg-codGray-950/40 flex items-center justify-center p-4"
          onClick={() => setLookupOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="check-order-title"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border border-codGray-100 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2
                  id="check-order-title"
                  className="font-ibarra text-2xl font-semibold text-codGray-950"
                >
                  Cek Status <span className="italic text-goldSand-800">Pesanan</span>
                </h2>
                <p className="text-sm text-codGray-500 mt-1">
                  Masukkan kode pesanan yang Anda terima setelah mengirim formulir.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLookupOpen(false)}
                aria-label="Tutup dialog"
                className="p-1.5 rounded-lg text-codGray-500 hover:bg-codGray-50 hover:text-codGray-950 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLookupSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="lookup-order-code"
                  className="block text-sm font-medium text-codGray-900 mb-1.5"
                >
                  Kode Pesanan
                </label>
                <input
                  id="lookup-order-code"
                  type="text"
                  value={lookupCode}
                  onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: ANSL-7K9M2X"
                  autoFocus
                  required
                  className="w-full rounded-xl border border-codGray-100 bg-white px-4 py-3 text-codGray-950 placeholder:text-codGray-300 focus:border-goldSand-800 focus:outline-none focus:ring-2 focus:ring-goldSand-300/60"
                />
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setLookupOpen(false)}
                  className="rounded-2xl border border-codGray-900 bg-white px-5 py-2.5 text-sm font-medium text-codGray-900 hover:bg-codGray-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-goldSand-300 hover:bg-goldSand-400 px-6 py-2.5 text-sm font-medium text-codGray-900 transition-colors cursor-pointer"
                >
                  Lihat Pesanan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function StepProgress({ currentStep, maxVisitedStep, onSelectStep }) {
  const activeMeta = ORDER_STEPS.find((s) => s.number === currentStep) || ORDER_STEPS[0];
  const progressPct = Math.round((currentStep / ORDER_STEPS.length) * 100);

  return (
    <div className="mb-8">
      {/* Mobile compact progress */}
      <div className="md:hidden">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-sm font-medium text-codGray-950">
            Langkah {currentStep} dari {ORDER_STEPS.length} — {activeMeta.label}
          </p>
          <span className="text-xs text-codGray-500 tabular-nums">{progressPct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-goldSand-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-goldSand-800 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Desktop horizontal stepper */}
      <ol className="hidden md:grid grid-cols-6 gap-2" aria-label="Tahapan pemesanan">
        {ORDER_STEPS.map((step) => {
          const isCurrent = step.number === currentStep;
          const isCompleted = step.number < currentStep;
          const canJump = step.number <= maxVisitedStep && step.number !== currentStep;

          return (
            <li key={step.key}>
              <button
                type="button"
                disabled={!canJump}
                onClick={() => canJump && onSelectStep(step.number)}
                className={`w-full text-left group transition-colors ${
                  canJump ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold tabular-nums transition-colors ${
                      isCurrent
                        ? 'bg-goldSand-800 text-white'
                        : isCompleted
                          ? 'bg-goldSand-300 text-codGray-950'
                          : 'bg-white border border-codGray-100 text-codGray-500'
                    }`}
                  >
                    {isCompleted ? <Check size={14} strokeWidth={2.5} /> : step.number}
                  </span>
                  <span
                    className={`h-px flex-1 ${
                      step.number === ORDER_STEPS.length
                        ? 'bg-transparent'
                        : isCompleted
                          ? 'bg-goldSand-800/40'
                          : 'bg-codGray-100'
                    }`}
                  />
                </div>
                <span
                  className={`block text-xs font-medium leading-snug ${
                    isCurrent
                      ? 'text-codGray-950'
                      : isCompleted
                        ? 'text-goldSand-800 group-hover:text-codGray-950'
                        : 'text-codGray-500'
                  }`}
                >
                  {step.shortLabel}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function OrderSummaryCard({ form, lastSavedAt }) {
  const selectedTheme = ORDER_THEMES.find((t) => t.id === form.themeId);
  const selectedPkg = ORDER_PACKAGES.find((p) => p.id === form.packageId) || ORDER_PACKAGES[0];

  const coupleTitle = [form.groom?.nickname?.trim(), form.bride?.nickname?.trim()]
    .filter(Boolean)
    .join(' & ');

  const slugPreview =
    slugifyText(form.requestedSlug) ||
    generateSlug(form.groom?.nickname, form.bride?.nickname) ||
    'nama-mempelai';

  const dateDisplay = formatDateIndo(form.primaryEventDateTime);

  return (
    <aside className="rounded-2xl bg-goldSand-100 p-6 space-y-5">
      <div>
        <h2 className="font-ibarra text-2xl font-semibold text-codGray-950">
          Ringkasan <span className="italic text-goldSand-800">Pesanan</span>
        </h2>
        <p className="text-xs text-codGray-500 mt-1">
          {lastSavedAt ? 'Draft tersimpan otomatis di perangkat ini.' : 'Isi formulir untuk melihat rincian.'}
        </p>
      </div>

      <dl className="space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-codGray-500">Mempelai</dt>
          <dd className="font-medium text-codGray-950 text-right">{coupleTitle || 'Belum diisi'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-codGray-500">Tema</dt>
          <dd className="font-medium text-codGray-950 text-right">
            {selectedTheme ? selectedTheme.name : 'Belum dipilih'}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-codGray-500">Tanggal Utama</dt>
          <dd className="font-medium text-codGray-950 text-right">{dateDisplay || 'Belum dipilih'}</dd>
        </div>
        <div className="pt-2">
          <dt className="text-codGray-500 mb-1">Preview Link Undangan</dt>
          <dd className="rounded-xl bg-goldSand-50 px-3 py-2 text-xs font-medium text-goldSand-800 break-all">
            {BRAND_CONFIG.domain}/{slugPreview}
          </dd>
        </div>
      </dl>

      <div className="pt-4 border-t border-goldSand-200 space-y-2.5 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-codGray-900">Paket {selectedPkg.name}</span>
          <span className="font-medium text-goldSand-800">Free</span>
        </div>

        {form.addons?.splitLink && (
          <div className="flex justify-between gap-4">
            <span className="text-codGray-900">{ORDER_ADDONS.splitLink.name}</span>
            <span className="font-medium text-goldSand-800">Free</span>
          </div>
        )}

        <div className="flex justify-between items-baseline gap-4 pt-3 border-t border-goldSand-200">
          <span className="font-medium text-codGray-950">Biaya</span>
          <span className="font-ibarra text-2xl font-semibold text-goldSand-800">Free</span>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-codGray-500">
        Konfirmasi pesanan dilakukan melalui WhatsApp Admin setelah formulir dikirim.
      </p>
    </aside>
  );
}
