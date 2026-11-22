import React, { useState } from 'react';
import { Edit3, Eye, EyeOff, Loader2, Lock, Plus, Shield, Trash2 } from 'lucide-react';
import {
  changeAdminPassword,
  createAdminUser,
  deleteAdminUser,
  updateAdminUser,
} from '../../services/api';

const INPUT_CLASS =
  'w-full rounded-xl border border-codGray-100 bg-white px-3.5 py-2.5 text-sm text-codGray-950 focus:border-goldSand-800 focus:outline-none';

export default function AdminUsersManager({
  currentAdmin,
  users = [],
  onUsersChange,
}) {
  const isOwner = currentAdmin?.role === 'owner';

  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingPw, setSavingPw] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'admin',
  });
  const [editingId, setEditingId] = useState('');
  const [editDraft, setEditDraft] = useState(null);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const handleChangeOwnPassword = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (pwForm.newPassword.length < 8) {
      setError('Password baru minimal 8 karakter.');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setError('Konfirmasi password baru tidak cocok.');
      return;
    }

    setSavingPw(true);
    try {
      await changeAdminPassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setNotice('Password Anda berhasil diubah. Sesi di perangkat lain otomatis diakhiri.');
    } catch (err) {
      setError(err?.message || 'Gagal mengganti password.');
    } finally {
      setSavingPw(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setBusyKey('create');
    setError('');
    setNotice('');
    try {
      const res = await createAdminUser(newUser);
      if (res?.user) {
        onUsersChange((prev) => [...prev, res.user]);
      }
      setNewUser({ name: '', email: '', password: '', role: 'admin' });
      setShowCreate(false);
      setNotice(`Akun admin "${res?.user?.email || newUser.email}" berhasil ditambahkan.`);
    } catch (err) {
      setError(err?.message || 'Gagal menambahkan akun admin.');
    } finally {
      setBusyKey('');
    }
  };

  const startEdit = (user) => {
    setError('');
    setNotice('');
    setEditingId(user.id);
    setEditDraft({
      name: user.name,
      role: user.role,
      isActive: Boolean(user.isActive),
      newPassword: '',
    });
  };

  const handleSaveEdit = async (userId) => {
    if (!editDraft) return;
    setBusyKey(`save-${userId}`);
    setError('');
    setNotice('');
    try {
      const payload = {
        name: editDraft.name,
        role: editDraft.role,
        isActive: Boolean(editDraft.isActive),
      };
      if (editDraft.newPassword.trim()) {
        payload.newPassword = editDraft.newPassword.trim();
      }
      const res = await updateAdminUser(userId, payload);
      if (res?.user) {
        onUsersChange((prev) => prev.map((u) => (u.id === userId ? res.user : u)));
      }
      setEditingId('');
      setEditDraft(null);
      setNotice('Perubahan akun admin berhasil disimpan.');
    } catch (err) {
      setError(err?.message || 'Gagal memperbarui akun admin.');
    } finally {
      setBusyKey('');
    }
  };

  const handleToggleActive = async (user) => {
    setBusyKey(`toggle-${user.id}`);
    setError('');
    setNotice('');
    try {
      const res = await updateAdminUser(user.id, { isActive: !user.isActive });
      if (res?.user) {
        onUsersChange((prev) => prev.map((u) => (u.id === user.id ? res.user : u)));
      }
    } catch (err) {
      setError(err?.message || 'Gagal mengubah status akun.');
    } finally {
      setBusyKey('');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Hapus akun admin "${user.name}" (${user.email}) secara permanen?`)) return;
    setBusyKey(`delete-${user.id}`);
    setError('');
    setNotice('');
    try {
      await deleteAdminUser(user.id);
      onUsersChange((prev) => prev.filter((u) => u.id !== user.id));
      setNotice(`Akun "${user.email}" telah dihapus.`);
    } catch (err) {
      setError(err?.message || 'Gagal menghapus akun admin.');
    } finally {
      setBusyKey('');
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-ibarra text-3xl font-semibold text-codGray-950">Akun Admin</h2>
          <p className="text-xs text-codGray-500 mt-1">
            Kelola password Anda serta akun tim admin yang dapat mengakses studio ini.
          </p>
        </div>
        {isOwner && (
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
            <span>{showCreate ? 'Tutup Form' : 'Tambah Admin'}</span>
          </button>
        )}
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

      {/* Own Password Change */}
      <form
        onSubmit={handleChangeOwnPassword}
        className="rounded-2xl bg-white border border-codGray-100 p-5 space-y-4"
      >
        <div className="flex items-center gap-2">
          <Lock size={15} className="text-goldSand-800" />
          <h3 className="font-ibarra text-2xl font-semibold text-codGray-950">
            Ganti Password Saya ({currentAdmin?.email})
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-codGray-900 mb-1">Password Lama *</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-codGray-900 mb-1">
              Password Baru * (min. 8 karakter)
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={pwForm.newPassword}
              onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-codGray-900 mb-1">
              Konfirmasi Password Baru *
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={pwForm.confirmPassword}
              onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
              className={INPUT_CLASS}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={savingPw}
          className="inline-flex items-center gap-1.5 rounded-xl bg-codGray-950 text-white px-4 py-2 text-xs font-medium cursor-pointer disabled:opacity-50"
        >
          {savingPw && <Loader2 size={13} className="animate-spin" />}
          <span>Simpan Password Baru</span>
        </button>
      </form>

      {/* Add Admin Form (Owner Only) */}
      {isOwner && showCreate && (
        <form
          onSubmit={handleCreateUser}
          className="rounded-2xl bg-white border border-codGray-100 p-5 space-y-4"
        >
          <h3 className="font-ibarra text-2xl font-semibold text-codGray-950">Tambah Akun Admin Baru</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-codGray-900 mb-1">Nama *</label>
              <input
                type="text"
                required
                placeholder="Nama CS / Admin"
                value={newUser.name}
                onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-codGray-900 mb-1">Email *</label>
              <input
                type="email"
                required
                placeholder="cs@anselmoments.com"
                value={newUser.email}
                onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-codGray-900 mb-1">
                Password Awal * (min. 8)
              </label>
              <input
                type="password"
                required
                minLength={8}
                placeholder="••••••••"
                value={newUser.password}
                onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-codGray-900 mb-1">Role</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}
                className={INPUT_CLASS}
              >
                <option value="admin">Admin (Kelola Konten & Pesanan)</option>
                <option value="owner">Owner (Akses Penuh + Kelola Akun)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busyKey === 'create'}
              className="inline-flex items-center gap-1.5 rounded-xl bg-codGray-950 text-white px-4 py-2 text-xs font-medium cursor-pointer disabled:opacity-50"
            >
              {busyKey === 'create' && <Loader2 size={13} className="animate-spin" />}
              <span>Buat Akun</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-xl border border-codGray-200 px-4 py-2 text-xs font-medium cursor-pointer"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {/* Admin Users List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-ibarra text-2xl font-semibold text-codGray-950">
            Daftar Admin Terdaftar ({users.length})
          </h3>
          {!isOwner && (
            <span className="text-xs text-codGray-500">
              Hanya akun Owner yang dapat menambah/mengubah akun lain.
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {users.map((user) => {
            const isSelf = user.id === currentAdmin?.id;
            const isEditing = editingId === user.id && editDraft;

            return (
              <div
                key={user.id}
                className={`rounded-2xl bg-white border border-codGray-100 p-5 space-y-3 ${
                  user.isActive ? '' : 'opacity-70'
                }`}
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs text-codGray-500 mb-1">Nama</label>
                        <input
                          type="text"
                          value={editDraft.name}
                          onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                          className={INPUT_CLASS}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-codGray-500 mb-1">Role</label>
                        <select
                          value={editDraft.role}
                          onChange={(e) => setEditDraft((d) => ({ ...d, role: e.target.value }))}
                          className={INPUT_CLASS}
                        >
                          <option value="admin">Admin</option>
                          <option value="owner">Owner</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-codGray-500 mb-1">
                        Reset Password (opsional, min. 8 karakter)
                      </label>
                      <input
                        type="password"
                        placeholder="Kosongkan jika tidak ingin reset password"
                        value={editDraft.newPassword}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, newPassword: e.target.value }))
                        }
                        className={INPUT_CLASS}
                      />
                    </div>

                    {!isSelf && (
                      <label className="inline-flex items-center gap-2 text-xs text-codGray-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(editDraft.isActive)}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, isActive: e.target.checked }))
                          }
                        />
                        <span>Akun aktif</span>
                      </label>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busyKey === `save-${user.id}`}
                        onClick={() => handleSaveEdit(user.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-goldSand-300 hover:bg-goldSand-400 px-4 py-2 text-xs font-medium text-codGray-950 cursor-pointer disabled:opacity-50"
                      >
                        {busyKey === `save-${user.id}` && (
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
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-ibarra text-2xl font-semibold text-codGray-950">
                            {user.name}
                          </h4>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              user.role === 'owner'
                                ? 'bg-codGray-950 text-white'
                                : 'bg-goldSand-100 text-goldSand-800'
                            }`}
                          >
                            {user.role === 'owner' && <Shield size={11} />}
                            <span>{user.role === 'owner' ? 'Owner' : 'Admin'}</span>
                          </span>
                          {isSelf && (
                            <span className="rounded-full bg-codGray-50 px-2 py-0.5 text-[11px] text-codGray-600">
                              Anda
                            </span>
                          )}
                          {!user.isActive && (
                            <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs text-red-700">
                              Nonaktif
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-codGray-600 mt-1">{user.email}</p>
                        <p className="text-[11px] text-codGray-400 mt-0.5">
                          Login terakhir: {user.lastLoginAt || 'Belum pernah login'}
                        </p>
                      </div>

                      {isOwner && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(user)}
                            className="inline-flex items-center gap-1 rounded-xl border border-codGray-200 px-2.5 py-1.5 text-xs font-medium text-codGray-900 hover:bg-codGray-50 cursor-pointer"
                          >
                            <Edit3 size={12} />
                            <span>Edit</span>
                          </button>
                          {!isSelf && (
                            <>
                              <button
                                type="button"
                                disabled={busyKey === `toggle-${user.id}`}
                                onClick={() => handleToggleActive(user)}
                                title={user.isActive ? 'Nonaktifkan akun' : 'Aktifkan akun'}
                                className="p-2 rounded-xl text-codGray-700 hover:bg-codGray-50 cursor-pointer disabled:opacity-40"
                              >
                                {user.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                              <button
                                type="button"
                                disabled={busyKey === `delete-${user.id}`}
                                onClick={() => handleDeleteUser(user)}
                                title="Hapus akun"
                                className="p-2 rounded-xl text-red-700 hover:bg-red-50 cursor-pointer disabled:opacity-40"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
