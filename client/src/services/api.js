// ============================================================
// SERVICES — Centralised API client
// ============================================================

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';


const getAuthHeader = () => {
  const token = localStorage.getItem('hs_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const request = async (method, path, body = null) => {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
  };
  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, config);
  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.message || 'Request failed');
    error.status = res.status;
    error.errors = data.errors;
    throw error;
  }

  return data;
};

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  put:    (path, body)  => request('PUT',    path, body),
  delete: (path)        => request('DELETE', path),

  // Auth
  auth: {
    register:      (body) => api.post('/auth/register', body),
    login:         (body) => api.post('/auth/login', body),
    logout:        ()     => api.post('/auth/logout'),
    me:            ()     => api.get('/auth/me'),
    updateProfile: (body) => api.put('/auth/me', body),
  },

  // Doctors
  doctors: {
    search:         (params) => api.get(`/doctors?${new URLSearchParams(params)}`),
    aiSearch:       (query)  => api.post('/doctors/ai-search', { query }),
    getById:        (id)     => api.get(`/doctors/${id}`),
    create:         (body)   => api.post('/doctors', body),
    update:         (id, b)  => api.put(`/doctors/${id}`, b),
    getSlots:       (id, date)=> api.get(`/doctors/${id}/slots?date=${date}`),
    applyLeave:     (id, b)  => api.post(`/doctors/${id}/leave`, b),
    cancelLeave:    (id, lid)=> api.delete(`/doctors/${id}/leave/${lid}`),
    previewLeave:   (id, b)  => api.post(`/doctors/${id}/leave/preview`, b),
  },

  // Slots
  slots: {
    hold:    (slotId) => api.post(`/slots/${slotId}/hold`),
    release: (slotId) => api.delete(`/slots/${slotId}/hold`),
  },

  // Appointments
  appointments: {
    create:          (body)   => api.post('/appointments', body),
    list:            (params) => api.get(`/appointments?${new URLSearchParams(params || {})}`),
    getById:         (id)     => api.get(`/appointments/${id}`),
    submitNotes:     (id, b)  => api.put(`/appointments/${id}/notes`, b),
    cancel:          (id, b)  => api.put(`/appointments/${id}/cancel`, b),
    verifyReschedule:(token)  => api.get(`/appointments/reschedule/verify?token=${token}`),
    reschedule:      (body)   => api.post('/appointments/reschedule', body),
  },

  // AI Assistant
  ai: {
    chat: (payload) => api.post('/ai/chat', payload),
  },

  // Admin
  admin: {
    stats:           ()     => api.get('/admin/stats'),
    notificationQueue:(p)   => api.get(`/admin/notification-queue?${new URLSearchParams(p || {})}`),
    retryJob:        (id)   => api.post(`/admin/notification-queue/${id}/retry`),
  },
};
