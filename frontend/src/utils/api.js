const API_BASE_URL = (() => {
  const envUrl = import.meta.env.VITE_API_URL
  if (envUrl) return envUrl.replace(/\/$/, '')

  // In production, default to relative /api to let Nginx proxy handle it
  if (import.meta.env.PROD) {
    return '/api'
  }

  // In development, Vite proxy handles /api
  return '/api'
})()

const REQUEST_TIMEOUT_MS = 30_000

async function apiRequest(path, options = {}) {
  const { method = 'GET', token = '', body } = options
  const headers = {}

  const isFormData = body instanceof FormData

  if (body !== undefined && !isFormData) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? (isFormData ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Request timed out. Please try again.')
    throw new Error('Unable to reach the backend API. Make sure the backend server is running.')
  } finally {
    clearTimeout(timeoutId)
  }

  const text = await response.text()
  const data = text ? JSON.parse(text) : {}

  if (!response.ok) {
    const error = new Error(data.message || 'Request failed')
    error.status = response.status
    throw error
  }

  return data
}

export function signupRequest(payload) {
  return apiRequest('/auth/signup', {
    method: 'POST',
    body: payload,
  })
}

export function loginRequest(credentials) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: credentials,
  })
}

export function getCurrentUserRequest(token) {
  return apiRequest('/auth/me', { token })
}

export function updateCurrentUserRequest(token, payload) {
  return apiRequest('/auth/me', {
    method: 'PATCH',
    token,
    body: payload,
  })
}

export function uploadProfileImageRequest(token, file) {
  const formData = new FormData()
  formData.append('image', file)

  return apiRequest('/auth/me/image', {
    method: 'POST',
    token,
    body: formData,
  })
}

export function getBootstrapRequest(token) {
  return apiRequest('/data/bootstrap', { token })
}

export function createWorkEntryRequest(token, payload) {
  return apiRequest('/data/work-entries', {
    method: 'POST',
    token,
    body: payload,
  })
}

export function updateWorkEntryRequest(token, entryId, payload) {
  return apiRequest(`/data/work-entries/${entryId}`, {
    method: 'PATCH',
    token,
    body: payload,
  })
}

export function createSubstituteEntryRequest(token, payload) {
  return apiRequest('/data/substitute-entries', {
    method: 'POST',
    token,
    body: payload,
  })
}

export function getTimetableSlotsRequest(token, filters = {}) {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  })

  const suffix = params.toString() ? `?${params.toString()}` : ''
  return apiRequest(`/data/timetable-slots${suffix}`, { token })
}

export function createTimetableSlotRequest(token, payload) {
  return apiRequest('/data/timetable-slots', {
    method: 'POST',
    token,
    body: payload,
  })
}

export function updateTimetableSlotRequest(token, slotId, payload) {
  return apiRequest(`/data/timetable-slots/${slotId}`, {
    method: 'PATCH',
    token,
    body: payload,
  })
}

export function deleteTimetableSlotRequest(token, slotId) {
  return apiRequest(`/data/timetable-slots/${slotId}`, {
    method: 'DELETE',
    token,
  })
}

export function getAvailableTeachersRequest(token, query) {
  const params = new URLSearchParams()
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  })

  return apiRequest(`/data/available-teachers?${params.toString()}`, { token })
}

export function getSubstituteSettlementsRequest(token) {
  return apiRequest('/data/substitute-settlements', { token })
}

export function createTaskRequest(token, payload) {
  return apiRequest('/data/tasks', {
    method: 'POST',
    token,
    body: payload,
  })
}

export function updateTaskRequest(token, taskId, payload) {
  return apiRequest(`/data/tasks/${taskId}`, {
    method: 'PATCH',
    token,
    body: payload,
  })
}

export function cancelTaskRequest(token, taskId) {
  return apiRequest(`/data/tasks/${taskId}/cancel`, {
    method: 'PATCH',
    token,
  })
}

export function markTaskCompleteRequest(token, taskId) {
  return apiRequest(`/data/tasks/${taskId}/complete`, {
    method: 'PATCH',
    token,
  })
}

export function createIndustrySessionRequest(token, payload) {
  return apiRequest('/data/industry-sessions', {
    method: 'POST',
    token,
    body: payload,
  })
}

export function updateIndustrySessionRequest(token, sessionId, payload) {
  return apiRequest(`/data/industry-sessions/${sessionId}`, {
    method: 'PATCH',
    token,
    body: payload,
  })
}

// ─── Managers ─────────────────────────────────────────────────────────────────

