async function request(url, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = isFormData
    ? options.headers || {}
    : { 'Content-Type': 'application/json', ...(options.headers || {}) };

  const res = await fetch(url, { credentials: 'same-origin', ...options, headers });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!res.ok) {
    const err = new Error(data?.error || `Permintaan gagal (${res.status})`);
    err.status = res.status;
    err.errors = data?.errors;
    throw err;
  }

  return data;
}

export function normalizeOrderCode(rawCode) {
  return String(rawCode || '').trim().toUpperCase().replace(/\s+/g, '');
}

// Public API
export function getCatalog() {
  return request('/api/catalog');
}

export function createOrder(formState) {
  return request('/api/orders', {
    method: 'POST',
    body: JSON.stringify(formState),
  });
}

export async function getOrderByCode(rawCode) {
  const orderCode = normalizeOrderCode(rawCode);
  if (!orderCode) return null;
  try {
    return await request(`/api/orders/${encodeURIComponent(orderCode)}`);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

export async function getInvitation(slug, previewToken = '') {
  const qs = previewToken ? `?preview=${encodeURIComponent(previewToken)}` : '';
  return request(`/api/invitations/${encodeURIComponent(slug)}${qs}`);
}

export function getWishes(slug, previewToken = '') {
  const qs = previewToken ? `?preview=${encodeURIComponent(previewToken)}` : '';
  return request(`/api/invitations/${encodeURIComponent(slug)}/wishes${qs}`);
}

export function postWish(slug, wish, previewToken = '') {
  const qs = previewToken ? `?preview=${encodeURIComponent(previewToken)}` : '';
  return request(`/api/invitations/${encodeURIComponent(slug)}/wishes${qs}`, {
    method: 'POST',
    body: JSON.stringify(wish),
  });
}

// Multi-Admin Auth API
export function getAdminAuthStatus() {
  return request('/api/auth/admin/status');
}

export function setupFirstAdmin(payload) {
  return request('/api/auth/admin/setup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function loginAdmin(payload) {
  return request('/api/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function logoutAdmin() {
  return request('/api/auth/admin/logout', {
    method: 'POST',
  });
}

// Admin API (Signed HttpOnly cookie session protected)
export function getAdminMe() {
  return request('/api/admin/me');
}

export function changeAdminPassword(payload) {
  return request('/api/admin/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getAdminUsers() {
  return request('/api/admin/users');
}

export function createAdminUser(payload) {
  return request('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdminUser(id, payload) {
  return request(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteAdminUser(id) {
  return request(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function getAdminOrders(status = '') {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/api/admin/orders${qs}`);
}

export function updateAdminOrderStatus(id, status) {
  return request(`/api/admin/orders/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function convertOrderToInvitations(id) {
  return request(`/api/admin/orders/${encodeURIComponent(id)}/convert`, {
    method: 'POST',
  });
}

export function getAdminInvitations() {
  return request('/api/admin/invitations');
}

export function createAdminInvitation(payload) {
  return request('/api/admin/invitations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getAdminInvitation(id) {
  return request(`/api/admin/invitations/${encodeURIComponent(id)}`);
}

export function updateAdminInvitation(id, payload) {
  return request(`/api/admin/invitations/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteAdminInvitation(id) {
  return request(`/api/admin/invitations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function getAdminMedia({ orderId = '', invitationId = '' } = {}) {
  const params = new URLSearchParams();
  if (orderId) params.set('orderId', orderId);
  if (invitationId) params.set('invitationId', invitationId);
  const qs = params.toString();
  return request(`/api/admin/media${qs ? `?${qs}` : ''}`);
}

export function uploadAdminMedia(formData) {
  return request('/api/admin/media/upload', {
    method: 'POST',
    body: formData,
  });
}

export function deleteAdminMedia(id) {
  return request(`/api/admin/media/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function getAdminWishes(invitationId = '') {
  const qs = invitationId ? `?invitationId=${encodeURIComponent(invitationId)}` : '';
  return request(`/api/admin/wishes${qs}`);
}

export function updateAdminWish(id, payload) {
  return request(`/api/admin/wishes/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteAdminWish(id) {
  return request(`/api/admin/wishes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function getAdminTemplates() {
  return request('/api/admin/templates');
}

export function createAdminTemplate(payload) {
  return request('/api/admin/templates', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdminTemplate(id, payload) {
  return request(`/api/admin/templates/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteAdminTemplate(id) {
  return request(`/api/admin/templates/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function getAdminPackages() {
  return request('/api/admin/packages');
}

export function createAdminPackage(payload) {
  return request('/api/admin/packages', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdminPackage(id, payload) {
  return request(`/api/admin/packages/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteAdminPackage(id) {
  return request(`/api/admin/packages/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function getAdminMusicPresets() {
  return request('/api/admin/music-presets');
}

export function createAdminMusicPreset(formData) {
  return request('/api/admin/music-presets', {
    method: 'POST',
    body: formData,
  });
}

export function deleteAdminMusicPreset(id) {
  return request(`/api/admin/music-presets/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
