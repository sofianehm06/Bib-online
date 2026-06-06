// Reusable UI helpers: escaping, covers, badges, toasts, modals, dates.

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

export function initials(name) {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase();
}

const CATEGORY_ICONS = {
  Roman: 'book',
  'Science-fiction': 'rocket-takeoff',
  Policier: 'search-heart',
  Jeunesse: 'balloon',
  Sciences: 'thermometer-half',
  Histoire: 'hourglass-split',
  Biographie: 'person-vcard',
  'Bande dessinée': 'images',
  Cuisine: 'egg-fried',
  Informatique: 'cpu',
  'Développement personnel': 'lightbulb',
  Autre: 'three-dots',
};
export function categoryIcon(cat) {
  return CATEGORY_ICONS[cat] || 'book';
}

function hueFromString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}

export function coverStyle(title) {
  const h = hueFromString(title || 'Livre');
  return `background: linear-gradient(135deg, hsl(${h} 65% 55%), hsl(${(h + 45) % 360} 70% 42%));`;
}

// Renders a cover block — image if provided, otherwise a coloured placeholder.
export function coverHtml(book, { badge = '' } = {}) {
  const inner = book.cover
    ? `<img src="${escapeHtml(book.cover)}" alt="${escapeHtml(book.title)}" loading="lazy" />`
    : `<span>${escapeHtml(initials(book.title))}</span>`;
  const cls = book.cover ? 'cover' : 'cover cover--placeholder';
  const style = book.cover ? '' : ` style="${coverStyle(book.title)}"`;
  return `<div class="${cls}"${style}>${inner}${badge}</div>`;
}

export function conditionTag(condition) {
  return `<span class="tag tag--muted"><i class="bi bi-bookmark"></i> ${escapeHtml(condition)}</span>`;
}

export function categoryTag(category) {
  return `<span class="tag"><i class="bi bi-${categoryIcon(category)}"></i> ${escapeHtml(category)}</span>`;
}

const STATUS = {
  pending: { label: 'En attente', cls: 'tag--warn', icon: 'hourglass-split' },
  accepted: { label: 'Acceptée', cls: 'tag--success', icon: 'check-circle' },
  rejected: { label: 'Refusée', cls: 'tag--danger', icon: 'x-circle' },
  cancelled: { label: 'Annulée', cls: 'tag--muted', icon: 'slash-circle' },
  completed: { label: 'Terminée', cls: 'tag--success', icon: 'check2-all' },
};
export function statusTag(status) {
  const s = STATUS[status] || STATUS.pending;
  return `<span class="tag ${s.cls}"><i class="bi bi-${s.icon}"></i> ${s.label}</span>`;
}

export function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function spinner() {
  return '<div class="spinner-wrap"><div class="spinner-border text-primary" role="status"></div></div>';
}

export function emptyState(icon, message, actionHtml = '') {
  return `<div class="empty"><i class="bi bi-${icon}"></i><p>${escapeHtml(message)}</p>${actionHtml}</div>`;
}

/* ---------- Toasts ---------- */
export function toast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast-msg toast-msg--${type}`;
  const icon = type === 'success' ? 'check-circle-fill' : type === 'error' ? 'exclamation-circle-fill' : 'info-circle-fill';
  el.innerHTML = `<i class="bi bi-${icon}"></i><span>${escapeHtml(message)}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 2600);
}

/* ---------- Modal sheet ---------- */
function openSheet(innerHtml) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-overlay"><div class="modal-sheet">${innerHtml}</div></div>`;
  const overlay = root.querySelector('.modal-overlay');
  const close = () => {
    root.innerHTML = '';
  };
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  return { root, close };
}

// Yes/No confirmation. Resolves to boolean.
export function confirmDialog(message, { title = 'Confirmer', confirmText = 'Confirmer', danger = false } = {}) {
  return new Promise((resolve) => {
    const { root, close } = openSheet(`
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
      <div class="modal-actions">
        <button class="btn btn-light btn-pill" data-act="cancel">Annuler</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'} btn-pill" data-act="ok">${escapeHtml(confirmText)}</button>
      </div>
    `);
    root.querySelector('[data-act="cancel"]').onclick = () => { close(); resolve(false); };
    root.querySelector('[data-act="ok"]').onclick = () => { close(); resolve(true); };
  });
}

// Single textarea prompt. Resolves to string, or null if cancelled.
export function textareaDialog({ title, label, placeholder = '', submitText = 'Envoyer' }) {
  return new Promise((resolve) => {
    const { root, close } = openSheet(`
      <h3>${escapeHtml(title)}</h3>
      <div class="field">
        ${label ? `<label>${escapeHtml(label)}</label>` : ''}
        <textarea class="form-control" rows="3" placeholder="${escapeHtml(placeholder)}"></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn btn-light btn-pill" data-act="cancel">Annuler</button>
        <button class="btn btn-primary btn-pill" data-act="ok">${escapeHtml(submitText)}</button>
      </div>
    `);
    const ta = root.querySelector('textarea');
    ta.focus();
    root.querySelector('[data-act="cancel"]').onclick = () => { close(); resolve(null); };
    root.querySelector('[data-act="ok"]').onclick = () => { close(); resolve(ta.value.trim()); };
  });
}
