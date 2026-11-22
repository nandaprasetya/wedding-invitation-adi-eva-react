import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Check,
  Copy,
  Link2,
  MessageCircle,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  BRAND_CONFIG,
  ORDER_ADDONS,
  ORDER_STATUS_META,
  ORDER_STATUS_STEPS,
} from '../config/orderCatalog';
import {
  buildAdminWhatsappUrl,
  formatDateIndo,
} from '../utils/orderHelpers';
import { getOrderByCode, normalizeOrderCode } from '../services/orderService';
import { OrderShell } from '../components/order/OrderShell';

export default function OrderStatusPage() {
  const { orderCode: rawCode } = useParams();
  const normalizedCode = normalizeOrderCode(rawCode);
  const location = useLocation();
  const navigate = useNavigate();

  const stateOrder =
    location.state?.order?.orderCode === normalizedCode ? location.state.order : null;
  const justCreated = Boolean(location.state?.justCreated && stateOrder);

  const [order, setOrder] = useState(stateOrder);
  const [loading, setLoading] = useState(!stateOrder);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [copiedType, setCopiedType] = useState(null);
  const [retryCode, setRetryCode] = useState('');

  useEffect(() => {
    document.title = normalizedCode
      ? `Status Pesanan ${normalizedCode} — ${BRAND_CONFIG.name}`
      : `Status Pesanan — ${BRAND_CONFIG.name}`;
  }, [normalizedCode]);

  const fetchOrder = useCallback(async () => {
    if (!normalizedCode) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    if (!stateOrder) setLoading(true);
    setError('');
    setNotFound(false);

    try {
      const fetched = await getOrderByCode(normalizedCode);
      if (!fetched) {
        if (!stateOrder) setNotFound(true);
      } else {
        setOrder(fetched);
      }
    } catch (err) {
      console.error('Failed to fetch order:', err);
      if (!stateOrder) {
        setError(err?.message || 'Gagal memuat data pesanan. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  }, [normalizedCode, stateOrder]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedType(key);
      setTimeout(() => setCopiedType(null), 2000);
    });
  };

  const handleRetryLookup = (e) => {
    e.preventDefault();
    const cleaned = normalizeOrderCode(retryCode);
    if (!cleaned) return;
    setRetryCode('');
    navigate(`/order/${encodeURIComponent(cleaned)}`);
  };

  if (loading) {
    return (
      <OrderShell>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14">
          <div className="rounded-2xl bg-white border border-codGray-100 p-8 space-y-4">
            <div className="h-8 w-56 rounded-lg bg-goldSand-100 animate-pulse" />
            <div className="h-4 w-72 rounded bg-codGray-50 animate-pulse" />
            <div className="h-28 w-full rounded-xl bg-goldSand-50 animate-pulse mt-4" />
          </div>
        </div>
      </OrderShell>
    );
  }

  if (error) {
    return (
      <OrderShell>
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-14">
          <div className="rounded-2xl bg-white border border-codGray-100 p-8 space-y-4">
            <h1 className="font-ibarra text-3xl font-semibold text-codGray-950">
              Tidak Dapat Memuat <span className="italic text-goldSand-800">Pesanan</span>
            </h1>
            <p className="text-sm text-codGray-900 leading-relaxed">{error}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={fetchOrder}
                className="inline-flex items-center gap-2 rounded-2xl bg-goldSand-300 hover:bg-goldSand-400 px-5 py-2.5 text-sm font-medium text-codGray-900 cursor-pointer"
              >
                <RefreshCw size={15} />
                <span>Coba Lagi</span>
              </button>
              <Link
                to="/order"
                className="inline-flex items-center rounded-2xl border border-codGray-900 px-5 py-2.5 text-sm font-medium text-codGray-900 hover:bg-codGray-50"
              >
                Buat Pesanan Baru
              </Link>
            </div>
          </div>
        </div>
      </OrderShell>
    );
  }

  if (notFound || !order) {
    return (
      <OrderShell>
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-14">
          <div className="rounded-2xl bg-white border border-codGray-100 p-8 space-y-5">
            <div>
              <h1 className="font-ibarra text-3xl font-semibold text-codGray-950">
                Pesanan <span className="italic text-goldSand-800">Tidak Ditemukan</span>
              </h1>
              <p className="text-sm text-codGray-500 mt-2 leading-relaxed">
                Kode pesanan <strong className="text-codGray-950">{normalizedCode || '-'}</strong> tidak terdaftar. Periksa kembali penulisan kode Anda atau buat pesanan baru.
              </p>
            </div>

            <form onSubmit={handleRetryLookup} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={retryCode}
                onChange={(e) => setRetryCode(e.target.value.toUpperCase())}
                placeholder="Masukkan kode lain (ANSL-XXXXXX)"
                className="flex-1 rounded-xl border border-codGray-100 px-4 py-3 text-sm text-codGray-950 focus:border-goldSand-800 focus:outline-none focus:ring-2 focus:ring-goldSand-300/60"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-goldSand-300 hover:bg-goldSand-400 px-5 py-3 text-sm font-medium text-codGray-900 cursor-pointer"
              >
                <Search size={15} />
                <span>Cari</span>
              </button>
            </form>

            <div className="pt-2">
              <Link
                to="/order"
                className="text-sm font-medium text-goldSand-800 underline underline-offset-4 hover:text-codGray-950"
              >
                Kembali ke formulir pemesanan
              </Link>
            </div>
          </div>
        </div>
      </OrderShell>
    );
  }

  const statusMeta =
    ORDER_STATUS_META[order.status] || ORDER_STATUS_META.pending_confirmation;
  const effectiveStatusKey =
    order.status === 'pending_payment' ? 'pending_confirmation' : order.status;
  const activeStepIndex = ORDER_STATUS_STEPS.findIndex((s) => s.key === effectiveStatusKey);
  const statusPageUrl = `${window.location.origin}/order/${order.orderCode}`;
  const waUrl = buildAdminWhatsappUrl(order, window.location.origin);

  const coupleTitle = [
    order.invitationData?.groom?.nickname,
    order.invitationData?.bride?.nickname,
  ]
    .filter(Boolean)
    .join(' & ');

  return (
    <OrderShell>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
        {justCreated && (
          <div className="rounded-2xl bg-goldSand-100 border border-goldSand-200 px-5 py-4 text-sm text-codGray-950">
            Pesanan Anda berhasil disimpan. Lanjutkan konfirmasi ke WhatsApp Admin di bawah ini agar undangan segera diproses.
          </div>
        )}

        {/* Header & Primary WhatsApp Action */}
        <section className="rounded-2xl bg-white border border-codGray-100 p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-codGray-500">Kode Pesanan</p>
              <h1 className="font-ibarra text-4xl font-semibold text-codGray-950 tracking-tight mt-0.5 tabular-nums">
                {order.orderCode}
              </h1>
              <p className="text-sm text-codGray-900 mt-1">
                {coupleTitle || order.contact?.customerName} · {order.themeName}
              </p>
            </div>

            <span
              className={`rounded-full px-4 py-1.5 text-xs font-medium ${
                order.status === 'published'
                  ? 'bg-codGray-950 text-white'
                  : order.status === 'cancelled'
                    ? 'bg-codGray-100 text-codGray-500'
                    : 'bg-goldSand-100 text-goldSand-800'
              }`}
            >
              {statusMeta.label}
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => copyText(order.orderCode, 'code')}
              className="inline-flex items-center gap-2 rounded-xl border border-codGray-100 bg-goldSand-50 px-3.5 py-2 text-xs font-medium text-codGray-900 hover:bg-goldSand-100 transition-colors cursor-pointer"
            >
              {copiedType === 'code' ? <Check size={14} className="text-goldSand-800" /> : <Copy size={14} />}
              <span>{copiedType === 'code' ? 'Kode Disalin' : 'Salin Kode'}</span>
            </button>

            <button
              type="button"
              onClick={() => copyText(statusPageUrl, 'link')}
              className="inline-flex items-center gap-2 rounded-xl border border-codGray-100 bg-goldSand-50 px-3.5 py-2 text-xs font-medium text-codGray-900 hover:bg-goldSand-100 transition-colors cursor-pointer"
            >
              {copiedType === 'link' ? <Check size={14} className="text-goldSand-800" /> : <Link2 size={14} />}
              <span>{copiedType === 'link' ? 'Link Status Disalin' : 'Salin Link Status'}</span>
            </button>
          </div>

          {/* Confirmation CTA Box */}
          <div className="rounded-2xl bg-goldSand-100 p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <p className="text-xs text-codGray-500">Biaya Pemesanan</p>
                <p className="font-ibarra text-3xl font-semibold text-goldSand-800 mt-0.5">
                  Free
                </p>
              </div>
              <p className="text-xs text-codGray-500 max-w-xs">
                Konfirmasi pesanan dan pengiriman foto tambahan (jika ada) dapat dilanjutkan langsung melalui WhatsApp Admin.
              </p>
            </div>

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2.5 rounded-2xl bg-goldSand-300 hover:bg-goldSand-400 px-6 py-3.5 text-sm sm:text-base font-medium text-codGray-950 transition-colors"
            >
              <MessageCircle size={18} />
              <span>Konfirmasi Pesanan via WhatsApp</span>
            </a>
          </div>
        </section>

        {/* Status Timeline */}
        <section className="rounded-2xl bg-white border border-codGray-100 p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-ibarra text-2xl font-semibold text-codGray-950">
              Progres <span className="italic text-goldSand-800">Pengerjaan</span>
            </h2>
            <button
              type="button"
              onClick={fetchOrder}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-goldSand-800 hover:text-codGray-950 cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Muat Ulang</span>
            </button>
          </div>

          {order.status === 'cancelled' ? (
            <p className="text-sm text-codGray-500">
              Pesanan ini berstatus dibatalkan. Silakan hubungi WhatsApp Admin jika Anda ingin mengaktifkannya kembali.
            </p>
          ) : (
            <ol className="space-y-4">
              {ORDER_STATUS_STEPS.map((st, idx) => {
                const isDone = activeStepIndex > idx;
                const isCurrent = activeStepIndex === idx;
                return (
                  <li key={st.key} className="flex items-start gap-4">
                    <span
                      className={`mt-0.5 w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold tabular-nums ${
                        isCurrent
                          ? 'bg-goldSand-800 text-white'
                          : isDone
                            ? 'bg-goldSand-300 text-codGray-950'
                            : 'bg-codGray-50 border border-codGray-100 text-codGray-500'
                      }`}
                    >
                      {isDone ? <Check size={13} strokeWidth={2.5} /> : idx + 1}
                    </span>
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          isCurrent || isDone ? 'text-codGray-950' : 'text-codGray-500'
                        }`}
                      >
                        {st.label}
                      </p>
                      <p className="text-xs text-codGray-500 mt-0.5 leading-relaxed">
                        {st.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* Order Details Summary */}
        <section className="rounded-2xl bg-white border border-codGray-100 p-6 sm:p-8 space-y-5">
          <h2 className="font-ibarra text-2xl font-semibold text-codGray-950">
            Rincian <span className="italic text-goldSand-800">Pesanan</span>
          </h2>

          <dl className="divide-y divide-codGray-100 text-sm">
            <div className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
              <dt className="text-codGray-500">Request Link Undangan</dt>
              <dd className="font-medium text-goldSand-800">
                {BRAND_CONFIG.domain}/{order.requestedSlug}
              </dd>
            </div>

            <div className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
              <dt className="text-codGray-500">Mempelai Pria</dt>
              <dd className="font-medium text-codGray-950 sm:text-right">
                {order.invitationData?.groom?.fullName} ({order.invitationData?.groom?.nickname})
              </dd>
            </div>

            <div className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
              <dt className="text-codGray-500">Mempelai Wanita</dt>
              <dd className="font-medium text-codGray-950 sm:text-right">
                {order.invitationData?.bride?.fullName} ({order.invitationData?.bride?.nickname})
              </dd>
            </div>

            <div className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
              <dt className="text-codGray-500">Tanggal Utama</dt>
              <dd className="font-medium text-codGray-950 sm:text-right">
                {formatDateIndo(order.invitationData?.primaryEventDateTime) || '-'}
              </dd>
            </div>

            <div className="py-3 space-y-1.5">
              <dt className="text-codGray-500">Rangkaian Acara</dt>
              <dd className="space-y-2 pt-1">
                {(order.invitationData?.events || []).map((ev, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl bg-goldSand-50 px-4 py-3 text-xs space-y-0.5"
                  >
                    <p className="font-medium text-codGray-950 text-sm">{ev.name}</p>
                    <p className="text-codGray-900">
                      {ev.dateLabel} · {ev.timeLabel}
                    </p>
                    <p className="text-codGray-500">{ev.address}</p>
                  </div>
                ))}
              </dd>
            </div>

            <div className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
              <dt className="text-codGray-500">Paket &amp; Add-On</dt>
              <dd className="font-medium text-codGray-950 sm:text-right">
                Paket {order.packageName}
                {order.addons?.splitLink ? ` + ${ORDER_ADDONS.splitLink.name}` : ''} · Free
              </dd>
            </div>

            <div className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
              <dt className="text-codGray-500">Nama Pemesan</dt>
              <dd className="font-medium text-codGray-950 sm:text-right">
                {order.contact?.customerName || '-'}
              </dd>
            </div>

            <div className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
              <dt className="text-codGray-500">Kontak WhatsApp</dt>
              <dd className="font-medium text-codGray-950 sm:text-right tabular-nums">
                +{order.contact?.whatsapp}
              </dd>
            </div>
          </dl>

          <div className="pt-2">
            <Link
              to="/order"
              className="text-sm font-medium text-goldSand-800 underline underline-offset-4 hover:text-codGray-950"
            >
              Buat pesanan undangan lainnya
            </Link>
          </div>
        </section>
      </div>
    </OrderShell>
  );
}
