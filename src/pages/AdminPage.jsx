import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  BRAND_CONFIG,
  ORDER_STATUS_META,
} from '../config/orderCatalog';
import { formatRupiah } from '../utils/orderHelpers';
import {
  convertOrderToInvitations,
  createAdminInvitation,
  createAdminMusicPreset,
  createAdminPackage,
  deleteAdminInvitation,
  deleteAdminMusicPreset,
  deleteAdminWish,
  getAdminInvitations,
  getAdminMe,
  getAdminMusicPresets,
  getAdminOrders,
  getAdminPackages,
  getAdminTemplates,
  getAdminWishes,
  updateAdminOrderStatus,
  updateAdminPackage,
  updateAdminWish,
} from '../services/api';
import InvitationEditor from '../components/admin/InvitationEditor';
import ThemesManager from '../components/admin/ThemesManager';

const TABS = [
  { id: 'orders', label: 'Pesanan Masuk' },
  { id: 'invitations', label: 'Undangan' },
  { id: 'themes', label: 'Tema Undangan' },
  { id: 'packages', label: 'Paket & Harga' },
  { id: 'wishes', label: 'Buku Tamu' },
  { id: 'music', label: 'Musik Preset' },
];

const INPUT_CLASS =
  'w-full rounded-xl border border-codGray-100 bg-white px-3.5 py-2.5 text-sm text-codGray-950 focus:border-goldSand-800 focus:outline-none';

