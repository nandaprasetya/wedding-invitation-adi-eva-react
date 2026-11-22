import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, RotateCcw } from 'lucide-react';
import {
  BRAND_CONFIG,
  ORDER_PACKAGES,
  ORDER_STEPS,
  createInitialOrderState,
} from '../config/orderCatalog';
import {
  calculateOrderPricing,
  formatRupiah,
  generateSlug,
  validateStep,
} from '../utils/orderHelpers';
import { createOrder } from '../services/orderService';
import {
  OrderShell,
  OrderSummaryCard,
  StepProgress,
} from '../components/order/OrderShell';
import {
  Step1Preferences,
  Step2Theme,
  Step3Couple,
  Step4Events,
  Step5FeaturesMedia,
  Step6ReviewContact,
} from '../components/order/OrderSteps';

const DRAFT_STORAGE_KEY = 'ansel_order_draft_v1';
const DRAFT_TTL_MS = 3 * 24 * 60 * 60 * 1000;

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      return null;
    }
    const base = createInitialOrderState();
    const saved = parsed.form || {};
    return {
      form: {
        ...base,
        ...saved,
        groom: { ...base.groom, ...(saved.groom || {}) },
        bride: { ...base.bride, ...(saved.bride || {}) },
        features: { ...base.features, ...(saved.features || {}) },
        addons: { ...base.addons, ...(saved.addons || {}) },
        media: { ...base.media, ...(saved.media || {}) },
        contact: { ...base.contact, ...(saved.contact || {}) },
        events: Array.isArray(saved.events) && saved.events.length > 0 ? saved.events : base.events,
      },
      step: Math.min(Math.max(Number(parsed.step) || 1, 1), ORDER_STEPS.length),
      maxVisitedStep: Math.min(
        Math.max(Number(parsed.maxVisitedStep) || Number(parsed.step) || 1, 1),
        ORDER_STEPS.length
      ),
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

export default function OrderPage() {
  const navigate = useNavigate();
  const [initialDraft] = useState(() => loadDraft());

  const [form, setForm] = useState(() => initialDraft?.form || createInitialOrderState());
  const [step, setStep] = useState(() => initialDraft?.step || 1);
  const [maxVisitedStep, setMaxVisitedStep] = useState(() => initialDraft?.maxVisitedStep || 1);
  const [restoredBanner, setRestoredBanner] = useState(() => Boolean(initialDraft));
  const [lastSavedAt, setLastSavedAt] = useState(() => initialDraft?.savedAt || null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.title = `Pesan Undangan Digital — ${BRAND_CONFIG.name}`;
  }, []);

  // Auto-generate requestedSlug from couple nicknames unless user manually edited it
  useEffect(() => {
    if (form.isSlugEdited) return;
    const autoSlug = generateSlug(form.groom.nickname, form.bride.nickname);
    if (autoSlug !== form.requestedSlug) {
      setForm((prev) => ({ ...prev, requestedSlug: autoSlug }));
    }
  }, [form.groom.nickname, form.bride.nickname, form.isSlugEdited, form.requestedSlug]);

  // Persist draft to localStorage
  useEffect(() => {
    const hasInput =
      form.allowSocialMedia !== null ||
      Boolean(form.themeId) ||
      Boolean(form.groom.fullName) ||
      Boolean(form.bride.fullName) ||
      step > 1;
    if (!hasInput) return;

    const now = Date.now();
    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({ form, step, maxVisitedStep, savedAt: now })
      );
      setLastSavedAt(now);
    } catch {
      // Ignore storage quota errors silently
    }
  }, [form, step, maxVisitedStep]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFormChange = (updater) => {
    setForm(updater);
    if (Object.keys(errors).length > 0) {
      setErrors({});
    }
    if (submitError) setSubmitError('');
  };

  const handleResetDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setForm(createInitialOrderState());
    setStep(1);
    setMaxVisitedStep(1);
    setRestoredBanner(false);
    setLastSavedAt(null);
    setErrors({});
    setSubmitError('');
    scrollToTop();
  };

  const handleNext = () => {
    const stepErrors = validateStep(step, form);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      scrollToTop();
      return;
    }

    const nextStep = Math.min(step + 1, ORDER_STEPS.length);
    setErrors({});
    setStep(nextStep);
    setMaxVisitedStep((prev) => Math.max(prev, nextStep));
    scrollToTop();
  };

  const handleBack = () => {
    setErrors({});
    setStep((prev) => Math.max(prev - 1, 1));
    scrollToTop();
  };

  const handleJumpStep = (targetStep) => {
    setErrors({});
    setStep(targetStep);
    scrollToTop();
  };

  const handleSubmitOrder = async () => {
    for (let s = 1; s <= ORDER_STEPS.length; s += 1) {
      const stepErr = validateStep(s, form);
      if (Object.keys(stepErr).length > 0) {
        setStep(s);
        setErrors(stepErr);
        scrollToTop();
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const { orderCode, order } = await createOrder(form);
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      navigate(`/order/${orderCode}`, {
        state: { order, justCreated: true },
      });
    } catch (err) {
      console.error('Failed to create order:', err);
      setSubmitError(
        err?.message ||
          'Gagal menyimpan pesanan. Periksa koneksi internet Anda lalu coba kirim kembali.'
      );
      scrollToTop();
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPkg = ORDER_PACKAGES.find((p) => p.id === form.packageId) || ORDER_PACKAGES[0];
  const pricing = calculateOrderPricing(selectedPkg.id, form.addons);
  const isLastStep = step === ORDER_STEPS.length;

  return (
    <OrderShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-28 lg:pb-12">
        {/* Page Heading */}
        <div className="max-w-2xl mb-8">
          <h1 className="font-ibarra text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.08] text-codGray-950">
            Pesan <span className="italic text-goldSand-800">Undangan Digital</span> Anda
          </h1>
          <p className="text-base text-codGray-900 mt-3 leading-relaxed">
            Lengkapi detail acara dalam enam langkah singkat. Pembayaran dikonfirmasi langsung melalui WhatsApp setelah pesanan dibuat.
          </p>
        </div>

        {/* Restored Draft Banner */}
        {restoredBanner && (
          <div className="mb-6 rounded-2xl bg-goldSand-100 border border-goldSand-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-codGray-900">
              Melanjutkan draft pesanan Anda yang tersimpan otomatis.
            </p>
            <button
              type="button"
              onClick={handleResetDraft}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-goldSand-800 underline underline-offset-4 hover:text-codGray-950 cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Mulai Ulang</span>
            </button>
          </div>
        )}

        {/* Stepper */}
        <StepProgress
          currentStep={step}
          maxVisitedStep={maxVisitedStep}
          onSelectStep={handleJumpStep}
        />

        {/* Two-column editorial workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8">
            <div className="rounded-2xl bg-white border border-codGray-100 p-6 sm:p-8">
              {submitError && (
                <div
                  role="alert"
                  className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                >
                  {submitError}
                </div>
              )}

              {Object.keys(errors).length > 0 && (
                <div
                  role="alert"
                  className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                >
                  Mohon lengkapi atau perbaiki kolom yang ditandai sebelum melanjutkan.
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isLastStep) {
                    handleSubmitOrder();
                  } else {
                    handleNext();
                  }
                }}
                noValidate
              >
                {step === 1 && (
                  <Step1Preferences form={form} errors={errors} onChange={handleFormChange} />
                )}
                {step === 2 && (
                  <Step2Theme form={form} errors={errors} onChange={handleFormChange} />
                )}
                {step === 3 && (
                  <Step3Couple form={form} errors={errors} onChange={handleFormChange} />
                )}
                {step === 4 && (
                  <Step4Events form={form} errors={errors} onChange={handleFormChange} />
                )}
                {step === 5 && (
                  <Step5FeaturesMedia form={form} errors={errors} onChange={handleFormChange} />
                )}
                {step === 6 && (
                  <Step6ReviewContact
                    form={form}
                    errors={errors}
                    onChange={handleFormChange}
                    onJumpStep={handleJumpStep}
                  />
                )}

                {/* Desktop & inline navigation */}
                <div className="mt-8 pt-6 border-t border-codGray-100 flex items-center justify-between gap-4">
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={handleBack}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 rounded-2xl border border-codGray-900 bg-white px-5 py-3 text-sm font-medium text-codGray-900 hover:bg-codGray-50 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <ArrowLeft size={16} />
                      <span>Kembali</span>
                    </button>
                  ) : (
                    <span />
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-goldSand-300 hover:bg-goldSand-400 px-7 py-3 text-sm font-medium text-codGray-900 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Menyimpan Pesanan...</span>
                      </>
                    ) : isLastStep ? (
                      <span>Buat Pesanan</span>
                    ) : (
                      <>
                        <span>Lanjut: {ORDER_STEPS[step]?.shortLabel}</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sticky Live Summary (Desktop) */}
          <div className="hidden lg:block lg:col-span-4 lg:sticky lg:top-24">
            <OrderSummaryCard form={form} lastSavedAt={lastSavedAt} />
          </div>
        </div>
      </div>

      {/* Mobile Sticky Summary & Primary Action Bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-codGray-100 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-codGray-500">Total Estimasi</p>
            <p className="font-ibarra text-xl font-semibold text-codGray-950 tabular-nums leading-tight">
              {formatRupiah(pricing.totalPrice)}
            </p>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => (isLastStep ? handleSubmitOrder() : handleNext())}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-goldSand-300 hover:bg-goldSand-400 px-6 py-2.5 text-sm font-medium text-codGray-900 transition-colors cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : isLastStep ? (
              <span>Buat Pesanan</span>
            ) : (
              <>
                <span>Lanjut</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      </div>
    </OrderShell>
  );
}
