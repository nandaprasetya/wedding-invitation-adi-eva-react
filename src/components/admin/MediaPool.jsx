import React, { useRef, useState } from 'react';
import { Check, Loader2, Music, Trash2, Upload } from 'lucide-react';
import { deleteAdminMedia, uploadAdminMedia } from '../../services/api';
import { formatBytes, prepareImageForUpload } from '../../utils/imageCompress';
import { extractYoutubeId } from '../../utils/orderHelpers';

export default function MediaPool({
  slug,
  orderId,
  invitationId,
  assets = [],
  onAssetsChange,
  activeSlotLabel = '',
  selectedUrls = [],
  onSelectAsset,
  musicUrl = '',
  musicPresetId = '',
  musicPresets = [],
  onMusicChange,
  pickerOnly = false,
}) {
  const photoInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState('');
  const [error, setError] = useState('');
  const [showYtPreview, setShowYtPreview] = useState(false);
  const musicYoutubeId = extractYoutubeId(musicUrl);

  const imageAssets = assets.filter((a) => a.asset_type === 'image');
  const audioAssets = assets.filter((a) => a.asset_type === 'audio');

  const handlePhotoFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;

    setUploading(true);
    setError('');
    setUploadStats('');
    let totalBefore = 0;
    let totalAfter = 0;
    const uploaded = [];

    try {
      for (const file of files) {
        const prepared = await prepareImageForUpload(file, { maxWidth: 1600, quality: 0.86 });
        totalBefore += prepared.originalSize;
        totalAfter += prepared.compressedSize;

        const formData = new FormData();
        formData.append('file', prepared.blob, prepared.filename);
        formData.append('slug', slug || 'general');
        if (orderId) formData.append('orderId', orderId);
        if (invitationId) formData.append('invitationId', invitationId);
        if (prepared.width) formData.append('width', String(prepared.width));
        if (prepared.height) formData.append('height', String(prepared.height));

        const res = await uploadAdminMedia(formData);
        if (res?.asset) uploaded.push(res.asset);
      }

      if (uploaded.length > 0) {
        onAssetsChange?.((prev) => [...uploaded, ...(Array.isArray(prev) ? prev : assets)]);
        setUploadStats(
          totalAfter < totalBefore
            ? `${uploaded.length} foto diunggah (${formatBytes(totalBefore)} -> ${formatBytes(totalAfter)})`
            : `${uploaded.length} foto diunggah (${formatBytes(totalAfter)})`
        );
      }
    } catch (err) {
      setError(err?.message || 'Gagal mengunggah foto.');
    } finally {
      setUploading(false);
    }
  };

  const handleAudioFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file, file.name);
      formData.append('slug', slug || 'general');
      if (orderId) formData.append('orderId', orderId);
      if (invitationId) formData.append('invitationId', invitationId);

      const res = await uploadAdminMedia(formData);
      if (res?.asset) {
        onAssetsChange?.((prev) => [res.asset, ...(Array.isArray(prev) ? prev : assets)]);
        onMusicChange?.({ music_url: res.asset.public_url, music_preset_id: null });
      }
    } catch (err) {
      setError(err?.message || 'Gagal mengunggah audio MP3.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAsset = async (assetId) => {
    setError('');
    try {
      await deleteAdminMedia(assetId);
      onAssetsChange?.((prev) => (Array.isArray(prev) ? prev : assets).filter((a) => a.id !== assetId));
    } catch (err) {
      setError(err?.message || 'Gagal menghapus aset.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Photo Bulk Uploader */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            {!pickerOnly && (
              <h3 className="font-ibarra text-xl font-semibold text-codGray-950">Media Pool Foto</h3>
            )}
            <p className="text-xs text-codGray-500">
              {pickerOnly
                ? `${imageAssets.length} foto tersedia di Media Pool. Klik foto untuk memilih atau unggah foto baru.`
                : activeSlotLabel
                  ? `Sedang memilih foto untuk: ${activeSlotLabel}`
                  : 'Upload foto sekali (format asli JPG/PNG kompatibel iPhone & Safari, resize max 1600px), lalu pilih dari masing-masing section.'}
            </p>
          </div>
          <button
            type="button"
            disabled={uploading}
            onClick={() => photoInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-goldSand-300 hover:bg-goldSand-400 px-3.5 py-2 text-xs font-medium text-codGray-950 cursor-pointer disabled:opacity-50"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            <span>Upload Foto</span>
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              handlePhotoFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handlePhotoFiles(e.dataTransfer.files);
          }}
          onClick={() => photoInputRef.current?.click()}
          className={`rounded-2xl border border-dashed text-center cursor-pointer transition-colors ${
            pickerOnly ? 'px-4 py-3' : 'p-5'
          } ${dragging
            ? 'border-goldSand-800 bg-goldSand-50'
            : 'border-codGray-200 bg-goldSand-50/40 hover:border-goldSand-800/60'
            }`}
        >
          <p className="text-xs text-codGray-700">
            Tarik dan lepaskan beberapa foto ke sini, atau klik untuk memilih file (JPG/PNG).
          </p>
        </div>

        {uploadStats && (
          <p className="text-xs font-medium text-goldSand-800 bg-goldSand-100 rounded-xl px-3 py-2">
            {uploadStats}
          </p>
        )}

        {error && (
          <p role="alert" className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        {imageAssets.length === 0 ? (
          <p className="text-xs text-codGray-500 py-3">Belum ada foto di Media Pool undangan ini.</p>
        ) : (
          <div
            className={
              pickerOnly
                ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5'
                : 'grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1'
            }
          >
            {imageAssets.map((asset) => {
              const isSelected = selectedUrls.includes(asset.public_url);
              return (
                <div
                  key={asset.id}
                  className={`group relative aspect-square rounded-xl overflow-hidden border bg-codGray-50 ${isSelected
                    ? 'border-goldSand-800 ring-2 ring-goldSand-800'
                    : 'border-codGray-100'
                    }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectAsset?.(asset)}
                    className={`w-full h-full block ${onSelectAsset ? 'cursor-pointer' : 'cursor-default'}`}
                    title={
                      activeSlotLabel
                        ? `Pilih untuk ${activeSlotLabel}`
                        : onSelectAsset
                          ? 'Klik untuk pilih foto'
                          : asset.r2_key
                    }
                  >
                    <img
                      src={asset.public_url}
                      alt={asset.r2_key}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </button>

                  {isSelected && (
                    <span className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-goldSand-800 text-white flex items-center justify-center">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAsset(asset.id);
                    }}
                    title="Hapus dari R2"
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-codGray-950/75 text-white flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>

                  <span className="absolute bottom-1 left-1 rounded bg-codGray-950/70 px-1.5 py-0.5 text-[10px] text-white tabular-nums">
                    {formatBytes(asset.size_bytes)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Audio Preset & Custom MP3 */}
      {!pickerOnly && (
        <div className="pt-4 border-t border-codGray-100 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Music size={15} className="text-goldSand-800" />
            <h4 className="text-sm font-medium text-codGray-950">Musik Latar Undangan</h4>
          </div>
          <button
            type="button"
            disabled={uploading}
            onClick={() => audioInputRef.current?.click()}
            className="text-xs font-medium text-goldSand-800 underline underline-offset-4 hover:text-codGray-950 cursor-pointer"
          >
            Upload MP3 Kustom
          </button>
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/mpeg,.mp3"
            className="hidden"
            onChange={(e) => {
              handleAudioFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>

        <select
          value={musicPresetId || ''}
          onChange={(e) => {
            const presetId = e.target.value;
            const found = musicPresets.find((p) => p.id === presetId);
            if (found) {
              onMusicChange?.({ music_url: found.public_url, music_preset_id: found.id });
            } else {
              onMusicChange?.({ music_url: musicUrl, music_preset_id: null });
            }
          }}
          className="w-full rounded-xl border border-codGray-100 bg-white px-3.5 py-2.5 text-sm text-codGray-950 focus:border-goldSand-800 focus:outline-none"
        >
          <option value="">-- Pilih Preset Musik atau Isi URL MP3 --</option>
          {musicPresets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.title} {preset.artist ? `(${preset.artist})` : ''}
            </option>
          ))}
        </select>

        {audioAssets.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {audioAssets.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onMusicChange?.({ music_url: a.public_url, music_preset_id: null })}
                className={`rounded-xl border px-3 py-1.5 text-xs cursor-pointer ${musicUrl === a.public_url
                  ? 'border-goldSand-800 bg-goldSand-50 text-goldSand-800 font-medium'
                  : 'border-codGray-100 bg-white text-codGray-700'
                  }`}
              >
                MP3 ({formatBytes(a.size_bytes)})
              </button>
            ))}
          </div>
        )}

        <input
          type="text"
          value={musicUrl || ''}
          onChange={(e) => {
            setShowYtPreview(false);
            onMusicChange?.({ music_url: e.target.value, music_preset_id: null });
          }}
          placeholder="URL audio MP3 atau link YouTube (https://youtu.be/...)"
          className="w-full rounded-xl border border-codGray-100 bg-white px-3.5 py-2.5 text-xs text-codGray-950 focus:border-goldSand-800 focus:outline-none"
        />
        {musicYoutubeId && (
          <div className="space-y-2 rounded-xl border border-goldSand-100 bg-goldSand-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-goldSand-800">
              <span>
                Backsound YouTube terdeteksi (ID: <strong>{musicYoutubeId}</strong>).
              </span>
              <button
                type="button"
                onClick={() => setShowYtPreview((prev) => !prev)}
                className="font-medium underline underline-offset-4 text-codGray-900 cursor-pointer"
              >
                {showYtPreview ? 'Tutup Tes Putar' : 'Tes Putar YouTube'}
              </button>
            </div>
            {showYtPreview && (
              <iframe
                src={`https://www.youtube.com/embed/${musicYoutubeId}?autoplay=1&rel=0`}
                title="Preview Backsound YouTube"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                className="w-full h-36 rounded-lg border border-codGray-200 bg-black"
              />
            )}
          </div>
        )}
        </div>
      )}
    </div>
  );
}
