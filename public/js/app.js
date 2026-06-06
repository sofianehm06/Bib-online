// Hash router + app chrome (top bar, bottom navigation) + bootstrap.
import { api, session, loadSession, setSession, clearSession, isLoggedIn } from './api.js';
import { initials } from './ui.js';
import * as views from './views.js';

const viewEl = document.getElementById('view');
const topbar = document.getElementById('topbar');
const bottomnav = document.getElementById('bottomnav');

const routes = [
  { pattern: '/', view: views.homeView },
  { pattern: '/categories', view: views.categoriesView },
  { pattern: '/book/:id', view: views.bookView },
  { pattern: '/add', view: views.addBookView, auth: true },
  { pattern: '/edit/:id', view: views.editBookView, auth: true },
  { pattern: '/mes-livres', view: views.myBooksView, auth: true },
  { pattern: '/echanges', view: views.exchangesView, auth: true },
  { pattern: '/profil', view: views.profileView, auth: true },
  { pattern: '/login', view: views.loginView },
  { pattern: '/register', view: views.registerView },
];

function parseHash() {
  const raw = (location.hash || '#/').slice(1) || '/';
  const [path, queryStr] = raw.split('?');
  const query = Object.fromEntries(new URLSearchParams(queryStr || ''));
  return { path: path || '/', query };
}

function matchRoute(path) {
  for (const r of routes) {
    const keys = [];
    const rx = new RegExp(
      '^' +
        r.pattern.replace(/:[^/]+/g, (m) => {
          keys.push(m.slice(1));
          return '([^/]+)';
        }) +
        '$'
    );
    const m = path.match(rx);
    if (m) {
      const params = {};
      keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      return { route: r, params };
    }
  }
  return null;
}

async function render() {
  const { path, query } = parseHash();
  const matched = matchRoute(path);

  if (!matched) {
    await views.notFoundView(viewEl, { params: {}, query });
    renderChrome(path);
    return;
  }
  if (matched.route.auth && !isLoggedIn()) {
    location.hash = '#/login';
    return;
  }

  window.scrollTo(0, 0);
  try {
    await matched.route.view(viewEl, { params: matched.params, query });
  } catch (e) {
    viewEl.innerHTML = `<div class="empty"><i class="bi bi-exclamation-triangle"></i><p>${e.message}</p></div>`;
  }
  renderChrome(path);
}

function renderChrome(path) {
  renderTopbar();
  renderNav(path);
}

function renderTopbar() {
  const right = isLoggedIn()
    ? `<a href="#/profil" class="topbar__user" title="Mon profil">${initials(session.user?.name)}</a>`
    : '<a href="#/login" class="topbar__login">Connexion</a>';
  topbar.innerHTML = `
    <a href="#/" class="brand">
      <span class="brand__logo"><i class="bi bi-book-half"></i></span>
      <span class="brand__name">Biblio<b>Échange</b></span>
    </a>
    ${right}`;
}

function renderNav(path) {
  const loggedIn = isLoggedIn();
  const items = [
    { href: '#/', icon: 'house-door', label: 'Accueil', active: path === '/' },
    { href: '#/categories', icon: 'grid', label: 'Catégories', active: path.startsWith('/categories') },
    { href: '#/add', icon: 'plus-lg', center: true, active: path === '/add' },
    { href: '#/echanges', icon: 'arrow-left-right', label: 'Échanges', active: path === '/echanges' },
    {
      href: loggedIn ? '#/profil' : '#/login',
      icon: 'person',
      label: loggedIn ? 'Profil' : 'Compte',
      active: ['/profil', '/login', '/register'].includes(path),
    },
  ];
  bottomnav.innerHTML = items
    .map((it) =>
      it.center
        ? `<a href="${it.href}" class="nav-item nav-item--center" aria-label="Ajouter un livre"><span class="nav-fab"><i class="bi bi-${it.icon}"></i></span></a>`
        : `<a href="${it.href}" class="nav-item ${it.active ? 'active' : ''}"><i class="bi bi-${it.icon}"></i><span>${it.label}</span></a>`
    )
    .join('');
}

window.addEventListener('hashchange', render);
window.addEventListener('app:refresh', render);
window.addEventListener('app:auth-changed', () => renderChrome(parseHash().path));

async function init() {
  loadSession();
  // Validate an existing token and refresh the cached user.
  if (isLoggedIn()) {
    try {
      const { user } = await api.me();
      setSession(session.token, user);
    } catch {
      clearSession();
    }
  }
  if (!location.hash) location.hash = '#/';
  await render();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

init();
