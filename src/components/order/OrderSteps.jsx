import React from 'react';
import { Check, ExternalLink, Plus, Trash2 } from 'lucide-react';
import {
  BRAND_CONFIG,
  EVENT_TYPES,
  ORDER_ADDONS,
  ORDER_PACKAGES,
  ORDER_THEMES,
  createEmptyDigitalGift,
  createEmptyEvent,
  createEmptyLoveStory,
  createEmptyMepandes,
} from '../../config/orderCatalog';
import {
  formatDateIndo,
  sanitizeInstagram,
  slugifyText,
} from '../../utils/orderHelpers';

const INPUT_CLASS =
  'w-full rounded-xl border border-codGray-100 bg-white px-4 py-3 text-sm sm:text-base text-codGray-950 placeholder:text-codGray-300 focus:border-goldSand-800 focus:outline-none focus:ring-2 focus:ring-goldSand-300/60 transition-colors';

function Field({ id, label, required, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-codGray-950 mb-1.5">
        {label}
        {required ? (
          <span className="text-goldSand-800 ml-1" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="text-xs font-normal text-codGray-500 ml-1.5">(Opsional)</span>
        )}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs leading-relaxed text-codGray-500">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function SwitchRow({ id, title, description, badge, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={id} className="text-base font-medium text-codGray-950 cursor-pointer">
            {title}
          </label>
          {badge && (
            <span className="rounded-full bg-goldSand-100 px-2.5 py-0.5 text-xs font-medium text-goldSand-800 tabular-nums">
              {badge}
            </span>
          )}
        </div>
        {description && <p className="text-sm text-codGray-500 mt-1">{description}</p>}
      </div>

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldSand-800 ${
          checked ? 'bg-goldSand-800' : 'bg-codGray-100'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export function Step1Preferences({ form, errors, onChange }) {
  const handleMepandesToggle = (nextVal) => {
    onChange((prev) => ({
      ...prev,
      hasMepandes: nextVal,
      mepandes:
        nextVal && (!prev.mepandes || prev.mepandes.length === 0)
          ? [createEmptyMepandes()]
          : prev.mepandes,
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-ibarra text-3xl font-semibold text-codGray-950">
          Pengaturan <span className="italic text-goldSand-800">Awal</span>
        </h2>
        <p className="text-sm text-codGray-500 mt-1.5">
          Saat ini formulir tersedia untuk undangan Pernikahan (termasuk tambahan Metatah / Mepandes). Jenis acara lain akan menyusul.
        </p>
      </div>

      <Field id="event-type" label="Mau membuat undangan apa?" required error={errors.eventType}>
        <select
          id="event-type"
          value={form.eventType}
          onChange={(e) => onChange((prev) => ({ ...prev, eventType: e.target.value }))}
          className={INPUT_CLASS}
        >
          {EVENT_TYPES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>

      <div>
        <p className="text-sm font-medium text-codGray-950 mb-2">
          Apakah undangan ini memiliki tambahan acara Metatah / Mepandes?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { value: false, title: 'Tidak', desc: 'Hanya acara pernikahan / pawiwahan' },
            { value: true, title: 'Ya, ada tambahan', desc: 'Tampilkan data peserta Mepandes' },
          ].map((opt) => {
            const selected = form.hasMepandes === opt.value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => handleMepandesToggle(opt.value)}
                className={`text-left rounded-2xl border p-4 transition-colors cursor-pointer ${
                  selected
                    ? 'border-goldSand-800 bg-goldSand-50'
                    : 'border-codGray-100 bg-white hover:bg-codGray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-codGray-950">{opt.title}</span>
                  {selected && <Check size={16} className="text-goldSand-800" />}
                </div>
                <p className="text-xs text-codGray-500 mt-1">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-codGray-950 mb-1">
          Apakah Anda mengizinkan {BRAND_CONFIG.name} menampilkan foto pernikahan di media sosial kami?
          <span className="text-goldSand-800 ml-1" aria-hidden="true">
            *
          </span>
        </p>
        <p className="text-xs text-codGray-500 mb-3">
          Foto hanya akan ditampilkan setelah acara selesai berlangsung.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { value: true, title: 'Boleh', desc: 'Saya berkenan sebagai portofolio setelah acara' },
            { value: false, title: 'Tidak boleh', desc: 'Jaga foto tetap privat di undangan saja' },
          ].map((opt) => {
            const selected = form.allowSocialMedia === opt.value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => onChange((prev) => ({ ...prev, allowSocialMedia: opt.value }))}
                className={`text-left rounded-2xl border p-4 transition-colors cursor-pointer ${
                  selected
                    ? 'border-goldSand-800 bg-goldSand-50'
                    : 'border-codGray-100 bg-white hover:bg-codGray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-codGray-950">{opt.title}</span>
                  {selected && <Check size={16} className="text-goldSand-800" />}
                </div>
                <p className="text-xs text-codGray-500 mt-1">{opt.desc}</p>
              </button>
            );
          })}
        </div>
        {errors.allowSocialMedia && (
          <p role="alert" className="mt-2 text-xs font-medium text-red-700">
            {errors.allowSocialMedia}
          </p>
        )}
      </div>
    </div>
  );
}

export function Step2Theme({ form, errors, onChange }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-ibarra text-3xl font-semibold text-codGray-950">
          Pilih <span className="italic text-goldSand-800">Tema</span> Undangan
        </h2>
        <p className="text-sm text-codGray-500 mt-1.5">
          Pilih gaya tampilan yang paling sesuai dengan nuansa acara Anda. Klik Lihat Demo untuk mencoba langsung.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ORDER_THEMES.map((theme) => {
          const selected = form.themeId === theme.id;
          return (
            <div
              key={theme.id}
              onClick={() => onChange((prev) => ({ ...prev, themeId: theme.id }))}
              role="radio"
              aria-checked={selected}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onChange((prev) => ({ ...prev, themeId: theme.id }));
                }
              }}
              className={`group rounded-2xl border overflow-hidden transition-colors cursor-pointer flex flex-col ${
                selected
                  ? 'border-goldSand-800 bg-goldSand-50'
                  : 'border-codGray-100 bg-white hover:border-codGray-300'
              }`}
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-codGray-50">
                <img
                  src={theme.previewImage}
                  alt={`Preview tema ${theme.name}`}
                  loading="lazy"
                  className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-103"
                />
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-ibarra text-xl font-semibold text-codGray-950">
                      {theme.name}
                    </h3>
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                        selected
                          ? 'bg-goldSand-800 border-goldSand-800 text-white'
                          : 'border-codGray-300 bg-white'
                      }`}
                    >
                      {selected && <Check size={12} strokeWidth={3} />}
                    </span>
                  </div>
                  <p className="text-xs text-codGray-500 mt-1 leading-relaxed">
                    {theme.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-codGray-100/80">
                  <span className="text-xs font-medium text-goldSand-800">{theme.tag}</span>
                  <a
                    href={theme.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs font-medium text-codGray-900 underline underline-offset-4 hover:text-goldSand-800"
                  >
                    <span>Lihat Demo</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {errors.themeId && (
        <p role="alert" className="text-xs font-medium text-red-700">
          {errors.themeId}
        </p>
      )}
    </div>
  );
}

export function Step3Couple({ form, errors, onChange }) {
  const updatePerson = (role, key, value) => {
    onChange((prev) => ({
      ...prev,
      [role]: { ...prev[role], [key]: value },
    }));
  };

  const updateMepandes = (index, key, value) => {
    onChange((prev) => ({
      ...prev,
      mepandes: prev.mepandes.map((item, idx) =>
        idx === index ? { ...item, [key]: value } : item
      ),
    }));
  };

  const addMepandes = () => {
    onChange((prev) => ({
      ...prev,
      mepandes: [...(prev.mepandes || []), createEmptyMepandes()],
    }));
  };

  const removeMepandes = (index) => {
    onChange((prev) => ({
      ...prev,
      mepandes: prev.mepandes.filter((_, idx) => idx !== index),
    }));
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-ibarra text-3xl font-semibold text-codGray-950">
          Data <span className="italic text-goldSand-800">Mempelai</span>
        </h2>
        <p className="text-sm text-codGray-500 mt-1.5">
          Tulis nama lengkap sesuai yang ingin ditampilkan pada undangan dan nama panggilan untuk judul sampul.
        </p>
      </div>

      {/* Mempelai Pria */}
      <section className="space-y-4">
        <h3 className="font-ibarra text-2xl font-semibold text-codGray-950 pb-2 border-b border-codGray-100">
          Mempelai Pria
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            id="groom-fullName"
            label="Nama Lengkap Pria"
            required
            error={errors['groom.fullName']}
          >
            <input
              id="groom-fullName"
              type="text"
              value={form.groom.fullName}
              onChange={(e) => updatePerson('groom', 'fullName', e.target.value)}
              placeholder="I Gede Adi Wijaya"
              className={INPUT_CLASS}
            />
          </Field>

          <Field
            id="groom-nickname"
            label="Nama Panggilan Pria"
            required
            error={errors['groom.nickname']}
          >
            <input
              id="groom-nickname"
              type="text"
              value={form.groom.nickname}
              onChange={(e) => updatePerson('groom', 'nickname', e.target.value)}
              placeholder="Adi"
              className={INPUT_CLASS}
            />
          </Field>
        </div>

        <Field
          id="groom-parents"
          label="Deskripsi Nama Orang Tua Pria"
          hint="Contoh: Putra pertama dari pasangan Bpk. I Nyoman Sukra & Ibu Ni Wayan Darsih"
        >
          <textarea
            id="groom-parents"
            rows={2}
            value={form.groom.parentDescription}
            onChange={(e) => updatePerson('groom', 'parentDescription', e.target.value)}
            placeholder="Putra pertama dari pasangan Bpk. ... & Ibu ..."
            className={INPUT_CLASS}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field id="groom-address" label="Alamat / Asal Pria">
            <input
              id="groom-address"
              type="text"
              value={form.groom.address}
              onChange={(e) => updatePerson('groom', 'address', e.target.value)}
              placeholder="Kerobokan, Badung"
              className={INPUT_CLASS}
            />
          </Field>

          <Field id="groom-ig" label="Instagram Pria" hint="Ketik username saja tanpa simbol @">
            <input
              id="groom-ig"
              type="text"
              value={form.groom.instagram}
              onChange={(e) => updatePerson('groom', 'instagram', sanitizeInstagram(e.target.value))}
              placeholder="adiwijaya"
              className={INPUT_CLASS}
            />
          </Field>
        </div>
      </section>

      {/* Mempelai Wanita */}
      <section className="space-y-4">
        <h3 className="font-ibarra text-2xl font-semibold text-codGray-950 pb-2 border-b border-codGray-100">
          Mempelai Wanita
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            id="bride-fullName"
            label="Nama Lengkap Wanita"
            required
            error={errors['bride.fullName']}
          >
            <input
              id="bride-fullName"
              type="text"
              value={form.bride.fullName}
              onChange={(e) => updatePerson('bride', 'fullName', e.target.value)}
              placeholder="Putu Eva Cahyani"
              className={INPUT_CLASS}
            />
          </Field>

          <Field
            id="bride-nickname"
            label="Nama Panggilan Wanita"
            required
            error={errors['bride.nickname']}
          >
            <input
              id="bride-nickname"
              type="text"
              value={form.bride.nickname}
              onChange={(e) => updatePerson('bride', 'nickname', e.target.value)}
              placeholder="Eva"
              className={INPUT_CLASS}
            />
          </Field>
        </div>

        <Field
          id="bride-parents"
          label="Deskripsi Nama Orang Tua Wanita"
          hint="Contoh: Putri pertama dari pasangan Bpk. I Nyoman Kertiyasa & Ibu Dewa Ayu Citrawati"
        >
          <textarea
            id="bride-parents"
            rows={2}
            value={form.bride.parentDescription}
            onChange={(e) => updatePerson('bride', 'parentDescription', e.target.value)}
            placeholder="Putri pertama dari pasangan Bpk. ... & Ibu ..."
            className={INPUT_CLASS}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field id="bride-address" label="Alamat / Asal Wanita">
            <input
              id="bride-address"
              type="text"
              value={form.bride.address}
              onChange={(e) => updatePerson('bride', 'address', e.target.value)}
              placeholder="Sesetan, Denpasar Selatan"
              className={INPUT_CLASS}
            />
          </Field>

          <Field id="bride-ig" label="Instagram Wanita" hint="Ketik username saja tanpa simbol @">
            <input
              id="bride-ig"
              type="text"
              value={form.bride.instagram}
              onChange={(e) => updatePerson('bride', 'instagram', sanitizeInstagram(e.target.value))}
              placeholder="evacahyani"
              className={INPUT_CLASS}
            />
          </Field>
        </div>
      </section>

      {/* Peserta Mepandes (Conditional) */}
      {form.hasMepandes && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4 pb-2 border-b border-codGray-100">
            <h3 className="font-ibarra text-2xl font-semibold text-codGray-950">
              Peserta Metatah / Mepandes
            </h3>
            <button
              type="button"
              onClick={addMepandes}
              className="inline-flex items-center gap-1.5 rounded-xl border border-codGray-900 px-3.5 py-2 text-xs font-medium text-codGray-900 hover:bg-codGray-50 cursor-pointer"
            >
              <Plus size={14} />
              <span>Tambah Peserta</span>
            </button>
          </div>

          {errors.mepandes && (
            <p role="alert" className="text-xs font-medium text-red-700">
              {errors.mepandes}
            </p>
          )}

          <div className="space-y-4">
            {(form.mepandes || []).map((person, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-goldSand-50 border border-goldSand-100 p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-codGray-950">
                    Peserta #{idx + 1}
                  </span>
                  {form.mepandes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMepandes(idx)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:underline cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>

                <Field
                  id={`mepandes-name-${idx}`}
                  label="Nama Lengkap"
                  required
                  error={errors[`mepandes.${idx}.fullName`]}
                >
                  <input
                    id={`mepandes-name-${idx}`}
                    type="text"
                    value={person.fullName}
                    onChange={(e) => updateMepandes(idx, 'fullName', e.target.value)}
                    placeholder="Komang Dika"
                    className={INPUT_CLASS}
                  />
                </Field>

                <Field id={`mepandes-desc-${idx}`} label="Deskripsi">
                  <textarea
                    id={`mepandes-desc-${idx}`}
                    rows={2}
                    value={person.description}
                    onChange={(e) => updateMepandes(idx, 'description', e.target.value)}
                    placeholder="Putra kedua dari pasangan..."
                    className={INPUT_CLASS}
                  />
                </Field>

                <Field id={`mepandes-ig-${idx}`} label="Instagram" hint="Tanpa simbol @">
                  <input
                    id={`mepandes-ig-${idx}`}
                    type="text"
                    value={person.instagram}
                    onChange={(e) =>
                      updateMepandes(idx, 'instagram', sanitizeInstagram(e.target.value))
                    }
                    placeholder="komangdika"
                    className={INPUT_CLASS}
                  />
                </Field>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function Step4Events({ form, errors, onChange }) {
  const handlePrimaryDateChange = (value) => {
    const suggestedLabel = formatDateIndo(value);
    onChange((prev) => {
      const nextEvents = prev.events.map((ev, idx) =>
        idx === 0 && !ev.dateLabel.trim() && suggestedLabel
          ? { ...ev, dateLabel: suggestedLabel }
          : ev
      );
      return { ...prev, primaryEventDateTime: value, events: nextEvents };
    });
  };

  const updateEvent = (index, key, value) => {
    onChange((prev) => ({
      ...prev,
      events: prev.events.map((ev, idx) => (idx === index ? { ...ev, [key]: value } : ev)),
    }));
  };

  const addEvent = () => {
    onChange((prev) => ({
      ...prev,
      events: [...prev.events, createEmptyEvent()],
    }));
  };

  const removeEvent = (index) => {
    onChange((prev) => ({
      ...prev,
      events: prev.events.filter((_, idx) => idx !== index),
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-ibarra text-3xl font-semibold text-codGray-950">
          Rangkaian <span className="italic text-goldSand-800">Acara</span>
        </h2>
        <p className="text-sm text-codGray-500 mt-1.5">
          Tentukan waktu utama untuk hitung mundur, lalu lengkapi detail setiap sesi acara Anda.
        </p>
      </div>

      <Field
        id="primary-event-datetime"
        label="Tanggal & Waktu Acara Dimulai"
        required
        hint="Digunakan untuk hitung mundur dan tanggal sampul undangan."
        error={errors.primaryEventDateTime}
      >
        <input
          id="primary-event-datetime"
          type="datetime-local"
          value={form.primaryEventDateTime}
          onChange={(e) => handlePrimaryDateChange(e.target.value)}
          className={INPUT_CLASS}
        />
      </Field>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 pt-2">
          <h3 className="font-ibarra text-2xl font-semibold text-codGray-950">Detail Sesi Acara</h3>
          <button
            type="button"
            onClick={addEvent}
            className="inline-flex items-center gap-1.5 rounded-xl border border-codGray-900 px-3.5 py-2 text-xs font-medium text-codGray-900 hover:bg-codGray-50 cursor-pointer"
          >
            <Plus size={14} />
            <span>Tambah Acara</span>
          </button>
        </div>

        {form.events.map((ev, idx) => (
          <div
            key={idx}
            className="rounded-2xl bg-goldSand-50 border border-goldSand-100 p-4 sm:p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-codGray-950">Acara #{idx + 1}</span>
              {form.events.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEvent(idx)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:underline cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Hapus</span>
                </button>
              )}
            </div>

            <Field
              id={`event-name-${idx}`}
              label="Nama Acara"
              required
              error={errors[`events.${idx}.name`]}
            >
              <input
                id={`event-name-${idx}`}
                type="text"
                value={ev.name}
                onChange={(e) => updateEvent(idx, 'name', e.target.value)}
                placeholder="Pawiwahan / Resepsi / Memadik"
                className={INPUT_CLASS}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                id={`event-date-${idx}`}
                label="Hari & Tanggal Acara"
                required
                error={errors[`events.${idx}.dateLabel`]}
              >
                <input
                  id={`event-date-${idx}`}
                  type="text"
                  value={ev.dateLabel}
                  onChange={(e) => updateEvent(idx, 'dateLabel', e.target.value)}
                  placeholder="Rabu, 19 Agustus 2026"
                  className={INPUT_CLASS}
                />
              </Field>

              <Field
                id={`event-time-${idx}`}
                label="Waktu Acara"
                required
                error={errors[`events.${idx}.timeLabel`]}
              >
                <input
                  id={`event-time-${idx}`}
                  type="text"
                  value={ev.timeLabel}
                  onChange={(e) => updateEvent(idx, 'timeLabel', e.target.value)}
                  placeholder="Pukul 15.00 WITA – Selesai"
                  className={INPUT_CLASS}
                />
              </Field>
            </div>

            <Field
              id={`event-address-${idx}`}
              label="Alamat Lengkap Lokasi Acara"
              required
              error={errors[`events.${idx}.address`]}
            >
              <textarea
                id={`event-address-${idx}`}
                rows={2}
                value={ev.address}
                onChange={(e) => updateEvent(idx, 'address', e.target.value)}
                placeholder="Jalan Raya Gadon, Gg Manggis No 4, Kerobokan"
                className={INPUT_CLASS}
              />
            </Field>

            <Field
              id={`event-maps-${idx}`}
              label="Link Google Maps"
              hint="Buka Google Maps → Bagikan → Salin link lalu tempel di sini."
              error={errors[`events.${idx}.mapsUrl`]}
            >
              <input
                id={`event-maps-${idx}`}
                type="url"
                value={ev.mapsUrl}
                onChange={(e) => updateEvent(idx, 'mapsUrl', e.target.value)}
                placeholder="https://maps.app.goo.gl/..."
                className={INPUT_CLASS}
              />
            </Field>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Step5FeaturesMedia({ form, errors, onChange }) {
  const toggleLoveStory = (enabled) => {
    onChange((prev) => ({
      ...prev,
      features: { ...prev.features, loveStoryEnabled: enabled },
      loveStories:
        enabled && (!prev.loveStories || prev.loveStories.length === 0)
          ? [createEmptyLoveStory()]
          : prev.loveStories,
    }));
  };

  const toggleDigitalGift = (enabled) => {
    onChange((prev) => ({
      ...prev,
      features: { ...prev.features, digitalGiftEnabled: enabled },
      digitalGifts:
        enabled && (!prev.digitalGifts || prev.digitalGifts.length === 0)
          ? [createEmptyDigitalGift()]
          : prev.digitalGifts,
    }));
  };

  const updateStory = (idx, key, val) => {
    onChange((prev) => ({
      ...prev,
      loveStories: prev.loveStories.map((s, i) => (i === idx ? { ...s, [key]: val } : s)),
    }));
  };

  const updateGift = (idx, key, val) => {
    onChange((prev) => ({
      ...prev,
      digitalGifts: prev.digitalGifts.map((g, i) => (i === idx ? { ...g, [key]: val } : g)),
    }));
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-ibarra text-3xl font-semibold text-codGray-950">
          Paket, Fitur &amp; <span className="italic text-goldSand-800">Media</span>
        </h2>
        <p className="text-sm text-codGray-500 mt-1.5">
          Pilih paket undangan, aktifkan fitur opsional yang diinginkan, serta sertakan tautan musik atau foto bila sudah siap.
        </p>
      </div>

      {/* Paket */}
      <section className="space-y-3">
        <h3 className="font-ibarra text-2xl font-semibold text-codGray-950">Pilih Paket</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ORDER_PACKAGES.map((pkg) => {
            const selected = form.packageId === pkg.id;
            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => onChange((prev) => ({ ...prev, packageId: pkg.id }))}
                className={`text-left rounded-2xl border p-5 transition-colors cursor-pointer flex flex-col justify-between ${
                  selected
                    ? 'border-goldSand-800 bg-goldSand-50'
                    : 'border-codGray-100 bg-white hover:border-codGray-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-ibarra text-2xl font-semibold text-codGray-950">
                      {pkg.name}
                    </span>
                    {pkg.recommended && (
                      <span className="rounded-full bg-goldSand-800 px-2.5 py-0.5 text-xs font-medium text-white">
                        Rekomendasi
                      </span>
                    )}
                  </div>
                  <p className="font-ibarra text-2xl font-semibold text-goldSand-800 mt-2">
                    Free
                  </p>
                  <p className="text-xs text-codGray-500 mt-1.5">{pkg.summary}</p>
                  <ul className="mt-4 space-y-1.5 text-xs text-codGray-900">
                    {pkg.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <Check size={14} className="text-goldSand-800 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </button>
            );
          })}
        </div>
        {errors.packageId && (
          <p role="alert" className="text-xs font-medium text-red-700">
            {errors.packageId}
          </p>
        )}
      </section>

      {/* Fitur Tambahan */}
      <section className="space-y-4">
        <h3 className="font-ibarra text-2xl font-semibold text-codGray-950">Fitur Tambahan</h3>

        {/* Love Story */}
        <div className="rounded-2xl border border-codGray-100 bg-white p-5 space-y-4">
          <SwitchRow
            id="switch-love-story"
            title="Love Story"
            description="Tampilkan kisah perjalanan cinta dari perkenalan hingga lamaran."
            checked={form.features.loveStoryEnabled}
            onChange={toggleLoveStory}
          />

          {form.features.loveStoryEnabled && (
            <div className="pt-4 border-t border-codGray-100 space-y-4">
              {errors.loveStories && (
                <p role="alert" className="text-xs font-medium text-red-700">
                  {errors.loveStories}
                </p>
              )}

              {form.loveStories.map((story, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-goldSand-50 border border-goldSand-100 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-codGray-900">Cerita #{idx + 1}</span>
                    {form.loveStories.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          onChange((prev) => ({
                            ...prev,
                            loveStories: prev.loveStories.filter((_, i) => i !== idx),
                          }))
                        }
                        className="text-xs font-medium text-red-700 hover:underline cursor-pointer"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  <Field
                    id={`story-title-${idx}`}
                    label="Judul Momen"
                    required
                    error={errors[`loveStories.${idx}.title`]}
                  >
                    <input
                      id={`story-title-${idx}`}
                      type="text"
                      value={story.title}
                      onChange={(e) => updateStory(idx, 'title', e.target.value)}
                      placeholder="Pertama Bertemu (2022)"
                      className={INPUT_CLASS}
                    />
                  </Field>
                  <Field
                    id={`story-desc-${idx}`}
                    label="Cerita Singkat"
                    required
                    error={errors[`loveStories.${idx}.description`]}
                  >
                    <textarea
                      id={`story-desc-${idx}`}
                      rows={2}
                      value={story.description}
                      onChange={(e) => updateStory(idx, 'description', e.target.value)}
                      placeholder="Ceritakan momen singkatnya di sini..."
                      className={INPUT_CLASS}
                    />
                  </Field>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  onChange((prev) => ({
                    ...prev,
                    loveStories: [...prev.loveStories, createEmptyLoveStory()],
                  }))
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-codGray-900 px-3.5 py-2 text-xs font-medium text-codGray-900 hover:bg-codGray-50 cursor-pointer"
              >
                <Plus size={14} />
                <span>Tambah Cerita</span>
              </button>
            </div>
          )}
        </div>

        {/* Amplop Digital */}
        <div className="rounded-2xl border border-codGray-100 bg-white p-5 space-y-4">
          <SwitchRow
            id="switch-digital-gift"
            title="Amplop Digital"
            description="Tamu dapat menyalin nomor rekening atau e-wallet untuk mengirim tanda kasih."
            checked={form.features.digitalGiftEnabled}
            onChange={toggleDigitalGift}
          />

          {form.features.digitalGiftEnabled && (
            <div className="pt-4 border-t border-codGray-100 space-y-4">
              {errors.digitalGifts && (
                <p role="alert" className="text-xs font-medium text-red-700">
                  {errors.digitalGifts}
                </p>
              )}

              {form.digitalGifts.map((gift, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-goldSand-50 border border-goldSand-100 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-codGray-900">Rekening #{idx + 1}</span>
                    {form.digitalGifts.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          onChange((prev) => ({
                            ...prev,
                            digitalGifts: prev.digitalGifts.filter((_, i) => i !== idx),
                          }))
                        }
                        className="text-xs font-medium text-red-700 hover:underline cursor-pointer"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field
                      id={`gift-bank-${idx}`}
                      label="Bank / E-Wallet"
                      required
                      error={errors[`digitalGifts.${idx}.bankName`]}
                    >
                      <input
                        id={`gift-bank-${idx}`}
                        type="text"
                        value={gift.bankName}
                        onChange={(e) => updateGift(idx, 'bankName', e.target.value)}
                        placeholder="BCA, BNI, Mandiri"
                        className={INPUT_CLASS}
                      />
                    </Field>
                    <Field
                      id={`gift-holder-${idx}`}
                      label="Nama Pemilik"
                      required
                      error={errors[`digitalGifts.${idx}.accountHolder`]}
                    >
                      <input
                        id={`gift-holder-${idx}`}
                        type="text"
                        value={gift.accountHolder}
                        onChange={(e) => updateGift(idx, 'accountHolder', e.target.value)}
                        placeholder="I Gede Adi Wijaya"
                        className={INPUT_CLASS}
                      />
                    </Field>
                    <Field
                      id={`gift-number-${idx}`}
                      label="Nomor Rekening"
                      required
                      error={errors[`digitalGifts.${idx}.accountNumber`]}
                    >
                      <input
                        id={`gift-number-${idx}`}
                        type="text"
                        value={gift.accountNumber}
                        onChange={(e) => updateGift(idx, 'accountNumber', e.target.value)}
                        placeholder="0700899045"
                        className={INPUT_CLASS}
                      />
                    </Field>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  onChange((prev) => ({
                    ...prev,
                    digitalGifts: [...prev.digitalGifts, createEmptyDigitalGift()],
                  }))
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-codGray-900 px-3.5 py-2 text-xs font-medium text-codGray-900 hover:bg-codGray-50 cursor-pointer"
              >
                <Plus size={14} />
                <span>Tambah Rekening</span>
              </button>
            </div>
          )}
        </div>

        {/* Split Link Add-On */}
        <div className="rounded-2xl border border-codGray-100 bg-white p-5">
          <SwitchRow
            id="switch-split-link"
            title={ORDER_ADDONS.splitLink.name}
            badge="Free"
            description={ORDER_ADDONS.splitLink.description}
            checked={form.addons.splitLink}
            onChange={(enabled) =>
              onChange((prev) => ({ ...prev, addons: { ...prev.addons, splitLink: enabled } }))
            }
          />
        </div>
      </section>

      {/* Media & Catatan */}
      <section className="space-y-4">
        <h3 className="font-ibarra text-2xl font-semibold text-codGray-950">
          Media &amp; Catatan Khusus
        </h3>

        <Field
          id="media-music"
          label="Link Musik Latar (YouTube)"
          hint="Di aplikasi YouTube: ketuk Bagikan → Salin tautan lalu tempel di sini."
          error={errors['media.musicUrl']}
        >
          <input
            id="media-music"
            type="url"
            value={form.media.musicUrl}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, media: { ...prev.media, musicUrl: e.target.value } }))
            }
            placeholder="https://www.youtube.com/watch?v=..."
            className={INPUT_CLASS}
          />
        </Field>

        <Field
          id="media-video"
          label="Link Video Prewedding (YouTube)"
          hint="Sertakan tautan YouTube bila ingin menampilkan video sinematik di galeri."
          error={errors['media.videoUrl']}
        >
          <input
            id="media-video"
            type="url"
            value={form.media.videoUrl}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, media: { ...prev.media, videoUrl: e.target.value } }))
            }
            placeholder="https://www.youtube.com/watch?v=..."
            className={INPUT_CLASS}
          />
        </Field>

        <Field
          id="media-photos"
          label="Tautan Folder Foto (Google Drive)"
          hint="Pastikan akses tautan disetel ke 'Siapa saja yang memiliki link'. Jika belum siap, foto bisa dikirim via WhatsApp setelah pemesanan."
          error={errors['media.photoDriveUrl']}
        >
          <input
            id="media-photos"
            type="url"
            value={form.media.photoDriveUrl}
            onChange={(e) =>
              onChange((prev) => ({
                ...prev,
                media: { ...prev.media, photoDriveUrl: e.target.value },
              }))
            }
            placeholder="https://drive.google.com/drive/folders/..."
            className={INPUT_CLASS}
          />
        </Field>

        <Field
          id="order-notes"
          label="Catatan / Request Khusus"
          hint="Misalnya request kutipan/sloka khusus, urutan nama mempelai, atau preferensi lainnya."
        >
          <textarea
            id="order-notes"
            rows={3}
            value={form.notes}
            onChange={(e) => onChange((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Tulis catatan tambahan bila ada..."
            className={INPUT_CLASS}
          />
        </Field>
      </section>
    </div>
  );
}

export function Step6ReviewContact({ form, errors, onChange, onJumpStep }) {
  const theme = ORDER_THEMES.find((t) => t.id === form.themeId);
  const pkg = ORDER_PACKAGES.find((p) => p.id === form.packageId) || ORDER_PACKAGES[0];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-ibarra text-3xl font-semibold text-codGray-950">
          Kontak &amp; <span className="italic text-goldSand-800">Konfirmasi</span>
        </h2>
        <p className="text-sm text-codGray-500 mt-1.5">
          Periksa kembali ringkasan pesanan Anda dan masukkan nomor WhatsApp aktif untuk konfirmasi.
        </p>
      </div>

      {/* Custom Link & Kontak */}
      <section className="space-y-4">
        <Field
          id="requested-slug"
          label="Custom Link Undangan"
          required
          hint="Hanya gunakan huruf kecil, angka, dan tanda hubung (-). Contoh: adi-eva"
          error={errors.requestedSlug}
        >
          <div className="flex rounded-xl border border-codGray-100 bg-white overflow-hidden focus-within:border-goldSand-800 focus-within:ring-2 focus-within:ring-goldSand-300/60">
            <span className="inline-flex items-center px-3.5 bg-goldSand-50 text-xs sm:text-sm text-codGray-500 border-r border-codGray-100 whitespace-nowrap">
              {BRAND_CONFIG.domain}/
            </span>
            <input
              id="requested-slug"
              type="text"
              value={form.requestedSlug}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  requestedSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                  isSlugEdited: true,
                }))
              }
              onBlur={() =>
                onChange((prev) => ({
                  ...prev,
                  requestedSlug: slugifyText(prev.requestedSlug),
                }))
              }
              placeholder="adi-eva"
              className="w-full px-3.5 py-3 text-sm sm:text-base text-codGray-950 focus:outline-none"
            />
          </div>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            id="contact-name"
            label="Nama Pemesan"
            required
            hint="Nama Anda yang dapat dihubungi admin terkait pesanan ini."
            error={errors['contact.customerName']}
          >
            <input
              id="contact-name"
              type="text"
              value={form.contact.customerName}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  contact: { ...prev.contact, customerName: e.target.value },
                }))
              }
              placeholder="Contoh: Adi Wijaya"
              className={INPUT_CLASS}
            />
          </Field>

          <Field
            id="contact-whatsapp"
            label="Nomor WhatsApp Aktif"
            required
            hint="Kami akan mengirimkan konfirmasi pesanan dan link preview ke nomor ini."
            error={errors['contact.whatsapp']}
          >
            <input
              id="contact-whatsapp"
              type="tel"
              inputMode="tel"
              value={form.contact.whatsapp}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  contact: { ...prev.contact, whatsapp: e.target.value },
                }))
              }
              placeholder="081234567890"
              className={INPUT_CLASS}
            />
          </Field>
        </div>
      </section>

      {/* Ringkasan Lengkap */}
      <section className="rounded-2xl bg-goldSand-50 border border-goldSand-100 p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-ibarra text-2xl font-semibold text-codGray-950">
            Periksa Data Pesanan
          </h3>
        </div>

        <div className="divide-y divide-goldSand-100 text-sm">
          <div className="py-3 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-codGray-500">Tema &amp; Jenis Acara</p>
              <p className="font-medium text-codGray-950 mt-0.5">
                {theme?.name || '-'} · Pernikahan{form.hasMepandes ? ' + Mepandes' : ''}
              </p>
              <p className="text-xs text-codGray-500 mt-0.5">
                Izin portofolio sosmed: {form.allowSocialMedia ? 'Boleh (setelah acara)' : 'Tidak'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onJumpStep(2)}
              className="text-xs font-medium text-goldSand-800 underline underline-offset-4 hover:text-codGray-950 cursor-pointer shrink-0"
            >
              Ubah
            </button>
          </div>

          <div className="py-3 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-codGray-500">Mempelai</p>
              <p className="font-medium text-codGray-950 mt-0.5">
                {form.groom.fullName} ({form.groom.nickname}) &amp; {form.bride.fullName} (
                {form.bride.nickname})
              </p>
              {form.hasMepandes && form.mepandes.length > 0 && (
                <p className="text-xs text-codGray-500 mt-0.5">
                  Peserta Mepandes: {form.mepandes.map((p) => p.fullName).filter(Boolean).join(', ')}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onJumpStep(3)}
              className="text-xs font-medium text-goldSand-800 underline underline-offset-4 hover:text-codGray-950 cursor-pointer shrink-0"
            >
              Ubah
            </button>
          </div>

          <div className="py-3 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-codGray-500">Rangkaian Acara ({form.events.length})</p>
              <p className="font-medium text-codGray-950 mt-0.5">
                {formatDateIndo(form.primaryEventDateTime) || '-'}
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-codGray-500">
                {form.events.map((ev, idx) => (
                  <li key={idx}>
                    {ev.name} — {ev.dateLabel} ({ev.timeLabel})
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => onJumpStep(4)}
              className="text-xs font-medium text-goldSand-800 underline underline-offset-4 hover:text-codGray-950 cursor-pointer shrink-0"
            >
              Ubah
            </button>
          </div>

          <div className="py-3 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-codGray-500">Paket &amp; Fitur</p>
              <p className="font-medium text-codGray-950 mt-0.5">
                Paket {pkg.name}
                {form.addons.splitLink ? ` + ${ORDER_ADDONS.splitLink.name}` : ''} · Free
              </p>
              <p className="text-xs text-codGray-500 mt-0.5">
                {[
                  form.features.loveStoryEnabled && `Love Story (${form.loveStories.length})`,
                  form.features.digitalGiftEnabled &&
                    `Amplop Digital (${form.digitalGifts.length} rekening)`,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Tanpa fitur opsional tambahan'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onJumpStep(5)}
              className="text-xs font-medium text-goldSand-800 underline underline-offset-4 hover:text-codGray-950 cursor-pointer shrink-0"
            >
              Ubah
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-goldSand-200 flex items-baseline justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-codGray-950">Biaya Pemesanan</p>
            <p className="text-xs text-codGray-500 mt-0.5">
              Konfirmasi pesanan dilanjutkan melalui WhatsApp Admin setelah formulir dikirim.
            </p>
          </div>
          <span className="font-ibarra text-3xl font-semibold text-goldSand-800 shrink-0">
            Free
          </span>
        </div>
      </section>
    </div>
  );
}
