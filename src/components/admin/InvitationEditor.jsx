import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Monitor,
  Plus,
  Save,
  Smartphone,
  Trash2,
} from 'lucide-react';
import {
  getAdminInvitation,
  updateAdminInvitation,
} from '../../services/api';
import {
  SECTION_DEFINITIONS,
  SECTION_TYPES,
  createSectionInstance,
} from '../../templates/registry';
import { getTemplateComponent } from '../../templates/components';
import MediaPool from './MediaPool';

const INPUT_CLASS =
  'w-full rounded-xl border border-codGray-100 bg-white px-3.5 py-2 text-sm text-codGray-950 focus:border-goldSand-800 focus:outline-none';

function getNestedValue(obj, path) {
  return String(path || '')
    .split('.')
    .reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

function setNestedValue(obj, path, value) {
  const keys = String(path || '').split('.');
  if (keys.length === 1) {
    return { ...obj, [keys[0]]: value };
  }
  const [first, ...rest] = keys;
  return {
    ...obj,
    [first]: setNestedValue(obj?.[first] || {}, rest.join('.'), value),
  };
}

export default function InvitationEditor({
  invitationId,
  musicPresets = [],
  templates = [],
  onBack,
  onSaved,
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [invitation, setInvitation] = useState(null);
  const [sections, setSections] = useState([]);
  const [assets, setAssets] = useState([]);
  const [wishes, setWishes] = useState([]);
  const [expandedId, setExpandedId] = useState('sec-cover');
  const [activeSlot, setActiveSlot] = useState(null);
  const [editorTab, setEditorTab] = useState('sections'); // 'sections' | 'general'
  const [previewMode, setPreviewMode] = useState('off'); // 'off' | 'mobile' | 'desktop'
  const [newSectionType, setNewSectionType] = useState('custom_note');
  const [copiedKey, setCopiedKey] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getAdminInvitation(invitationId)
      .then((data) => {
        if (!active) return;
        setInvitation(data.invitation);
        setSections(Array.isArray(data.invitation?.sections) ? data.invitation.sections : []);
        setAssets(Array.isArray(data.mediaAssets) ? data.mediaAssets : []);
        setWishes(Array.isArray(data.wishes) ? data.wishes : []);
        setExpandedId(data.invitation?.sections?.[0]?.id || '');
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Gagal memuat data undangan.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [invitationId]);

  const copyLink = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 1800);
    });
  };

  const handleSave = async (overrideStatus = null) => {
    if (!invitation) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const nextStatus = overrideStatus || invitation.status;
      const res = await updateAdminInvitation(invitation.id, {
        slug: invitation.slug,
        template_id: invitation.template_id,
        status: nextStatus,
        title: invitation.title,
        event_datetime: invitation.event_datetime,
        music_url: invitation.music_url,
        music_preset_id: invitation.music_preset_id,
        share_template: invitation.share_template,
        og_title: invitation.og_title,
        og_description: invitation.og_description,
        og_image_url: invitation.og_image_url,
        expires_at: invitation.expires_at || null,
        sections,
      });
      setInvitation(res.invitation);
      setSections(res.invitation.sections || sections);
      setNotice(
        nextStatus === 'published'
          ? `Undangan dipublikasikan di /${res.invitation.slug}`
          : 'Perubahan undangan berhasil disimpan.'
      );
      onSaved?.(res.invitation);
    } catch (err) {
      setError(err?.message || 'Gagal menyimpan undangan.');
    } finally {
      setSaving(false);
    }
  };

  const updateSection = (sectionId, updater) => {
    setSections((prev) =>
      prev.map((sec) => (sec.id === sectionId ? updater(sec) : sec))
    );
  };

  const moveSection = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= sections.length) return;
    setSections((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return copy;
    });
  };

  const addSection = () => {
    const instance = createSectionInstance(newSectionType, { visible: true });
    setSections((prev) => {
      const footerIdx = prev.findIndex((s) => s.type === 'footer');
      if (footerIdx === -1) return [...prev, instance];
      const next = [...prev];
      next.splice(footerIdx, 0, instance);
      return next;
    });
    setExpandedId(instance.id);
  };

  const removeSection = (sectionId) => {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    if (expandedId === sectionId) setExpandedId('');
  };

  const handleSelectAssetForSlot = (asset) => {
    if (!activeSlot) return;
    if (activeSlot.target === 'og_image_url') {
      setInvitation((prev) => ({ ...prev, og_image_url: asset.public_url }));
      return;
    }

    updateSection(activeSlot.sectionId, (sec) => {
      if (activeSlot.multiple) {
        const currentArr = Array.isArray(getNestedValue(sec.data, activeSlot.path))
          ? getNestedValue(sec.data, activeSlot.path)
          : [];
        const exists = currentArr.includes(asset.public_url);
        const nextArr = exists
          ? currentArr.filter((u) => u !== asset.public_url)
          : [...currentArr, asset.public_url];
        return { ...sec, data: setNestedValue(sec.data || {}, activeSlot.path, nextArr) };
      }
      return {
        ...sec,
        data: setNestedValue(sec.data || {}, activeSlot.path, asset.public_url),
      };
    });
  };

  const getSelectedUrlsForActiveSlot = () => {
    if (!activeSlot) return [];
    if (activeSlot.target === 'og_image_url') {
      return invitation?.og_image_url ? [invitation.og_image_url] : [];
    }
    const sec = sections.find((s) => s.id === activeSlot.sectionId);
    if (!sec) return [];
    const val = getNestedValue(sec.data, activeSlot.path);
    if (Array.isArray(val)) return val.map((item) => (typeof item === 'string' ? item : item?.url)).filter(Boolean);
    return val ? [val] : [];
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-white border border-codGray-100 p-10 text-center text-sm text-codGray-500">
        Memuat studio editor...
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="rounded-2xl bg-white border border-codGray-100 p-8 space-y-4">
        <p className="text-sm text-red-700">{error || 'Undangan tidak ditemukan.'}</p>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-codGray-900 px-4 py-2 text-xs font-medium text-codGray-900 cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Kembali</span>
        </button>
      </div>
    );
  }

  const activeTemplateMeta = templates.find((t) => t.id === invitation.template_id);
  const PreviewTemplate = getTemplateComponent(
    activeTemplateMeta?.rendererKey || invitation.renderer_key || invitation.template_id
  );

  const origin = window.location.origin;
  const publicUrl = `${origin}/${invitation.slug}`;
  const previewUrl = `${origin}/${invitation.slug}?preview=${encodeURIComponent(invitation.preview_token)}`;
  const customNameUrl = `${origin}/${invitation.slug}/custom-name`;
  const existingTypes = new Set(sections.map((s) => s.type));
  const addableTypes = SECTION_TYPES.filter((type) => {
    const def = SECTION_DEFINITIONS[type];
    return def.repeatable || !existingTypes.has(type);
  });

  const renderSectionDataFields = (section) => {
    const data = section.data || {};
    const updateData = (patch) =>
      updateSection(section.id, (sec) => ({ ...sec, data: { ...(sec.data || {}), ...patch } }));

    const renderSlotPickerButton = (path, label, multiple = false) => {
      const isPicking =
        activeSlot?.sectionId === section.id && activeSlot?.path === path;
      const currentVal = getNestedValue(data, path);

      return (
        <div key={path} className="space-y-1.5 rounded-xl bg-goldSand-50/70 border border-goldSand-100 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-codGray-900">{label}</span>
            <button
              type="button"
              onClick={() =>
                setActiveSlot(
                  isPicking ? null : { sectionId: section.id, path, multiple, label }
                )
              }
              className={`rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer ${
                isPicking
                  ? 'bg-goldSand-800 text-white'
                  : 'bg-white border border-codGray-200 text-codGray-900 hover:bg-goldSand-100'
              }`}
            >
              {isPicking ? 'Selesai Pilih' : 'Pilih dari Media Pool'}
            </button>
          </div>

          {multiple ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(Array.isArray(currentVal) ? currentVal : []).map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  className="relative w-14 h-14 rounded-lg overflow-hidden border border-codGray-200"
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() =>
                      updateSection(section.id, (sec) => ({
                        ...sec,
                        data: setNestedValue(
                          sec.data,
                          path,
                          (currentVal || []).filter((_, i) => i !== idx)
                        ),
                      }))
                    }
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-codGray-950/80 text-white text-[10px] flex items-center justify-center cursor-pointer"
                  >
                    x
                  </button>
                </div>
              ))}
              {(!currentVal || currentVal.length === 0) && (
                <span className="text-xs text-codGray-500">Belum ada foto dipilih.</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {currentVal && (
                <img
                  src={currentVal}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover border border-codGray-200 shrink-0"
                />
              )}
              <input
                type="text"
                value={currentVal || ''}
                onChange={(e) =>
                  updateSection(section.id, (sec) => ({
                    ...sec,
                    data: setNestedValue(sec.data || {}, path, e.target.value),
                  }))
                }
                placeholder="URL foto atau pilih dari Media Pool"
                className={INPUT_CLASS}
              />
            </div>
          )}
        </div>
      );
    };

    switch (section.type) {
      case 'cover':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-codGray-500 mb-1">Judul Utama Cover</label>
                <input
                  type="text"
                  value={data.title || ''}
                  onChange={(e) => updateData({ title: e.target.value })}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="block text-xs text-codGray-500 mb-1">Tanggal Tampil Cover</label>
                <input
                  type="text"
                  value={data.dateLabel || ''}
                  onChange={(e) => updateData({ dateLabel: e.target.value })}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-codGray-500 mb-1">Subtitle Opening</label>
                <input
                  type="text"
                  value={data.openingSubtitle || ''}
                  onChange={(e) => updateData({ openingSubtitle: e.target.value })}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="block text-xs text-codGray-500 mb-1">Subtitle Cover</label>
                <input
                  type="text"
                  value={data.subtitle || ''}
                  onChange={(e) => updateData({ subtitle: e.target.value })}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-codGray-500 mb-1">Teks Panel Kiri Desktop</label>
              <textarea
                rows={2}
                value={data.leftDesc || ''}
                onChange={(e) => updateData({ leftDesc: e.target.value })}
                className={INPUT_CLASS}
              />
            </div>
            {renderSlotPickerButton('openingBg', 'Background Opening Cover')}
            {renderSlotPickerButton('leftPanelBg', 'Background Panel Kiri Desktop')}
            {renderSlotPickerButton('slides', 'Slide Carousel Cover', true)}
          </div>
        );

      case 'quote':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-codGray-500 mb-1">Kutipan / Sloka</label>
              <textarea
                rows={3}
                value={data.quoteText || ''}
                onChange={(e) => updateData({ quoteText: e.target.value })}
                className={INPUT_CLASS}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-codGray-500 mb-1">Sumber Kutipan</label>
                <input
                  type="text"
                  value={data.quoteSource || ''}
                  onChange={(e) => updateData({ quoteSource: e.target.value })}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="block text-xs text-codGray-500 mb-1">Salam Pembuka</label>
                <input
                  type="text"
                  value={data.greetingTitle || ''}
                  onChange={(e) => updateData({ greetingTitle: e.target.value })}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-codGray-500 mb-1">Paragraf Pembuka</label>
              <textarea
                rows={2}
                value={data.greetingBody || ''}
                onChange={(e) => updateData({ greetingBody: e.target.value })}
                className={INPUT_CLASS}
              />
            </div>
          </div>
        );

      case 'couple': {
        const groom = data.groom || {};
        const bride = data.bride || {};
        const updateRole = (role, key, val) =>
          updateData({ [role]: { ...(data[role] || {}), [key]: val } });

        return (
          <div className="space-y-4">
            {[
              { role: 'groom', heading: 'Mempelai Pria', obj: groom },
              { role: 'bride', heading: 'Mempelai Wanita', obj: bride },
            ].map(({ role, heading, obj }) => (
              <div key={role} className="rounded-xl border border-codGray-100 p-3 space-y-2.5">
                <p className="text-xs font-semibold text-codGray-900">{heading}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    placeholder="Nama lengkap"
                    value={obj.fullName || ''}
                    onChange={(e) => updateRole(role, 'fullName', e.target.value)}
                    className={INPUT_CLASS}
                  />
                  <input
                    type="text"
                    placeholder="Keterangan relasi (mis. Putra pertama...)"
                    value={obj.relationText || ''}
                    onChange={(e) => updateRole(role, 'relationText', e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <textarea
                  rows={2}
                  placeholder="Nama orang tua"
                  value={obj.parents || ''}
                  onChange={(e) => updateRole(role, 'parents', e.target.value)}
                  className={INPUT_CLASS}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    placeholder="Alamat / Asal"
                    value={obj.address || ''}
                    onChange={(e) => updateRole(role, 'address', e.target.value)}
                    className={INPUT_CLASS}
                  />
                  <input
                    type="text"
                    placeholder="Username Instagram (tanpa @)"
                    value={obj.instagram || ''}
                    onChange={(e) => updateRole(role, 'instagram', e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                {renderSlotPickerButton(`${role}.photoUrl`, `Foto ${heading}`)}
              </div>
            ))}
          </div>
        );
      }

      case 'mepandes': {
        const list = Array.isArray(data.participants) ? data.participants : [];
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                placeholder="Judul Section"
                value={data.title || ''}
                onChange={(e) => updateData({ title: e.target.value })}
                className={INPUT_CLASS}
              />
              <input
                type="text"
                placeholder="Subjudul"
                value={data.subtitle || ''}
                onChange={(e) => updateData({ subtitle: e.target.value })}
                className={INPUT_CLASS}
              />
            </div>
            {list.map((p, idx) => (
              <div key={idx} className="rounded-xl border border-codGray-100 p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-codGray-700">Peserta #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateData({ participants: list.filter((_, i) => i !== idx) })
                    }
                    className="text-xs text-red-700 cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Nama lengkap"
                  value={p.fullName || ''}
                  onChange={(e) =>
                    updateData({
                      participants: list.map((item, i) =>
                        i === idx ? { ...item, fullName: e.target.value } : item
                      ),
                    })
                  }
                  className={INPUT_CLASS}
                />
                <input
                  type="text"
                  placeholder="Keterangan"
                  value={p.description || ''}
                  onChange={(e) =>
                    updateData({
                      participants: list.map((item, i) =>
                        i === idx ? { ...item, description: e.target.value } : item
                      ),
                    })
                  }
                  className={INPUT_CLASS}
                />
                <input
                  type="text"
                  placeholder="Instagram (opsional, tanpa @)"
                  value={p.instagram || ''}
                  onChange={(e) =>
                    updateData({
                      participants: list.map((item, i) =>
                        i === idx
                          ? { ...item, instagram: e.target.value.trim().replace(/^@+/, '') }
                          : item
                      ),
                    })
                  }
                  className={INPUT_CLASS}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                updateData({
                  participants: [...list, { fullName: '', description: '', instagram: '' }],
                })
              }
              className="inline-flex items-center gap-1 rounded-xl border border-codGray-900 px-3 py-1.5 text-xs font-medium cursor-pointer"
            >
              <Plus size={13} />
              <span>Tambah Peserta</span>
            </button>
          </div>
        );
      }

      case 'pawiwahan':
        return (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Judul (mis. Pawiwahan)"
              value={data.title || ''}
              onChange={(e) => updateData({ title: e.target.value })}
              className={INPUT_CLASS}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                placeholder="Nama Mempelai Pria"
                value={data.groomName || ''}
                onChange={(e) => updateData({ groomName: e.target.value })}
                className={INPUT_CLASS}
              />
              <input
                type="text"
                placeholder="Nama Mempelai Wanita"
                value={data.brideName || ''}
                onChange={(e) => updateData({ brideName: e.target.value })}
                className={INPUT_CLASS}
              />
            </div>
            <textarea
              rows={2}
              placeholder="Kalimat ajakan"
              value={data.invitationText || ''}
              onChange={(e) => updateData({ invitationText: e.target.value })}
              className={INPUT_CLASS}
            />
            {renderSlotPickerButton('photoUrl', 'Foto Bingkai Pawiwahan')}
          </div>
        );

      case 'events': {
        const items = Array.isArray(data.items) ? data.items : [];
        return (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Judul Section (mis. ACARA KAMI)"
              value={data.title || ''}
              onChange={(e) => updateData({ title: e.target.value })}
              className={INPUT_CLASS}
            />
            {items.map((ev, idx) => (
              <div key={idx} className="rounded-xl border border-codGray-100 p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-codGray-700">Acara #{idx + 1}</span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => updateData({ items: items.filter((_, i) => i !== idx) })}
                      className="text-xs text-red-700 cursor-pointer"
                    >
                      Hapus
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nama Acara"
                    value={ev.name || ''}
                    onChange={(e) =>
                      updateData({
                        items: items.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)),
                      })
                    }
                    className={INPUT_CLASS}
                  />
                  <input
                    type="text"
                    placeholder="Hari & Tanggal (mis. Rabu, 19 Agustus 2026)"
                    value={ev.dateLabel || ''}
                    onChange={(e) =>
                      updateData({
                        items: items.map((x, i) =>
                          i === idx ? { ...x, dateLabel: e.target.value } : x
                        ),
                      })
                    }
                    className={INPUT_CLASS}
                  />
                  <input
                    type="text"
                    placeholder="Waktu (mis. Pukul 15.00 WITA – Selesai)"
                    value={ev.timeLabel || ''}
                    onChange={(e) =>
                      updateData({
                        items: items.map((x, i) =>
                          i === idx ? { ...x, timeLabel: e.target.value } : x
                        ),
                      })
                    }
                    className={INPUT_CLASS}
                  />
                  <input
                    type="text"
                    placeholder="Link Google Maps"
                    value={ev.mapsUrl || ''}
                    onChange={(e) =>
                      updateData({
                        items: items.map((x, i) =>
                          i === idx ? { ...x, mapsUrl: e.target.value } : x
                        ),
                      })
                    }
                    className={INPUT_CLASS}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Alamat lengkap"
                  value={ev.address || ''}
                  onChange={(e) =>
                    updateData({
                      items: items.map((x, i) => (i === idx ? { ...x, address: e.target.value } : x)),
                    })
                  }
                  className={INPUT_CLASS}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                updateData({
                  items: [
                    ...items,
                    { name: 'Resepsi', dateLabel: '', timeLabel: '', address: '', mapsUrl: '' },
                  ],
                })
              }
              className="inline-flex items-center gap-1 rounded-xl border border-codGray-900 px-3 py-1.5 text-xs font-medium cursor-pointer"
            >
              <Plus size={13} />
              <span>Tambah Sesi Acara</span>
            </button>
          </div>
        );
      }

      case 'love_story': {
        const stories = Array.isArray(data.stories) ? data.stories : [];
        return (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Judul Section"
              value={data.title || ''}
              onChange={(e) => updateData({ title: e.target.value })}
              className={INPUT_CLASS}
            />
            {stories.map((st, idx) => (
              <div key={idx} className="rounded-xl border border-codGray-100 p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-codGray-700">Cerita #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => updateData({ stories: stories.filter((_, i) => i !== idx) })}
                    className="text-xs text-red-700 cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Judul momen"
                  value={st.title || ''}
                  onChange={(e) =>
                    updateData({
                      stories: stories.map((x, i) =>
                        i === idx ? { ...x, title: e.target.value } : x
                      ),
                    })
                  }
                  className={INPUT_CLASS}
                />
                <textarea
                  rows={2}
                  placeholder="Deskripsi momen"
                  value={st.description || ''}
                  onChange={(e) =>
                    updateData({
                      stories: stories.map((x, i) =>
                        i === idx ? { ...x, description: e.target.value } : x
                      ),
                    })
                  }
                  className={INPUT_CLASS}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                updateData({ stories: [...stories, { title: '', description: '' }] })
              }
              className="inline-flex items-center gap-1 rounded-xl border border-codGray-900 px-3 py-1.5 text-xs font-medium cursor-pointer"
            >
              <Plus size={13} />
              <span>Tambah Cerita</span>
            </button>
          </div>
        );
      }

      case 'gallery':
        return (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Judul Galeri"
              value={data.title || ''}
              onChange={(e) => updateData({ title: e.target.value })}
              className={INPUT_CLASS}
            />
            <input
              type="url"
              placeholder="Link Video YouTube (opsional)"
              value={data.videoUrl || ''}
              onChange={(e) => updateData({ videoUrl: e.target.value })}
              className={INPUT_CLASS}
            />
            {renderSlotPickerButton('photos', 'Foto Galeri Lightbox', true)}
          </div>
        );

      case 'guestbook':
        return (
          <div className="space-y-2.5">
            <input
              type="text"
              placeholder="Judul Buku Tamu"
              value={data.title || ''}
              onChange={(e) => updateData({ title: e.target.value })}
              className={INPUT_CLASS}
            />
            <input
              type="text"
              placeholder="Subjudul"
              value={data.subtitle || ''}
              onChange={(e) => updateData({ subtitle: e.target.value })}
              className={INPUT_CLASS}
            />
          </div>
        );

      case 'gift': {
        const accounts = Array.isArray(data.accounts) ? data.accounts : [];
        return (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Judul Wedding Gift"
              value={data.title || ''}
              onChange={(e) => updateData({ title: e.target.value })}
              className={INPUT_CLASS}
            />
            <textarea
              rows={2}
              placeholder="Deskripsi"
              value={data.description || ''}
              onChange={(e) => updateData({ description: e.target.value })}
              className={INPUT_CLASS}
            />
            {accounts.map((acc, idx) => (
              <div key={idx} className="rounded-xl border border-codGray-100 p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-codGray-700">Rekening #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => updateData({ accounts: accounts.filter((_, i) => i !== idx) })}
                    className="text-xs text-red-700 cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Bank / E-Wallet"
                    value={acc.bankName || ''}
                    onChange={(e) =>
                      updateData({
                        accounts: accounts.map((x, i) =>
                          i === idx ? { ...x, bankName: e.target.value } : x
                        ),
                      })
                    }
                    className={INPUT_CLASS}
                  />
                  <input
                    type="text"
                    placeholder="Nama Pemilik"
                    value={acc.accountHolder || ''}
                    onChange={(e) =>
                      updateData({
                        accounts: accounts.map((x, i) =>
                          i === idx ? { ...x, accountHolder: e.target.value } : x
                        ),
                      })
                    }
                    className={INPUT_CLASS}
                  />
                  <input
                    type="text"
                    placeholder="Nomor Rekening"
                    value={acc.accountNumber || ''}
                    onChange={(e) =>
                      updateData({
                        accounts: accounts.map((x, i) =>
                          i === idx ? { ...x, accountNumber: e.target.value } : x
                        ),
                      })
                    }
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                updateData({
                  accounts: [...accounts, { bankName: '', accountHolder: '', accountNumber: '' }],
                })
              }
              className="inline-flex items-center gap-1 rounded-xl border border-codGray-900 px-3 py-1.5 text-xs font-medium cursor-pointer"
            >
              <Plus size={13} />
              <span>Tambah Rekening</span>
            </button>
          </div>
        );
      }

      case 'custom_note':
        return (
          <div className="space-y-2.5">
            <input
              type="text"
              placeholder="Judul (mis. Dresscode / Live Streaming)"
              value={data.title || ''}
              onChange={(e) => updateData({ title: e.target.value })}
              className={INPUT_CLASS}
            />
            <textarea
              rows={3}
              placeholder="Isi pesan atau daftar turut mengundang"
              value={data.body || ''}
              onChange={(e) => updateData({ body: e.target.value })}
              className={INPUT_CLASS}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Label Tombol (opsional)"
                value={data.buttonLabel || ''}
                onChange={(e) => updateData({ buttonLabel: e.target.value })}
                className={INPUT_CLASS}
              />
              <input
                type="url"
                placeholder="URL Tombol https://... (opsional)"
                value={data.buttonUrl || ''}
                onChange={(e) => updateData({ buttonUrl: e.target.value })}
                className={INPUT_CLASS}
              />
            </div>
          </div>
        );

      case 'footer':
        return (
          <div className="space-y-2.5">
            <input
              type="text"
              placeholder="Judul Penutup (mis. Matur Suksma)"
              value={data.title || ''}
              onChange={(e) => updateData({ title: e.target.value })}
              className={INPUT_CLASS}
            />
            <textarea
              rows={2}
              placeholder="Pesan penutup"
              value={data.message || ''}
              onChange={(e) => updateData({ message: e.target.value })}
              className={INPUT_CLASS}
            />
            {renderSlotPickerButton('bgUrl', 'Background Footer')}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Top Bar */}
      <div className="rounded-2xl bg-white border border-codGray-100 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-xl border border-codGray-200 px-3 py-2 text-xs font-medium text-codGray-900 hover:bg-codGray-50 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Daftar</span>
          </button>
          <div>
            <h2 className="font-ibarra text-2xl font-semibold text-codGray-950">
              {invitation.title}
            </h2>
            <p className="text-xs text-codGray-500">
              /{invitation.slug} · Status: <strong className="text-codGray-900">{invitation.status}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => copyLink(previewUrl, 'preview')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-codGray-200 bg-goldSand-50 px-3 py-2 text-xs font-medium text-codGray-900 cursor-pointer"
          >
            {copiedKey === 'preview' ? <Check size={13} /> : <Copy size={13} />}
            <span>Salin Link Preview</span>
          </button>
          <a
            href={invitation.status === 'published' ? publicUrl : previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-codGray-200 bg-white px-3 py-2 text-xs font-medium text-codGray-900 hover:bg-codGray-50"
          >
            <ExternalLink size={13} />
            <span>Buka Tab</span>
          </a>
          <a
            href={customNameUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-codGray-200 bg-white px-3 py-2 text-xs font-medium text-codGray-900 hover:bg-codGray-50"
          >
            <span>Custom Name</span>
          </a>

          <div className="inline-flex rounded-xl border border-codGray-200 overflow-hidden">
            {[
              { id: 'off', label: 'Edit', icon: null },
              { id: 'mobile', label: 'HP', icon: Smartphone },
              { id: 'desktop', label: 'Web', icon: Monitor },
            ].map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setPreviewMode(mode.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium cursor-pointer ${
                    previewMode === mode.id
                      ? 'bg-codGray-950 text-white'
                      : 'bg-white text-codGray-700 hover:bg-codGray-50'
                  }`}
                >
                  {Icon && <Icon size={13} />}
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-codGray-900 bg-white px-4 py-2 text-xs font-medium text-codGray-900 hover:bg-codGray-50 cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>Simpan</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave('published')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-goldSand-300 hover:bg-goldSand-400 px-4 py-2 text-xs font-medium text-codGray-950 cursor-pointer disabled:opacity-50"
          >
            <span>Publish</span>
          </button>
        </div>
      </div>

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

      {previewMode !== 'off' ? (
        <div className="rounded-2xl bg-codGray-950 p-4 sm:p-6">
          <div className="flex items-center justify-between text-xs text-goldSand-100 mb-3">
            <span>Live Preview ({previewMode === 'mobile' ? 'Mobile 390px' : 'Desktop'})</span>
            <button
              type="button"
              onClick={() => setPreviewMode('off')}
              className="underline cursor-pointer"
            >
              Tutup Preview
            </button>
          </div>
          <div
            className={`mx-auto bg-black overflow-y-auto border border-codGray-800 rounded-xl ${
              previewMode === 'mobile' ? 'w-[390px] max-w-full h-[720px]' : 'w-full h-[720px]'
            }`}
          >
            <PreviewTemplate
              invitation={{ ...invitation, sections }}
              guestName="Tamu Undangan"
              wishes={wishes}
              isPreview
              embedded
              embeddedMobile={previewMode === 'mobile'}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Section Manager & General/OG */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex gap-2">
              {[
                { id: 'sections', label: 'Section & Konten' },
                { id: 'general', label: 'Pengaturan Umum, OG & Share WA' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEditorTab(tab.id)}
                  className={`rounded-xl px-4 py-2 text-xs font-medium cursor-pointer ${
                    editorTab === tab.id
                      ? 'bg-codGray-950 text-white'
                      : 'bg-white border border-codGray-100 text-codGray-700 hover:bg-codGray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {editorTab === 'general' ? (
              <div className="rounded-2xl bg-white border border-codGray-100 p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-codGray-900 mb-1">Slug URL</label>
                    <input
                      type="text"
                      value={invitation.slug || ''}
                      onChange={(e) =>
                        setInvitation((prev) => ({
                          ...prev,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-codGray-900 mb-1">Status</label>
                    <select
                      value={invitation.status}
                      onChange={(e) =>
                        setInvitation((prev) => ({ ...prev, status: e.target.value }))
                      }
                      className={INPUT_CLASS}
                    >
                      <option value="draft">Draft</option>
                      <option value="preview">Preview</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-codGray-900 mb-1">Judul Undangan</label>
                    <input
                      type="text"
                      value={invitation.title || ''}
                      onChange={(e) =>
                        setInvitation((prev) => ({ ...prev, title: e.target.value }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-codGray-900 mb-1">
                      Tanggal &amp; Jam Countdown
                    </label>
                    <input
                      type="text"
                      value={invitation.event_datetime || ''}
                      onChange={(e) =>
                        setInvitation((prev) => ({ ...prev, event_datetime: e.target.value }))
                      }
                      placeholder="2026-08-19T15:00:00+08:00"
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-codGray-900 mb-1">
                      Tema Undangan
                    </label>
                    <select
                      value={invitation.template_id || 'editorial-classic'}
                      onChange={(e) =>
                        setInvitation((prev) => ({ ...prev, template_id: e.target.value }))
                      }
                      className={INPUT_CLASS}
                    >
                      {templates.length > 0 ? (
                        templates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name} ({tpl.rendererFolder})
                            {tpl.isActive ? '' : ' [Nonaktif]'}
                          </option>
                        ))
                      ) : (
                        <option value={invitation.template_id || 'editorial-classic'}>
                          {invitation.template_name || invitation.template_id || 'editorial-classic'}
                        </option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-codGray-900 mb-1">
                      Masa Aktif (Expires At ISO, opsional)
                    </label>
                    <input
                      type="text"
                      value={invitation.expires_at || ''}
                      onChange={(e) =>
                        setInvitation((prev) => ({ ...prev, expires_at: e.target.value }))
                      }
                      placeholder="2027-08-19T00:00:00Z"
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-codGray-100 space-y-3">
                  <p className="text-xs font-semibold text-codGray-900">OG Meta Preview WhatsApp</p>
                  <input
                    type="text"
                    placeholder="OG Title"
                    value={invitation.og_title || ''}
                    onChange={(e) =>
                      setInvitation((prev) => ({ ...prev, og_title: e.target.value }))
                    }
                    className={INPUT_CLASS}
                  />
                  <textarea
                    rows={2}
                    placeholder="OG Description"
                    value={invitation.og_description || ''}
                    onChange={(e) =>
                      setInvitation((prev) => ({ ...prev, og_description: e.target.value }))
                    }
                    className={INPUT_CLASS}
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="OG Image URL"
                      value={invitation.og_image_url || ''}
                      onChange={(e) =>
                        setInvitation((prev) => ({ ...prev, og_image_url: e.target.value }))
                      }
                      className={INPUT_CLASS}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setActiveSlot({
                          target: 'og_image_url',
                          label: 'OG Thumbnail WhatsApp',
                          multiple: false,
                        })
                      }
                      className="shrink-0 rounded-xl border border-codGray-200 px-3 py-2 text-xs font-medium cursor-pointer"
                    >
                      Pilih Foto
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-codGray-100 space-y-2">
                  <label className="block text-xs font-semibold text-codGray-900">
                    Template Teks /:slug/custom-name
                  </label>
                  <p className="text-xs text-codGray-500">
                    Gunakan placeholder <code>{'{{guestName}}'}</code> dan <code>{'{{link}}'}</code>.
                  </p>
                  <textarea
                    rows={8}
                    value={invitation.share_template || ''}
                    onChange={(e) =>
                      setInvitation((prev) => ({ ...prev, share_template: e.target.value }))
                    }
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Add Section Bar */}
                {addableTypes.length > 0 && (
                  <div className="rounded-2xl bg-white border border-codGray-100 p-3.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-codGray-700">Tambah Section Opsional:</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={newSectionType}
                        onChange={(e) => setNewSectionType(e.target.value)}
                        className="rounded-xl border border-codGray-100 bg-white px-3 py-1.5 text-xs text-codGray-950"
                      >
                        {addableTypes.map((type) => (
                          <option key={type} value={type}>
                            {SECTION_DEFINITIONS[type].label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={addSection}
                        className="inline-flex items-center gap-1 rounded-xl bg-goldSand-300 hover:bg-goldSand-400 px-3 py-1.5 text-xs font-medium text-codGray-950 cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Tambah</span>
                      </button>
                    </div>
                  </div>
                )}

                {sections.map((section, idx) => {
                  const def = SECTION_DEFINITIONS[section.type] || {
                    label: section.type,
                    removable: true,
                  };
                  const isExpanded = expandedId === section.id;

                  return (
                    <div
                      key={section.id}
                      className={`rounded-2xl border bg-white overflow-hidden ${
                        section.visible ? 'border-codGray-100' : 'border-codGray-100 opacity-75'
                      }`}
                    >
                      <div className="px-4 py-3 flex items-center justify-between gap-2 bg-goldSand-50/50">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? '' : section.id)}
                          className="text-left flex-1 cursor-pointer"
                        >
                          <p className="text-sm font-medium text-codGray-950">
                            {def.label}
                            {!section.visible && (
                              <span className="ml-2 text-xs text-codGray-500">(Disembunyikan)</span>
                            )}
                          </p>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              updateSection(section.id, (sec) => ({
                                ...sec,
                                visible: !sec.visible,
                              }))
                            }
                            title={section.visible ? 'Sembunyikan section' : 'Tampilkan section'}
                            className="p-1.5 rounded-lg text-codGray-700 hover:bg-goldSand-100 cursor-pointer"
                          >
                            {section.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                          </button>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveSection(idx, -1)}
                            title="Geser naik"
                            className="p-1.5 rounded-lg text-codGray-700 hover:bg-goldSand-100 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp size={15} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === sections.length - 1}
                            onClick={() => moveSection(idx, 1)}
                            title="Geser turun"
                            className="p-1.5 rounded-lg text-codGray-700 hover:bg-goldSand-100 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown size={15} />
                          </button>
                          {def.removable && (
                            <button
                              type="button"
                              onClick={() => removeSection(section.id)}
                              title="Hapus section"
                              className="p-1.5 rounded-lg text-red-700 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-4 border-t border-codGray-100">
                          {renderSectionDataFields(section)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: R2 Media Pool & Music */}
          <div className="lg:col-span-5 lg:sticky lg:top-6 rounded-2xl bg-white border border-codGray-100 p-5">
            <MediaPool
              slug={invitation.slug}
              orderId={invitation.order_id}
              invitationId={invitation.id}
              assets={assets}
              onAssetsChange={setAssets}
              activeSlotLabel={activeSlot?.label || ''}
              selectedUrls={getSelectedUrlsForActiveSlot()}
              onSelectAsset={handleSelectAssetForSlot}
              musicUrl={invitation.music_url}
              musicPresetId={invitation.music_preset_id}
              musicPresets={musicPresets}
              onMusicChange={(patch) => setInvitation((prev) => ({ ...prev, ...patch }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