export default function AdminPage() {
  const [adminEmail, setAdminEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState('orders');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [orders, setOrders] = useState([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [convertingOrderId, setConvertingOrderId] = useState('');

  const [invitations, setInvitations] = useState([]);
  const [editingInvitationId, setEditingInvitationId] = useState('');
  const [newInvForm, setNewInvForm] = useState({ title: '', slug: '', template_id: '' });
  const [showNewInv, setShowNewInv] = useState(false);

  const [templates, setTemplates] = useState([]);
  const [templateRenderers, setTemplateRenderers] = useState([]);

  const [packages, setPackages] = useState([]);
  const [editingPkgId, setEditingPkgId] = useState('');
  const [pkgDraft, setPkgDraft] = useState({});
  const [newPkgForm, setNewPkgForm] = useState({
    name: '',
    kind: 'package',
    price: 0,
    durationMonths: 12,
    summary: '',
    featuresText: '',
  });
  const [showNewPkg, setShowNewPkg] = useState(false);

  const [wishes, setWishes] = useState([]);
  const [wishInvitationFilter, setWishInvitationFilter] = useState('');

  const [musicPresets, setMusicPresets] = useState([]);
  const [presetForm, setPresetForm] = useState({ title: '', artist: '', category: 'romantis', file: null });
  const [uploadingPreset, setUploadingPreset] = useState(false);

  const [copiedId, setCopiedId] = useState('');

  useEffect(() => {
    document.title = `Admin Studio — ${BRAND_CONFIG.name}`;
  }, []);

  const loadAll = async () => {
    setLoading(true);
    setError('');
    setAuthError('');
    try {
      const me = await getAdminMe();
      setAdminEmail(me?.email || 'admin');
      const [ordRes, invRes, tplRes, pkgRes, wishRes, musicRes] = await Promise.all([
        getAdminOrders(orderStatusFilter),
        getAdminInvitations(),
        getAdminTemplates(),
        getAdminPackages(),
        getAdminWishes(wishInvitationFilter),
        getAdminMusicPresets(),
      ]);
      setOrders(ordRes?.orders || []);
      setInvitations(invRes?.invitations || []);
      setTemplates(tplRes?.templates || []);
      setTemplateRenderers(tplRes?.renderers || []);
      setPackages(pkgRes?.packages || []);
      setWishes(wishRes?.wishes || []);
      setMusicPresets(musicRes?.presets || []);
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        setAuthError(err.message || 'Akses ditolak. Pastikan login melalui Cloudflare Access.');
      } else {
        setError(err.message || 'Gagal memuat data admin.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderStatusFilter, wishInvitationFilter]);

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(key);
      setTimeout(() => setCopiedId(''), 1800);
    });
  };

  const handleOrderStatusChange = async (orderId, status) => {
    try {
      await updateAdminOrderStatus(orderId, status);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleConvertOrder = async (orderId) => {
    setConvertingOrderId(orderId);
    setError('');
    try {
      const res = await convertOrderToInvitations(orderId);
      const created = res?.invitations || [];
      await loadAll();
      if (created[0]?.id) {
        setActiveTab('invitations');
        setEditingInvitationId(created[0].id);
      }
    } catch (err) {
      setError(err.message || 'Gagal membuat draft undangan.');
    } finally {
      setConvertingOrderId('');
    }
  };

  const handleCreateStandaloneInvitation = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        title: newInvForm.title,
        slug: newInvForm.slug,
        ...(newInvForm.template_id ? { template_id: newInvForm.template_id } : {}),
      };
      const res = await createAdminInvitation(payload);
      setNewInvForm({ title: '', slug: '', template_id: '' });
      setShowNewInv(false);
      await loadAll();
      if (res?.invitation?.id) {
        setEditingInvitationId(res.invitation.id);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteInvitation = async (inv) => {
    if (!window.confirm(`Hapus undangan "${inv.title}" (/${inv.slug}) beserta aset R2-nya?`)) return;
    try {
      await deleteAdminInvitation(inv.id);
      setInvitations((prev) => prev.filter((item) => item.id !== inv.id));
    } catch (err) {
      setError(err.message);
    }
  };

  const startEditPackage = (pkg) => {
    setEditingPkgId(pkg.id);
    setPkgDraft({
      name: pkg.name,
      price: pkg.price,
      durationMonths: pkg.durationMonths ?? 12,
      summary: pkg.summary,
      featuresText: (pkg.features || []).join('\n'),
      recommended: pkg.recommended,
      isActive: pkg.isActive,
    });
  };

  const savePackageEdit = async (pkgId, kind) => {
    setError('');
    try {
      const payload = {
        name: pkgDraft.name,
        price: Number(pkgDraft.price) || 0,
        durationMonths: kind === 'addon' ? null : Number(pkgDraft.durationMonths) || 12,
        summary: pkgDraft.summary,
        features: String(pkgDraft.featuresText || '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        recommended: Boolean(pkgDraft.recommended),
        isActive: Boolean(pkgDraft.isActive),
      };
      const res = await updateAdminPackage(pkgId, payload);
      setPackages((prev) => prev.map((p) => (p.id === pkgId ? res.package : p)));
      setEditingPkgId('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreatePackage = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await createAdminPackage({
        name: newPkgForm.name,
        kind: newPkgForm.kind,
        price: Number(newPkgForm.price) || 0,
        durationMonths: newPkgForm.kind === 'addon' ? null : Number(newPkgForm.durationMonths) || 12,
        summary: newPkgForm.summary,
        features: newPkgForm.featuresText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setPackages((prev) => [...prev, res.package]);
      setNewPkgForm({
        name: '',
        kind: 'package',
        price: 0,
        durationMonths: 12,
        summary: '',
        featuresText: '',
      });
      setShowNewPkg(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleWishHidden = async (wish) => {
    try {
      const nextHidden = !wish.is_hidden;
      await updateAdminWish(wish.id, { is_hidden: nextHidden });
      setWishes((prev) =>
        prev.map((w) => (w.id === wish.id ? { ...w, is_hidden: nextHidden ? 1 : 0 } : w))
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteWish = async (wishId) => {
    if (!window.confirm('Hapus ucapan ini secara permanen?')) return;
    try {
      await deleteAdminWish(wishId);
      setWishes((prev) => prev.filter((w) => w.id !== wishId));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUploadPreset = async (e) => {
    e.preventDefault();
    if (!presetForm.title.trim() || !presetForm.file) return;
    setUploadingPreset(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('title', presetForm.title.trim());
      formData.append('artist', presetForm.artist.trim());
      formData.append('category', presetForm.category);
      formData.append('file', presetForm.file);
      const res = await createAdminMusicPreset(formData);
      if (res?.preset) {
        setMusicPresets((prev) => [res.preset, ...prev]);
      }
      setPresetForm({ title: '', artist: '', category: 'romantis', file: null });
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingPreset(false);
    }
  };

  const handleDeletePreset = async (id) => {
    if (!window.confirm('Hapus preset musik ini?')) return;
    try {
      await deleteAdminMusicPreset(id);
      setMusicPresets((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  if (authError) {
    return (
      <div className="min-h-screen bg-goldSand-50 font-dm flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-white border border-codGray-100 p-8 space-y-4">
          <h1 className="font-ibarra text-3xl font-semibold text-codGray-950">Akses Terbatas</h1>
          <p className="text-sm text-codGray-600 leading-relaxed">{authError}</p>
          <Link
            to="/adi-eva"
            className="inline-block rounded-2xl border border-codGray-900 px-5 py-2.5 text-sm font-medium text-codGray-900"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-goldSand-50 font-dm text-codGray-900 flex flex-col">
      <header className="sticky top-0 z-30 bg-goldSand-50 border-b border-goldSand-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={BRAND_CONFIG.logoUrl} alt={BRAND_CONFIG.name} className="w-8 h-8 object-contain" />
            <div>
              <h1 className="font-ibarra text-xl font-semibold text-codGray-950 leading-none">
                {BRAND_CONFIG.name} Studio
              </h1>
              {adminEmail && <p className="text-xs text-codGray-500 mt-0.5">{adminEmail}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/order"
              className="text-xs font-medium text-codGray-700 hover:text-codGray-950 underline underline-offset-4"
            >
              Form Order
            </Link>
            <Link
              to="/adi-eva"
              className="text-xs font-medium text-codGray-700 hover:text-codGray-950 underline underline-offset-4"
            >
              Demo
            </Link>
            <button
              type="button"
              onClick={loadAll}
              className="inline-flex items-center gap-1.5 rounded-xl border border-codGray-200 bg-white px-3 py-1.5 text-xs font-medium text-codGray-900 hover:bg-codGray-50 cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Muat Ulang</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Tabs */}
        {!editingInvitationId && (
          <nav className="flex flex-wrap gap-2 border-b border-goldSand-200 pb-4">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-codGray-950 text-white'
                    : 'bg-white border border-codGray-100 text-codGray-800 hover:bg-goldSand-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        )}

        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading && !editingInvitationId ? (
          <div className="rounded-2xl bg-white border border-codGray-100 p-10 text-center text-sm text-codGray-500">
            Memuat data studio...
          </div>
        ) : editingInvitationId ? (
          <InvitationEditor
            invitationId={editingInvitationId}
            musicPresets={musicPresets}
            templates={templates}
            onBack={() => {
              setEditingInvitationId('');
              loadAll();
            }}
            onSaved={() => {}}
          />
        ) : activeTab === 'orders' ? (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-ibarra text-3xl font-semibold text-codGray-950">Pesanan Masuk</h2>
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="rounded-xl border border-codGray-100 bg-white px-3.5 py-2 text-sm text-codGray-950"
              >
                <option value="">Semua Status</option>
                <option value="pending_confirmation">Menunggu Konfirmasi</option>
                <option value="pending_payment">Menunggu Pembayaran</option>
                <option value="in_progress">Sedang Dikerjakan</option>
                <option value="preview_ready">Siap Preview</option>
                <option value="published">Undangan Aktif</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </div>

            {orders.length === 0 ? (
              <div className="rounded-2xl bg-white border border-codGray-100 p-8 text-center text-sm text-codGray-500">
                Belum ada pesanan pada filter ini.
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => {
                  const statusMeta =
                    ORDER_STATUS_META[order.status] || ORDER_STATUS_META.pending_confirmation;
                  const couple = [
                    order.invitationData?.groom?.nickname,
                    order.invitationData?.bride?.nickname,
                  ]
                    .filter(Boolean)
                    .join(' & ');

                  return (
                    <div
                      key={order.id}
                      className="rounded-2xl bg-white border border-codGray-100 p-5 space-y-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-ibarra text-2xl font-semibold text-codGray-950 tabular-nums">
                              {order.order_code}
                            </span>
                            <span className="rounded-full bg-goldSand-100 px-3 py-0.5 text-xs font-medium text-goldSand-800">
                              {statusMeta.label}
                            </span>
                            <span className="rounded-full bg-codGray-50 px-3 py-0.5 text-xs font-medium text-codGray-900 tabular-nums">
                              {formatRupiah(order.total_price)}
                            </span>
                          </div>
                          <p className="text-sm text-codGray-900 mt-1">
                            {order.customer_name} · Mempelai: <strong>{couple || '-'}</strong> · Paket{' '}
                            {order.package_name}
                            {order.has_split_link ? ' + Split Link' : ''}
                            {order.has_mepandes ? ' + Mepandes' : ''}
                          </p>
                          <p className="text-xs text-codGray-500 mt-0.5">
                            Request slug: <strong>/{order.requested_slug}</strong> · WA: +{order.whatsapp}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={order.status}
                            onChange={(e) => handleOrderStatusChange(order.id, e.target.value)}
                            className="rounded-xl border border-codGray-100 bg-white px-3 py-2 text-xs text-codGray-950"
                          >
                            <option value="pending_confirmation">Menunggu Konfirmasi</option>
                            <option value="pending_payment">Menunggu Pembayaran</option>
                            <option value="in_progress">Sedang Dikerjakan</option>
                            <option value="preview_ready">Siap Preview</option>
                            <option value="published">Undangan Aktif</option>
                            <option value="cancelled">Dibatalkan</option>
                          </select>

                          {order.invitations?.length > 0 ? (
                            order.invitations.map((inv) => (
                              <button
                                key={inv.id}
                                type="button"
                                onClick={() => {
                                  setActiveTab('invitations');
                                  setEditingInvitationId(inv.id);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-codGray-950 px-3.5 py-2 text-xs font-medium text-white cursor-pointer"
                              >
                                <Edit3 size={13} />
                                <span>Edit /{inv.slug}</span>
                              </button>
                            ))
                          ) : (
                            <button
                              type="button"
                              disabled={convertingOrderId === order.id}
                              onClick={() => handleConvertOrder(order.id)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-goldSand-300 hover:bg-goldSand-400 px-3.5 py-2 text-xs font-medium text-codGray-950 cursor-pointer disabled:opacity-50"
                            >
                              {convertingOrderId === order.id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Plus size={13} />
                              )}
                              <span>Buat Draft Undangan</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        <a
                          href={`https://wa.me/${order.whatsapp}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-codGray-100 bg-goldSand-50 px-3 py-1.5 text-codGray-900 hover:bg-goldSand-100"
                        >
                          <ExternalLink size={12} />
                          <span>Chat WA Pemesan</span>
                        </a>
                        {order.photo_drive_url && (
                          <a
                            href={order.photo_drive_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-codGray-100 bg-goldSand-50 px-3 py-1.5 text-codGray-900 hover:bg-goldSand-100"
                          >
                            <ExternalLink size={12} />
                            <span>Buka Google Drive Foto</span>
                          </a>
                        )}
                        {order.notes && (
                          <span className="rounded-lg bg-codGray-50 px-3 py-1.5 text-codGray-700">
                            Catatan: {order.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : activeTab === 'invitations' ? (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-ibarra text-3xl font-semibold text-codGray-950">Daftar Undangan</h2>
              <button
                type="button"
                onClick={() => setShowNewInv(!showNewInv)}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-goldSand-300 hover:bg-goldSand-400 px-4 py-2 text-xs font-medium text-codGray-950 cursor-pointer"
              >
                <Plus size={14} />
                <span>Buat Undangan Baru</span>
              </button>
            </div>

            {showNewInv && (
              <form
                onSubmit={handleCreateStandaloneInvitation}
                className="rounded-2xl bg-white border border-codGray-100 p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
              >
                <div>
                  <label className="block text-xs font-medium text-codGray-900 mb-1">Judul Mempelai</label>
                  <input
                    type="text"
                    required
                    placeholder="Budi & Sari"
                    value={newInvForm.title}
                    onChange={(e) => setNewInvForm((p) => ({ ...p, title: e.target.value }))}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-codGray-900 mb-1">Slug URL</label>
                  <input
                    type="text"
                    required
                    placeholder="budi-sari"
                    value={newInvForm.slug}
                    onChange={(e) =>
                      setNewInvForm((p) => ({
                        ...p,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-codGray-900 mb-1">Tema</label>
                  <select
                    value={newInvForm.template_id}
                    onChange={(e) => setNewInvForm((p) => ({ ...p, template_id: e.target.value }))}
                    className={INPUT_CLASS}
                  >
                    <option value="">Default (Tema Aktif Pertama)</option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name}
                        {tpl.isActive ? '' : ' (Nonaktif)'}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="rounded-xl bg-codGray-950 text-white px-4 py-2.5 text-sm font-medium cursor-pointer"
                >
                  Buat Draft
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {invitations.map((inv) => {
                const origin = window.location.origin;
                const publicUrl = `${origin}/${inv.slug}`;
                const previewUrl = `${origin}/${inv.slug}?preview=${encodeURIComponent(inv.preview_token)}`;
                const customNameUrl = `${origin}/${inv.slug}/custom-name`;
                return (
                  <div
                    key={inv.id}
                    className="rounded-2xl bg-white border border-codGray-100 p-5 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-ibarra text-2xl font-semibold text-codGray-950">
                            {inv.title}
                          </h3>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              inv.status === 'published'
                                ? 'bg-codGray-950 text-white'
                                : 'bg-goldSand-100 text-goldSand-800'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>
                        <p className="text-xs text-codGray-500 mt-1">
                          /{inv.slug} · Tema: {inv.template_name || inv.template_id} · {inv.wishes_count} ucapan
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingInvitationId(inv.id)}
                          className="inline-flex items-center gap-1 rounded-xl bg-goldSand-300 hover:bg-goldSand-400 px-3 py-1.5 text-xs font-medium text-codGray-950 cursor-pointer"
                        >
                          <Edit3 size={13} />
                          <span>Edit Studio</span>
                        </button>
                        {inv.slug !== 'adi-eva' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteInvitation(inv)}
                            className="p-2 rounded-xl text-red-700 hover:bg-red-50 cursor-pointer"
                            title="Hapus undangan"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => copyText(publicUrl, `${inv.id}-pub`)}
                        className="inline-flex items-center gap-1 rounded-lg border border-codGray-100 bg-goldSand-50 px-2.5 py-1.5 text-codGray-900 cursor-pointer"
                      >
                        {copiedId === `${inv.id}-pub` ? <Check size={12} /> : <Copy size={12} />}
                        <span>Link Publik</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(previewUrl, `${inv.id}-prev`)}
                        className="inline-flex items-center gap-1 rounded-lg border border-codGray-100 bg-goldSand-50 px-2.5 py-1.5 text-codGray-900 cursor-pointer"
                      >
                        {copiedId === `${inv.id}-prev` ? <Check size={12} /> : <Copy size={12} />}
                        <span>Link Preview</span>
                      </button>
                      <a
                        href={customNameUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-codGray-100 bg-white px-2.5 py-1.5 text-codGray-900"
                      >
                        <ExternalLink size={12} />
                        <span>Custom Name</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : activeTab === 'themes' ? (
          <ThemesManager
            templates={templates}
            renderers={templateRenderers}
            invitations={invitations}
            onTemplatesChange={setTemplates}
          />
        ) : activeTab === 'packages' ? (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-ibarra text-3xl font-semibold text-codGray-950">
                  Paket &amp; Harga
                </h2>
                <p className="text-xs text-codGray-500 mt-1">
                  Harga 0 otomatis tampil sebagai <strong>Free</strong> di halaman /order. Harga &gt; 0 tampil dalam Rupiah.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewPkg(!showNewPkg)}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-goldSand-300 hover:bg-goldSand-400 px-4 py-2 text-xs font-medium text-codGray-950 cursor-pointer"
              >
                <Plus size={14} />
                <span>Tambah Paket / Add-On</span>
              </button>
            </div>

            {showNewPkg && (
              <form
                onSubmit={handleCreatePackage}
                className="rounded-2xl bg-white border border-codGray-100 p-5 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Nama paket"
                    value={newPkgForm.name}
                    onChange={(e) => setNewPkgForm((p) => ({ ...p, name: e.target.value }))}
                    className={INPUT_CLASS}
                  />
                  <select
                    value={newPkgForm.kind}
                    onChange={(e) => setNewPkgForm((p) => ({ ...p, kind: e.target.value }))}
                    className={INPUT_CLASS}
                  >
                    <option value="package">Paket Utama</option>
                    <option value="addon">Add-On</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    placeholder="Harga (0 = Free)"
                    value={newPkgForm.price}
                    onChange={(e) => setNewPkgForm((p) => ({ ...p, price: e.target.value }))}
                    className={INPUT_CLASS}
                  />
                  <input
                    type="number"
                    min="1"
                    disabled={newPkgForm.kind === 'addon'}
                    placeholder="Durasi (bulan)"
                    value={newPkgForm.durationMonths}
                    onChange={(e) =>
                      setNewPkgForm((p) => ({ ...p, durationMonths: e.target.value }))
                    }
                    className={INPUT_CLASS}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Ringkasan singkat"
                  value={newPkgForm.summary}
                  onChange={(e) => setNewPkgForm((p) => ({ ...p, summary: e.target.value }))}
                  className={INPUT_CLASS}
                />
                <textarea
                  rows={3}
                  placeholder="Daftar fitur (1 baris per fitur)"
                  value={newPkgForm.featuresText}
                  onChange={(e) => setNewPkgForm((p) => ({ ...p, featuresText: e.target.value }))}
                  className={INPUT_CLASS}
                />
                <button
                  type="submit"
                  className="rounded-xl bg-codGray-950 text-white px-4 py-2 text-xs font-medium cursor-pointer"
                >
                  Simpan Paket Baru
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {packages.map((pkg) => {
                const isEditing = editingPkgId === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    className="rounded-2xl bg-white border border-codGray-100 p-5 space-y-3"
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-xs text-codGray-500 mb-1">Nama</label>
                            <input
                              type="text"
                              value={pkgDraft.name}
                              onChange={(e) =>
                                setPkgDraft((d) => ({ ...d, name: e.target.value }))
                              }
                              className={INPUT_CLASS}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-codGray-500 mb-1">
                              Harga (Rp, 0 = Free)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={pkgDraft.price}
                              onChange={(e) =>
                                setPkgDraft((d) => ({ ...d, price: e.target.value }))
                              }
                              className={INPUT_CLASS}
                            />
                          </div>
                        </div>
                        {pkg.kind === 'package' && (
                          <div>
                            <label className="block text-xs text-codGray-500 mb-1">
                              Durasi Aktif (bulan)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={pkgDraft.durationMonths}
                              onChange={(e) =>
                                setPkgDraft((d) => ({ ...d, durationMonths: e.target.value }))
                              }
                              className={INPUT_CLASS}
                            />
                          </div>
                        )}
                        <input
                          type="text"
                          value={pkgDraft.summary}
                          onChange={(e) =>
                            setPkgDraft((d) => ({ ...d, summary: e.target.value }))
                          }
                          className={INPUT_CLASS}
                        />
                        {pkg.kind === 'package' && (
                          <textarea
                            rows={3}
                            value={pkgDraft.featuresText}
                            onChange={(e) =>
                              setPkgDraft((d) => ({ ...d, featuresText: e.target.value }))
                            }
                            className={INPUT_CLASS}
                          />
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-xs">
                          <label className="inline-flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={Boolean(pkgDraft.isActive)}
                              onChange={(e) =>
                                setPkgDraft((d) => ({ ...d, isActive: e.target.checked }))
                              }
                            />
                            <span>Aktif di /order</span>
                          </label>
                          {pkg.kind === 'package' && (
                            <label className="inline-flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={Boolean(pkgDraft.recommended)}
                                onChange={(e) =>
                                  setPkgDraft((d) => ({ ...d, recommended: e.target.checked }))
                                }
                              />
                              <span>Badge Rekomendasi</span>
                            </label>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => savePackageEdit(pkg.id, pkg.kind)}
                            className="rounded-xl bg-goldSand-300 hover:bg-goldSand-400 px-4 py-2 text-xs font-medium text-codGray-950 cursor-pointer"
                          >
                            Simpan
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPkgId('')}
                            className="rounded-xl border border-codGray-200 px-4 py-2 text-xs font-medium cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-ibarra text-2xl font-semibold text-codGray-950">
                                {pkg.name}
                              </h3>
                              <span className="rounded-full bg-goldSand-100 px-2.5 py-0.5 text-xs font-medium text-goldSand-800">
                                {pkg.kind === 'addon' ? 'Add-On' : 'Paket'}
                              </span>
                              {!pkg.isActive && (
                                <span className="rounded-full bg-codGray-100 px-2.5 py-0.5 text-xs text-codGray-500">
                                  Nonaktif
                                </span>
                              )}
                            </div>
                            <p className="font-ibarra text-2xl font-semibold text-goldSand-800 mt-1 tabular-nums">
                              {formatRupiah(pkg.price)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => startEditPackage(pkg)}
                            className="inline-flex items-center gap-1 rounded-xl border border-codGray-200 px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-codGray-50"
                          >
                            <Edit3 size={13} />
                            <span>Ubah Harga</span>
                          </button>
                        </div>
                        {pkg.summary && <p className="text-xs text-codGray-500">{pkg.summary}</p>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ) : activeTab === 'wishes' ? (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-ibarra text-3xl font-semibold text-codGray-950">
                Moderasi Buku Tamu
              </h2>
              <select
                value={wishInvitationFilter}
                onChange={(e) => setWishInvitationFilter(e.target.value)}
                className="rounded-xl border border-codGray-100 bg-white px-3.5 py-2 text-sm text-codGray-950"
              >
                <option value="">Semua Undangan</option>
                {invitations.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.title} (/{inv.slug})
                  </option>
                ))}
              </select>
            </div>

            {wishes.length === 0 ? (
              <div className="rounded-2xl bg-white border border-codGray-100 p-8 text-center text-sm text-codGray-500">
                Belum ada ucapan buku tamu.
              </div>
            ) : (
              <div className="space-y-2.5">
                {wishes.map((wish) => (
                  <div
                    key={wish.id}
                    className={`rounded-2xl bg-white border border-codGray-100 p-4 flex flex-wrap items-start justify-between gap-4 ${
                      wish.is_hidden ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <strong className="text-sm text-codGray-950">{wish.guest_name}</strong>
                        <span className="rounded-full bg-goldSand-100 px-2.5 py-0.5 text-goldSand-800">
                          {wish.attendance}
                        </span>
                        <span className="text-codGray-500">/{wish.invitation_slug}</span>
                        {Boolean(wish.is_hidden) && (
                          <span className="rounded-full bg-codGray-100 px-2 py-0.5 text-codGray-600">
                            Disembunyikan
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-codGray-800">{wish.message}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleWishHidden(wish)}
                        className="inline-flex items-center gap-1 rounded-xl border border-codGray-200 px-3 py-1.5 text-xs font-medium cursor-pointer"
                      >
                        {wish.is_hidden ? <Eye size={13} /> : <EyeOff size={13} />}
                        <span>{wish.is_hidden ? 'Tampilkan' : 'Sembunyikan'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteWish(wish.id)}
                        className="p-2 rounded-xl text-red-700 hover:bg-red-50 cursor-pointer"
                        title="Hapus ucapan"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-4">
            <h2 className="font-ibarra text-3xl font-semibold text-codGray-950">Musik Preset</h2>

            <form
              onSubmit={handleUploadPreset}
              className="rounded-2xl bg-white border border-codGray-100 p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
            >
              <div>
                <label className="block text-xs font-medium text-codGray-900 mb-1">Judul Lagu</label>
                <input
                  type="text"
                  required
                  placeholder="Romantic Acoustic"
                  value={presetForm.title}
                  onChange={(e) => setPresetForm((p) => ({ ...p, title: e.target.value }))}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-codGray-900 mb-1">Artis / Sumber</label>
                <input
                  type="text"
                  placeholder="Ansel Moments"
                  value={presetForm.artist}
                  onChange={(e) => setPresetForm((p) => ({ ...p, artist: e.target.value }))}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-codGray-900 mb-1">File MP3</label>
                <input
                  type="file"
                  accept="audio/mpeg,.mp3"
                  required
                  onChange={(e) =>
                    setPresetForm((p) => ({ ...p, file: e.target.files?.[0] || null }))
                  }
                  className="text-xs text-codGray-700"
                />
              </div>
              <button
                type="submit"
                disabled={uploadingPreset}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-goldSand-300 hover:bg-goldSand-400 px-4 py-2.5 text-sm font-medium text-codGray-950 cursor-pointer disabled:opacity-50"
              >
                {uploadingPreset && <Loader2 size={14} className="animate-spin" />}
                <span>Upload Preset</span>
              </button>
            </form>

            <div className="space-y-2.5">
              {musicPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="rounded-2xl bg-white border border-codGray-100 p-4 flex flex-wrap items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-medium text-codGray-950">{preset.title}</p>
                    <p className="text-xs text-codGray-500">
                      {preset.artist || 'Tanpa keterangan artis'} · {preset.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <audio controls src={preset.public_url} className="h-8" />
                    {preset.id !== 'backsound-adi-eva' && (
                      <button
                        type="button"
                        onClick={() => handleDeletePreset(preset.id)}
                        className="p-2 rounded-xl text-red-700 hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
