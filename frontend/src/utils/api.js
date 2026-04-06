const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

async function apiRequest(path, options = {}) {
  const { method = 'GET', token = '', body } = options
  const headers = {}

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new Error('Unable to reach the backend API. Make sure the backend server is running.')
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