export function getManagersRequest(token) {
  return apiRequest('/data/managers', { token })
}

// ─── Calendar Events ──────────────────────────────────────────────────────────

export function getCalendarEventsRequest(token, params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.set(k, String(v))
  })
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return apiRequest(`/data/calendar-events${suffix}`, { token })
}

export function createCalendarEventRequest(token, payload) {
  return apiRequest('/data/calendar-events', { method: 'POST', token, body: payload })
}

export function updateCalendarEventRequest(token, id, payload) {
  return apiRequest(`/data/calendar-events/${id}`, { method: 'PATCH', token, body: payload })
}

export function approveCalendarEventRequest(token, id) {
  return apiRequest(`/data/calendar-events/${id}/approve`, { method: 'PATCH', token })
}

export function rejectCalendarEventRequest(token, id) {
  return apiRequest(`/data/calendar-events/${id}/reject`, { method: 'PATCH', token })
}

export function completeCalendarEventRequest(token, id) {
  return apiRequest(`/data/calendar-events/${id}/complete`, { method: 'PATCH', token })
}

export function substituteCalendarEventRequest(token, id, substituteTeacherId) {
  return apiRequest(`/data/calendar-events/${id}/substitute`, {
    method: 'PATCH',
    token,
    body: { substituteTeacherId },
  })
}

export function cancelCalendarEventRequest(token, id) {
  return apiRequest(`/data/calendar-events/${id}/cancel`, { method: 'PATCH', token })
}

// ─── Weekly Progress ──────────────────────────────────────────────────────────

export function getWeeklyProgressRequest(token, weekId) {
  const suffix = weekId ? `?weekId=${encodeURIComponent(weekId)}` : ''
  return apiRequest(`/data/weekly-progress${suffix}`, { token })
}

export function getWeeklyProgressHistoryRequest(token, limit = 12) {
  return apiRequest(`/data/weekly-progress/history?limit=${limit}`, { token })
}

export function snapshotWeeklyProgressRequest(token, weekId) {
  return apiRequest('/data/weekly-progress/snapshot', { method: 'POST', token, body: { weekId } })
}

// ─── Timetable Upload ─────────────────────────────────────────────────────────

export function uploadTimetableRequest(token, formData) {
  return apiRequest('/data/timetable-upload', { method: 'POST', token, body: formData })
}

export function getTimetableUploadRequest(token, id) {
  return apiRequest(`/data/timetable-upload/${id}`, { token })
}

export function patchTimetableUploadRequest(token, id, payload) {
  return apiRequest(`/data/timetable-upload/${id}`, { method: 'PATCH', token, body: payload })
}

export function saveTimetableUploadRequest(token, id) {
  return apiRequest(`/data/timetable-upload/${id}/save`, { method: 'POST', token })
}

export function checkSlotConflictRequest(token, payload) {
  return apiRequest('/data/timetable-slots/check-conflict', { method: 'POST', token, body: payload })
}

export function assignTimetableSlotRequest(token, slotId, payload) {
  return apiRequest(`/data/timetable-slots/${slotId}/assign`, { method: 'PATCH', token, body: payload })
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportMonthlyRequest(token, params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.set(k, String(v))
  })
  const suffix = query.toString() ? `?${query.toString()}` : ''

  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let response
  try {
    response = await fetch(`${API_BASE_URL}/data/export/monthly${suffix}`, { headers, signal: controller.signal })
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Export request timed out. Please try again.')
    throw new Error('Unable to reach the backend API.')
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    const text = await response.text()
    let message = 'Export failed'
    try { message = JSON.parse(text).message || message } catch { /* ignore */ }
    throw new Error(message)
  }

  const blob = await response.blob()
  const cd = response.headers.get('Content-Disposition') || ''
  const match = /filename="?([^"]+)"?/.exec(cd)
  const filename = match ? match[1] : 'export.xlsx'

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// ─── Academic Calendar ────────────────────────────────────────────────────────

export function getAcademicCalendarRequest(token) {
  return apiRequest('/data/academic-calendar', { token })
}

export function createAcademicEventRequest(token, payload) {
  return apiRequest('/data/academic-calendar', { method: 'POST', token, body: payload })
}

export function deleteAcademicEventRequest(token, id) {
  return apiRequest(`/data/academic-calendar/${id}`, { method: 'DELETE', token })
}

// ─── View another user's calendar (admin/HOD) ────────────────────────────────

export function getUserCalendarEventsRequest(token, userId, params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.set(k, String(v))
  })
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return apiRequest(`/data/calendar/user/${userId}${suffix}`, { token })
}
