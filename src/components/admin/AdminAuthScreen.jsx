import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Lock, Shield } from 'lucide-react';
import { BRAND_CONFIG } from '../../config/orderCatalog';
import { loginAdmin, setupFirstAdmin } from '../../services/api';

const INPUT_CLASS =
  'w-full rounded-xl border border-codGray-100 bg-white px-3.5 py-2.5 text-sm text-codGray-950 placeholder:text-codGray-400 focus:border-goldSand-800 focus:outline-none';

export default function AdminAuthScreen({
  needsSetup = false,
  configured = true,
  requireSetupKey = true,
  onAuthenticated,
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupKey, setSetupKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (needsSetup) {
      if (password.length < 8) {
        setError('Password minimal 8 karakter.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Konfirmasi password tidak cocok.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = needsSetup
        ? await setupFirstAdmin({ name, email, password, setupKey })
        : await loginAdmin({ email, password });
      if (res?.admin) {
        onAuthenticated(res.admin);
      }
    } catch (err) {
      setError(err?.message || 'Gagal memproses autentikasi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-goldSand-50 font-dm text-codGray-900 flex items-center justify-center p-5">
      <div className="w-full max-w-md rounded-2xl bg-white border border-codGray-100 p-7 sm:p-8 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <img
              src={BRAND_CONFIG.logoUrl}
              alt={BRAND_CONFIG.name}
              className="w-9 h-9 object-contain"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-goldSand-800 font-medium">
                {BRAND_CONFIG.name} Studio
              </p>
              <h1 className="font-ibarra text-3xl font-semibold text-codGray-950 leading-tight">
                {needsSetup ? 'Setup Admin Pertama' : 'Masuk ke Admin'}
              </h1>
            </div>
          </div>
          <p className="text-xs text-codGray-500 leading-relaxed">
            {needsSetup
              ? 'Belum ada akun admin di database. Buat akun Owner pertama untuk mengunci dan mengelola studio.'
              : 'Masuk dengan email dan password admin Anda untuk mengelola pesanan, undangan, tema, dan harga.'}
          </p>
        </div>

        {!configured ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-900 space-y-2"
          >
            <p className="font-semibold">ADMIN_SESSION_SECRET belum dikonfigurasi</p>
            <p className="leading-relaxed">
              Pasang secret sesi di Cloudflare Workers terlebih dahulu melalui terminal:
            </p>
            <code className="block rounded-lg bg-white border border-red-200 px-3 py-2 text-[11px] text-codGray-900">
              npx wrangler secret put ADMIN_SESSION_SECRET
            </code>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
              >
                {error}
              </div>
            )}

            {needsSetup && (
              <div>
                <label className="block text-xs font-medium text-codGray-900 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Nama Owner"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-codGray-900 mb-1">Email *</label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="admin@anselmoments.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-codGray-900 mb-1">
                Password * {needsSetup && <span className="text-codGray-400">(min. 8 karakter)</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={needsSetup ? 'new-password' : 'current-password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${INPUT_CLASS} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-codGray-500 hover:text-codGray-900 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {needsSetup && (
              <div>
                <label className="block text-xs font-medium text-codGray-900 mb-1">
                  Konfirmasi Password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Ulangi password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            )}

            {needsSetup && requireSetupKey && (
              <div>
                <label className="block text-xs font-medium text-codGray-900 mb-1">
                  Secret Key (ADMIN_SESSION_SECRET) *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Nilai ADMIN_SESSION_SECRET yang dipasang di Worker"
                  value={setupKey}
                  onChange={(e) => setSetupKey(e.target.value)}
                  className={INPUT_CLASS}
                />
                <p className="text-[11px] text-codGray-500 mt-1">
                  Hanya diminta sekali saat membuat akun Owner pertama agar setup tidak bisa dibajak publik.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-codGray-950 hover:bg-codGray-900 text-white px-5 py-3 text-sm font-medium cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : needsSetup ? (
                <Shield size={15} />
              ) : (
                <Lock size={15} />
              )}
              <span>
                {submitting
                  ? 'Memproses...'
                  : needsSetup
                    ? 'Buat Akun Owner & Masuk'
                    : 'Masuk ke Studio'}
              </span>
            </button>
          </form>
        )}

        <div className="pt-3 border-t border-codGray-100 flex items-center justify-between text-xs text-codGray-500">
          <Link to="/adi-eva" className="hover:text-codGray-950 underline underline-offset-4">
            Lihat Demo Undangan
          </Link>
          <Link to="/order" className="hover:text-codGray-950 underline underline-offset-4">
            Halaman Order
          </Link>
        </div>
      </div>
    </div>
  );
}
