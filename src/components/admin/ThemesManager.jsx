import React, { useState } from 'react';
import {
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Folder,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  createAdminTemplate,
  deleteAdminTemplate,
  updateAdminTemplate,
  uploadAdminMedia,
} from '../../services/api';
import { slugifyText } from '../../utils/orderHelpers';

const INPUT_CLASS =
  'w-full rounded-xl border border-codGray-100 bg-white px-3.5 py-2.5 text-sm text-codGray-950 focus:border-goldSand-800 focus:outline-none';

function createEmptyThemeForm(defaultRendererKey = 'editorial-classic', nextSortOrder = 1) {
  return {
    id: '',
    idEdited: false,
    rendererKey: defaultRendererKey,
    name: '',
    tag: '',
    description: '',
    demoUrl: '',
    previewImage: '',
    isActive: true,
    sortOrder: nextSortOrder,
  };
}

export default function ThemesManager({
  templates = [],
  renderers = [],
  invitations = [],
  onTemplatesChange,
}) {
  const defaultRendererKey = renderers[0]?.key || 'editorial-classic';
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(() =>
    createEmptyThemeForm(defaultRendererKey, templates.length + 1)
  );
  const [editingId, setEditingId] = useState('');
  const [editDraft, setEditDraft] = useState(null);
  const [busyKey, setBusyKey] = useState('');
  const [uploadingTarget, setUploadingTarget] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const activeCount = templates.filter((t) => t.isActive).length;
  const totalLinkedInvitations = templates.reduce(
    (sum, t) => sum + (Number(t.invitationsCount) || 0),
    0
  );

  const handleUploadThumbnail = async (file, target) => {
    if (!file) return;
    setUploadingTarget(target);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('slug', 'theme-previews');
      const res = await uploadAdminMedia(formData);
      const publicUrl = res?.asset?.public_url || '';
      if (!publicUrl) throw new Error('URL thumbnail tidak diterima dari server.');
      if (target === 'create') {
        setCreateForm((prev) => ({ ...prev, previewImage: publicUrl }));
      } else {
        setEditDraft((prev) => (prev ? { ...prev, previewImage: publicUrl } : prev));
      }
      setNotice('Thumbnail berhasil diunggah ke R2.');
    } catch (err) {
      setError(err?.message || 'Gagal mengunggah thumbnail tema.');
    } finally {
      setUploadingTarget('');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setBusyKey('create');
    setError('');
    setNotice('');
    try {
      const res = await createAdminTemplate({
        id: createForm.id || slugifyText(createForm.name),
        rendererKey: createForm.rendererKey,
        name: createForm.name,
        tag: createForm.tag,
        description: createForm.description,
        demoUrl: createForm.demoUrl,
        previewImage: createForm.previewImage,
        isActive: createForm.isActive,
        sortOrder: Number(createForm.sortOrder) || 0,
      });
      const created = res?.template;
      if (created) {
        onTemplatesChange((prev) =>
          [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder)
        );
      }
      setCreateForm(createEmptyThemeForm(defaultRendererKey, templates.length + 2));
      setShowCreate(false);
      setNotice(`Tema "${created?.name || createForm.name}" berhasil ditambahkan.`);
    } catch (err) {
      setError(err?.message || 'Gagal menambahkan tema baru.');
    } finally {
      setBusyKey('');
    }
  };

  const startEdit = (tpl) => {
    setError('');
    setNotice('');
    setEditingId(tpl.id);
    setEditDraft({
      rendererKey: tpl.rendererKey || defaultRendererKey,
      name: tpl.name,
      tag: tpl.tag || '',
      description: tpl.description || '',
      demoUrl: tpl.demoUrl || '',
      previewImage: tpl.previewImage || '',
      isActive: Boolean(tpl.isActive),
      sortOrder: Number(tpl.sortOrder) || 0,
    });
  };

  const handleSaveEdit = async (id) => {
    if (!editDraft) return;
    setBusyKey(`save-${id}`);
    setError('');
    setNotice('');
    try {
      const res = await updateAdminTemplate(id, {
        rendererKey: editDraft.rendererKey,
        name: editDraft.name,
        tag: editDraft.tag,
        description: editDraft.description,
        demoUrl: editDraft.demoUrl,
        previewImage: editDraft.previewImage,
        isActive: Boolean(editDraft.isActive),
        sortOrder: Number(editDraft.sortOrder) || 0,
      });
      if (res?.template) {
        onTemplatesChange((prev) =>
          prev
            .map((item) => (item.id === id ? res.template : item))
            .sort((a, b) => a.sortOrder - b.sortOrder)
        );
      }
      setEditingId('');
      setEditDraft(null);
      setNotice('Perubahan tema berhasil disimpan.');
    } catch (err) {
      setError(err?.message || 'Gagal memperbarui tema.');
    } finally {
      setBusyKey('');
    }
  };

  const handleToggleActive = async (tpl) => {
    setBusyKey(`toggle-${tpl.id}`);
    setError('');
    setNotice('');
    try {
      const res = await updateAdminTemplate(tpl.id, { isActive: !tpl.isActive });
      if (res?.template) {
        onTemplatesChange((prev) =>
          prev.map((item) => (item.id === tpl.id ? res.template : item))
        );
      }
    } catch (err) {
      setError(err?.message || 'Gagal mengubah status tema.');
    } finally {
      setBusyKey('');
    }
  };

  const handleDelete = async (tpl) => {
    if (!window.confirm(`Hapus tema "${tpl.name}" (${tpl.id}) secara permanen?`)) return;
    setBusyKey(`delete-${tpl.id}`);
    setError('');
    setNotice('');
    try {
      await deleteAdminTemplate(tpl.id);
      onTemplatesChange((prev) => prev.filter((item) => item.id !== tpl.id));
      setNotice(`Tema "${tpl.name}" telah dihapus.`);
    } catch (err) {
      setError(err?.message || 'Gagal menghapus tema.');
    } finally {
      setBusyKey('');
    }
  };

  return (
    <section className="space-y-5">
      <datalist id="demo-slug-suggestions">
        {invitations.map((inv) => (
          <option key={inv.id} value={`/${inv.slug}`}>
            {inv.title}
          </option>
        ))}
      </datalist>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-ibarra text-3xl font-semibold text-codGray-950">Tema Undangan</h2>
          <p className="text-xs text-codGray-500 mt-1">
            Kelola katalog tema yang tampil di halaman /order serta pemetaannya ke folder template React.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowCreate((prev) => !prev);
            setError('');
            setNotice('');
          }}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-goldSand-300 hover:bg-goldSand-400 px-4 py-2 text-xs font-medium text-codGray-950 cursor-pointer"
        >
          <Plus size={14} />
          <span>{showCreate ? 'Tutup Form' : 'Tambah Tema'}</span>
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-white border border-codGray-100 p-4">
          <p className="text-xs text-codGray-500">Total Tema</p>
          <p className="font-ibarra text-3xl font-semibold text-codGray-950 mt-1 tabular-nums">
            {templates.length}
          </p>
        </div>
        <div className="rounded-2xl bg-white border border-codGray-100 p-4">
          <p className="text-xs text-codGray-500">Aktif di /order</p>
          <p className="font-ibarra text-3xl font-semibold text-goldSand-800 mt-1 tabular-nums">
            {activeCount}
          </p>
        </div>
        <div className="rounded-2xl bg-white border border-codGray-100 p-4">
          <p className="text-xs text-codGray-500">Undangan Terhubung</p>
          <p className="font-ibarra text-3xl font-semibold text-codGray-950 mt-1 tabular-nums">
            {totalLinkedInvitations}
          </p>
        </div>
        <div className="rounded-2xl bg-white border border-codGray-100 p-4">
          <p className="text-xs text-codGray-500">Folder Renderer</p>
          <p className="font-ibarra text-3xl font-semibold text-codGray-950 mt-1 tabular-nums">
            {renderers.length}
          </p>
        </div>
      </div>

      {activeCount === 0 && (
        <div className="rounded-xl border border-goldSand-300 bg-goldSand-100 px-4 py-3 text-xs text-codGray-950">
          Belum ada tema yang aktif. Aktifkan minimal satu tema agar pelanggan dapat memilih tema di halaman <code>/order</code>.
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-goldSand-200 bg-goldSand-100 px-4 py-3 text-xs text-codGray-950">
          {notice}
        </div>
      )}

      {/* Create Theme Form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl bg-white border border-codGray-100 p-5 space-y-4"
        >
          <h3 className="font-ibarra text-2xl font-semibold text-codGray-950">Tambah Tema Baru</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-codGray-900 mb-1">Nama Tema *</label>
              <input
                type="text"
                required
                placeholder="Bali Heritage"
                value={createForm.name}
                onChange={(e) => {
                  const nextName = e.target.value;
                  setCreateForm((prev) => ({
                    ...prev,
                    name: nextName,
                    id: prev.idEdited ? prev.id : slugifyText(nextName),
                  }));
                }}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-codGray-900 mb-1">ID / Slug Tema *</label>
              <input
                type="text"
                required
                placeholder="bali-heritage"
                value={createForm.id}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    idEdited: true,
                    id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                  }))
                }
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-codGray-900 mb-1">
                Folder Template (Renderer) *
              </label>
              <select
                value={createForm.rendererKey}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, rendererKey: e.target.value }))
                }
                className={INPUT_CLASS}
              >
                {renderers.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label} — {r.folder}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-codGray-900 mb-1">Tag / Label</label>
              <input
                type="text"
                placeholder="Populer / Terbaru"
                value={createForm.tag}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, tag: e.target.value }))}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-codGray-900 mb-1">URL Demo</label>
              <input
                type="text"
                list="demo-slug-suggestions"
                placeholder="/adi-eva"
                value={createForm.demoUrl}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, demoUrl: e.target.value }))}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-codGray-900 mb-1">Urutan Tampil</label>
              <input
                type="number"
                min="0"
                value={createForm.sortOrder}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, sortOrder: e.target.value }))
                }
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-codGray-900 mb-1">Deskripsi Singkat</label>
            <textarea
              rows={2}
              placeholder="Gaya editorial hangat dengan tipografi serif klasik..."
              value={createForm.description}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
              className={INPUT_CLASS}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-codGray-900">
              Thumbnail Preview (URL atau Upload R2)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="/assets/img/GIK-1.png atau https://..."
                value={createForm.previewImage}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, previewImage: e.target.value }))
                }
                className={`${INPUT_CLASS} flex-1 min-w-[220px]`}
              />
              <label className="inline-flex items-center gap-1.5 rounded-xl border border-codGray-200 bg-white hover:bg-codGray-50 px-3.5 py-2.5 text-xs font-medium text-codGray-900 cursor-pointer shrink-0">
                {uploadingTarget === 'create' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Upload size={14} />
                )}
                <span>Upload Gambar</span>
                <input
                  type="file"
                  accept="image/webp,image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    handleUploadThumbnail(file, 'create');
                  }}
                />
              </label>
            </div>
            {createForm.previewImage && (
              <div className="w-36 aspect-[4/3] rounded-xl overflow-hidden border border-codGray-100 bg-codGray-50">
                <img
                  src={createForm.previewImage}
                  alt="Preview thumbnail"
                  className="w-full h-full object-cover object-top"
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-codGray-100">
            <label className="inline-flex items-center gap-2 text-xs text-codGray-900 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(createForm.isActive)}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, isActive: e.target.checked }))
                }
              />
              <span>Langsung aktifkan di halaman /order</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-xl border border-codGray-200 px-4 py-2 text-xs font-medium text-codGray-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={busyKey === 'create'}
                className="inline-flex items-center gap-1.5 rounded-xl bg-codGray-950 text-white px-4 py-2 text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                {busyKey === 'create' && <Loader2 size={13} className="animate-spin" />}
                <span>Simpan Tema</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Themes Grid */}
      {templates.length === 0 ? (
        <div className="rounded-2xl bg-white border border-codGray-100 p-8 text-center text-sm text-codGray-500">
          Belum ada tema terdaftar di database.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tpl) => {
            const isEditing = editingId === tpl.id && editDraft;
            const inUse =
              (Number(tpl.ordersCount) || 0) > 0 || (Number(tpl.invitationsCount) || 0) > 0;

            return (
              <div
                key={tpl.id}
                className={`rounded-2xl bg-white border overflow-hidden flex flex-col ${
                  tpl.isActive ? 'border-codGray-100' : 'border-codGray-100 opacity-80'
                }`}
              >
                {isEditing ? (
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-ibarra text-2xl font-semibold text-codGray-950">
                        Edit Tema
                      </h3>
                      <code className="rounded-lg bg-codGray-50 px-2 py-0.5 text-xs text-codGray-600">
                        {tpl.id}
                      </code>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs text-codGray-500 mb-1">Nama Tema</label>
                        <input
                          type="text"
                          value={editDraft.name}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, name: e.target.value }))
                          }
                          className={INPUT_CLASS}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-codGray-500 mb-1">Tag</label>
                        <input
                          type="text"
                          value={editDraft.tag}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, tag: e.target.value }))
                          }
                          className={INPUT_CLASS}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-codGray-500 mb-1">
                        Folder Template (Renderer)
                      </label>
                      <select
                        value={editDraft.rendererKey}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, rendererKey: e.target.value }))
                        }
                        className={INPUT_CLASS}
                      >
                        {renderers.map((r) => (
                          <option key={r.key} value={r.key}>
                            {r.label} — {r.folder}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-codGray-500 mb-1">URL Demo</label>
                        <input
                          type="text"
                          list="demo-slug-suggestions"
                          value={editDraft.demoUrl}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, demoUrl: e.target.value }))
                          }
                          className={INPUT_CLASS}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-codGray-500 mb-1">Urutan</label>
                        <input
                          type="number"
                          min="0"
                          value={editDraft.sortOrder}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, sortOrder: e.target.value }))
                          }
                          className={INPUT_CLASS}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-codGray-500 mb-1">Deskripsi</label>
                      <textarea
                        rows={2}
                        value={editDraft.description}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, description: e.target.value }))
                        }
                        className={INPUT_CLASS}
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-codGray-500 mb-1">
                        Thumbnail Preview
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editDraft.previewImage}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, previewImage: e.target.value }))
                          }
                          className={`${INPUT_CLASS} flex-1`}
                        />
                        <label className="inline-flex items-center gap-1 rounded-xl border border-codGray-200 px-3 py-2 text-xs font-medium text-codGray-900 hover:bg-codGray-50 cursor-pointer shrink-0">
                          {uploadingTarget === tpl.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Upload size={13} />
                          )}
                          <span>Upload</span>
                          <input
                            type="file"
                            accept="image/webp,image/jpeg,image/png"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = '';
                              handleUploadThumbnail(file, tpl.id);
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    <label className="inline-flex items-center gap-2 text-xs text-codGray-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editDraft.isActive)}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, isActive: e.target.checked }))
                        }
                      />
                      <span>Aktif di halaman /order</span>
                    </label>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        disabled={busyKey === `save-${tpl.id}`}
                        onClick={() => handleSaveEdit(tpl.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-goldSand-300 hover:bg-goldSand-400 px-4 py-2 text-xs font-medium text-codGray-950 cursor-pointer disabled:opacity-50"
                      >
                        {busyKey === `save-${tpl.id}` && (
                          <Loader2 size={13} className="animate-spin" />
                        )}
                        <span>Simpan</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId('');
                          setEditDraft(null);
                        }}
                        className="rounded-xl border border-codGray-200 px-4 py-2 text-xs font-medium cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="aspect-[16/9] w-full bg-codGray-50 overflow-hidden relative border-b border-codGray-100">
                      {tpl.previewImage ? (
                        <img
                          src={tpl.previewImage}
                          alt={`Preview ${tpl.name}`}
                          loading="lazy"
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-codGray-400 text-xs">
                          <ImageIcon size={20} />
                          <span>Belum ada thumbnail</span>
                        </div>
                      )}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            tpl.isActive
                              ? 'bg-codGray-950 text-white'
                              : 'bg-white/90 text-codGray-700 border border-codGray-200'
                          }`}
                        >
                          {tpl.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                        {tpl.tag && (
                          <span className="rounded-full bg-goldSand-100 px-2.5 py-0.5 text-xs font-medium text-goldSand-800">
                            {tpl.tag}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-ibarra text-2xl font-semibold text-codGray-950 leading-tight">
                              {tpl.name}
                            </h3>
                            <p className="text-xs text-codGray-500 mt-0.5">
                              ID: <code>{tpl.id}</code> · Urutan #{tpl.sortOrder}
                            </p>
                          </div>
                        </div>

                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-goldSand-50 border border-goldSand-100 px-2.5 py-1 text-[11px] text-codGray-800">
                          <Folder size={12} className="text-goldSand-800 shrink-0" />
                          <code className="truncate">{tpl.rendererFolder}</code>
                        </div>

                        {tpl.description && (
                          <p className="text-xs text-codGray-600 leading-relaxed">
                            {tpl.description}
                          </p>
                        )}

                        <p className="text-xs text-codGray-500 tabular-nums">
                          Dipakai oleh <strong>{tpl.invitationsCount ?? 0}</strong> undangan ·{' '}
                          <strong>{tpl.ordersCount ?? 0}</strong> pesanan
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-codGray-100">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => startEdit(tpl)}
                            className="inline-flex items-center gap-1 rounded-xl bg-goldSand-300 hover:bg-goldSand-400 px-3 py-1.5 text-xs font-medium text-codGray-950 cursor-pointer"
                          >
                            <Edit3 size={13} />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            disabled={busyKey === `toggle-${tpl.id}`}
                            onClick={() => handleToggleActive(tpl)}
                            className="inline-flex items-center gap-1 rounded-xl border border-codGray-200 bg-white hover:bg-codGray-50 px-3 py-1.5 text-xs font-medium text-codGray-900 cursor-pointer disabled:opacity-50"
                          >
                            {tpl.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                            <span>{tpl.isActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
                          </button>

                          {tpl.demoUrl && (
                            <a
                              href={tpl.demoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-xl border border-codGray-100 bg-goldSand-50 hover:bg-goldSand-100 px-3 py-1.5 text-xs font-medium text-codGray-900"
                            >
                              <ExternalLink size={12} />
                              <span>Demo</span>
                            </a>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={inUse || busyKey === `delete-${tpl.id}`}
                          onClick={() => handleDelete(tpl)}
                          title={
                            inUse
                              ? 'Tema masih dipakai pesanan/undangan. Nonaktifkan saja.'
                              : 'Hapus tema'
                          }
                          className="p-2 rounded-xl text-red-700 hover:bg-red-50 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
