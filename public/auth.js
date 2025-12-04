// Shared authentication helper for whoiswrong.io frontend
// Handles storing tokens and talking to backend auth endpoints.
const API_BASE = window.location.origin;
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

function readStorageValue(key) {
  const value = localStorage.getItem(key);
  if (!value || value === 'null' || value === 'undefined') return null;
  return value;
}

function persistSessionTokens({ access_token, refresh_token, user }) {
  if (access_token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
  }
  if (refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
  }
  if (user) {
    try {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } catch (e) {
      // ignore storage errors
    }
  }
  return { accessToken: access_token || null, refreshToken: refresh_token || null, user: user || null };
}

function clearSessionTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem('currentUser');
}

function getAccessToken() {
  return readStorageValue(ACCESS_TOKEN_KEY);
}

function getRefreshToken() {
  return readStorageValue(REFRESH_TOKEN_KEY);
}

async function refreshSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const response = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    clearSessionTokens();
    return null;
  }

  const data = await response.json();
  return persistSessionTokens(data);
}

async function requireSession({ redirectTo } = {}) {
  let accessToken = getAccessToken();
  if (!accessToken) {
    const refreshed = await refreshSession();
    accessToken = refreshed?.accessToken || null;
  }

  if (!accessToken && redirectTo) {
    window.location.href = redirectTo;
    return null;
  }

  return { accessToken, refreshToken: getRefreshToken() };
}

async function loginUser(email, password) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Unable to log in');
  }
  const session = persistSessionTokens(data);
  return { ...session, user: data.user };
}

async function signupUser(email, password, username) {
  const response = await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, username }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Unable to sign up');
  }
  const session = persistSessionTokens(data);
  return { ...session, user: data.user };
}

function logoutUser({ redirectTo } = {}) {
  clearSessionTokens();
  if (redirectTo) {
    window.location.href = redirectTo;
  }
}

function authHeaders() {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

window.authClient = {
  getAccessToken,
  getRefreshToken,
  persistSessionTokens,
  clearSessionTokens,
  refreshSession,
  requireSession,
  loginUser,
  signupUser,
  logoutUser,
  authHeaders,
};
