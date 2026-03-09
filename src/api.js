/**
 * Backend API client. All data is read/written via these endpoints (nothing static or localStorage for app data).
 * In dev, Vite proxies /api to the server (see vite.config.js).
 */
export const API_BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'token';

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

/** Fetch with optional auth header (token from localStorage). */
export async function apiRequest(path, options = {}) {
  const url = apiUrl(path);
  const headers = { ...options.headers, 'Content-Type': 'application/json' };
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  if (options.raw) return res;
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(data?.error || res.statusText || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ---------- Colleges & Majors (from DB) ----------
export async function getColleges() {
  return apiRequest('/api/colleges');
}

export async function getMajors(collegeId = null) {
  const q = collegeId ? `?collegeId=${encodeURIComponent(collegeId)}` : '';
  return apiRequest(`/api/majors${q}`);
}

// ---------- Communities (dean: only their college's; supervisor: only their one) ----------
export async function getCommunities(collegeId = null) {
  const q = collegeId != null ? `?college_id=${encodeURIComponent(collegeId)}` : '';
  return apiRequest(`/api/communities${q}`);
}

export async function createCommunity(body) {
  return apiRequest('/api/communities', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateCommunity(id, body) {
  return apiRequest(`/api/communities/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

// ---------- Admin: users and role assignments ----------
export async function getAdminUsers(role = null) {
  const q = role ? `?role=${encodeURIComponent(role)}` : '';
  return apiRequest(`/api/admin/users${q}`);
}

export async function assignDeanToCollege(userId, collegeId) {
  return apiRequest(`/api/admin/users/${userId}/assign-college`, {
    method: 'PATCH',
    body: JSON.stringify({ collegeId }),
  });
}

export async function assignSupervisorToCommunity(userId, communityId) {
  return apiRequest(`/api/admin/users/${userId}/assign-community`, {
    method: 'PATCH',
    body: JSON.stringify({ communityId }),
  });
}

// ---------- Events (from DB) ----------
export async function getEvents(status = null) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest(`/api/events${q}`);
}

export async function getEvent(id) {
  return apiRequest(`/api/events/${encodeURIComponent(id)}`);
}

export async function createEvent(body) {
  return apiRequest('/api/events', { method: 'POST', body: JSON.stringify(body) });
}

export async function updateEvent(id, body) {
  return apiRequest(`/api/events/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(body) });
}

export async function approveEvent(id) {
  return apiRequest(`/api/events/${id}/approve`, { method: 'PATCH' });
}

export async function rejectEvent(id, feedback = null) {
  return apiRequest(`/api/events/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ feedback }) });
}

export async function deleteEvent(id) {
  const res = await fetch(apiUrl(`/api/events/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });
  if (res.status === 204) return;
  const data = await res.json().catch(() => ({}));
  const err = new Error(data?.error || res.statusText);
  err.status = res.status;
  err.data = data;
  throw err;
}

export async function getAdminEvents() {
  return apiRequest('/api/admin/events');
}

// ---------- Event registrations (from DB) ----------
export async function getEventRegistrations() {
  return apiRequest('/api/event-registrations');
}

export async function registerForEvent(payload) {
  return apiRequest('/api/event-registrations', { method: 'POST', body: JSON.stringify(payload) });
}

// ---------- Student profile (from DB) ----------
export async function getStudentProfile() {
  return apiRequest('/api/student-profile');
}

export async function saveStudentProfile(data) {
  return apiRequest('/api/student-profile', { method: 'PUT', body: JSON.stringify(data) });
}

// ---------- Notifications (from DB) ----------
export async function getNotifications() {
  return apiRequest('/api/notifications');
}

export async function markNotificationRead(id) {
  return apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' });
}

export async function createWelcomeNotification() {
  return apiRequest('/api/notifications', {
    method: 'POST',
    body: JSON.stringify({ title: 'Welcome', message: 'You are logged in to An-Najah National University.' }),
  });
}
