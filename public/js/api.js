// API client + session state. Imported by both views.js and app.js.
const TOKEN_KEY = 'biblio_token';
const USER_KEY = 'biblio_user';

export const session = { token: null, user: null };

export function loadSession() {
  session.token = localStorage.getItem(TOKEN_KEY);
  try {
    session.user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    session.user = null;
  }
}

export function setSession(token, user) {
  session.token = token;
  session.user = user;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  session.token = null;
  session.user = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn() {
  return Boolean(session.token);
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && session.token) headers.Authorization = `Bearer ${session.token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }

  if (!res.ok) {
    if (res.status === 401 && auth) {
      clearSession();
      window.dispatchEvent(new Event('app:auth-changed'));
    }
    throw new Error((data && data.error) || 'Une erreur est survenue');
  }
  return data;
}

function qs(query) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(query || {})) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  me: () => request('/auth/me', { auth: true }),

  categories: () => request('/books/categories'),
  books: (query = {}) => request(`/books${qs(query)}`, { auth: true }),
  book: (id) => request(`/books/${id}`),
  createBook: (payload) => request('/books', { method: 'POST', body: payload, auth: true }),
  updateBook: (id, payload) => request(`/books/${id}`, { method: 'PUT', body: payload, auth: true }),
  deleteBook: (id) => request(`/books/${id}`, { method: 'DELETE', auth: true }),

  exchanges: () => request('/exchanges', { auth: true }),
  createExchange: (payload) => request('/exchanges', { method: 'POST', body: payload, auth: true }),
  updateExchange: (id, status) =>
    request(`/exchanges/${id}`, { method: 'PATCH', body: { status }, auth: true }),
};
