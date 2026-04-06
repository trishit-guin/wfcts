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

export function createSubstituteEntryRequest(token, payload) {
  return apiRequest('/data/substitute-entries', {
    method: 'POST',
    token,
    body: payload,
  })
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
