// All application screens. Each view: async (rootEl, { params, query }) => void
import {
  api,
  session,
  isLoggedIn,
  setSession,
  clearSession,
} from './api.js';
import {
  escapeHtml,
  initials,
  categoryIcon,
  coverHtml,
  conditionTag,
  categoryTag,
  statusTag,
  formatDate,
  spinner,
  emptyState,
  toast,
  confirmDialog,
  textareaDialog,
} from './ui.js';

// Mirror of the server-side lists (src/routes/books.js)
const CATEGORIES = [
  'Roman', 'Science-fiction', 'Policier', 'Jeunesse', 'Sciences', 'Histoire',
  'Biographie', 'Bande dessinée', 'Cuisine', 'Informatique', 'Développement personnel', 'Autre',
];
const CONDITIONS = ['Neuf', 'Très bon', 'Bon', 'Usé'];

/* ---------- small helpers ---------- */
const go = (hash) => { location.hash = hash; };
const refresh = () => window.dispatchEvent(new Event('app:refresh'));

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function bookCard(book) {
  const badge = book.available
    ? ''
    : '<span class="cover__badge cover__badge--taken">Échangé</span>';
  return `
    <a class="book-card" href="#/book/${book.id}">
      ${coverHtml(book, { badge })}
      <div class="book-card__body">
        <h3 class="book-card__title">${escapeHtml(book.title)}</h3>
        <p class="book-card__author">${escapeHtml(book.author)}</p>
        <span class="book-card__owner"><i class="bi bi-geo-alt"></i> ${escapeHtml(book.owner?.city || book.owner?.name || '—')}</span>
      </div>
    </a>`;
}

/* ===================== HOME / CATALOG ===================== */
export async function homeView(root, ctx) {
  const category = ctx.query.category || '';
  let q = ctx.query.q || '';

  root.innerHTML = `
    ${category ? '' : `
    <div class="hero">
      <h1>Découvrez &amp; échangez des livres 📚</h1>
      <p>Empruntez les livres d'autres lecteurs et partagez les vôtres.</p>
    </div>`}
    <div class="search-bar">
      <i class="bi bi-search"></i>
      <input id="search" type="search" placeholder="Rechercher un livre, un auteur…" value="${escapeHtml(q)}" />
      <button id="clear-search" class="btn-clear" ${q ? '' : 'hidden'}><i class="bi bi-x-lg"></i></button>
    </div>
    <div class="chips" id="chips"></div>
    <div class="section-head">
      <h2 id="list-title">${category ? escapeHtml(category) : 'Tous les livres'}</h2>
      <span class="count" id="list-count"></span>
    </div>
    <div id="book-list">${spinner()}</div>`;

  const searchInput = root.querySelector('#search');
  const clearBtn = root.querySelector('#clear-search');
  const listEl = root.querySelector('#book-list');
  const countEl = root.querySelector('#list-count');
  const chipsEl = root.querySelector('#chips');

  api.categories()
    .then(({ categories }) => {
      chipsEl.innerHTML =
        `<button class="chip-filter ${category ? '' : 'active'}" data-cat="">Tout</button>` +
        categories
          .filter((c) => c.count > 0)
          .map(
            (c) => `<button class="chip-filter ${category === c.name ? 'active' : ''}" data-cat="${escapeHtml(c.name)}">
              <i class="bi bi-${categoryIcon(c.name)}"></i> ${escapeHtml(c.name)}
            </button>`
          )
          .join('');
      chipsEl.querySelectorAll('.chip-filter').forEach((btn) => {
        btn.onclick = () => {
          const cat = btn.dataset.cat;
          go('#/' + (cat ? '?category=' + encodeURIComponent(cat) : ''));
        };
      });
    })
    .catch(() => {});

  async function loadBooks() {
    listEl.className = '';
    listEl.innerHTML = spinner();
    try {
      const { books } = await api.books({ q, category });
      countEl.textContent = books.length ? `${books.length} livre${books.length > 1 ? 's' : ''}` : '';
      if (!books.length) {
        listEl.className = '';
        listEl.innerHTML = emptyState(
          'search',
          q || category ? 'Aucun livre ne correspond à votre recherche.' : 'Aucun livre pour le moment.'
        );
        return;
      }
      listEl.className = 'book-grid';
      listEl.innerHTML = books.map(bookCard).join('');
    } catch (e) {
      listEl.className = '';
      listEl.innerHTML = emptyState('wifi-off', e.message);
    }
  }

  searchInput.addEventListener(
    'input',
    debounce(() => {
      q = searchInput.value.trim();
      clearBtn.hidden = !q;
      loadBooks();
    }, 300)
  );
  clearBtn.onclick = () => {
    searchInput.value = '';
    q = '';
    clearBtn.hidden = true;
    searchInput.focus();
    loadBooks();
  };

  loadBooks();
}

/* ===================== CATEGORIES ===================== */
export async function categoriesView(root) {
  root.innerHTML = `<h1 class="page-title">Catégories</h1><div id="cats">${spinner()}</div>`;
  const el = root.querySelector('#cats');
  try {
    const { categories } = await api.categories();
    el.className = 'cat-grid';
    el.innerHTML = categories
      .map(
        (c) => `<div class="cat-tile" data-cat="${escapeHtml(c.name)}">
          <div class="cat-tile__icon"><i class="bi bi-${categoryIcon(c.name)}"></i></div>
          <div>
            <div class="cat-tile__name">${escapeHtml(c.name)}</div>
            <div class="cat-tile__count">${c.count} livre${c.count > 1 ? 's' : ''}</div>
          </div>
        </div>`
      )
      .join('');
    el.querySelectorAll('.cat-tile').forEach((t) => {
      t.onclick = () => go('#/?category=' + encodeURIComponent(t.dataset.cat));
    });
  } catch (e) {
    el.innerHTML = emptyState('wifi-off', e.message);
  }
}

/* ===================== BOOK DETAIL ===================== */
export async function bookView(root, ctx) {
  root.innerHTML = spinner();
  let book;
  try {
    ({ book } = await api.book(ctx.params.id));
  } catch (e) {
    root.innerHTML = emptyState('exclamation-triangle', e.message, '<a href="#/" class="btn btn-primary btn-pill">Accueil</a>');
    return;
  }

  const mine = session.user && book.ownerId === session.user.id;

  root.innerHTML = `
    <button class="btn btn-light btn-pill btn-sm mb-3" id="back"><i class="bi bi-arrow-left"></i> Retour</button>
    <div class="detail-top">
      ${coverHtml(book)}
      <div class="detail-info">
        <h1>${escapeHtml(book.title)}</h1>
        <p class="author">par ${escapeHtml(book.author)}</p>
        <div class="detail-tags">
          ${categoryTag(book.category)}
          ${conditionTag(book.condition)}
          ${book.available
            ? '<span class="tag tag--success"><i class="bi bi-check-circle"></i> Disponible</span>'
            : '<span class="tag tag--danger"><i class="bi bi-x-circle"></i> Indisponible</span>'}
        </div>
      </div>
    </div>

    ${book.description ? `<div class="detail-section"><h3>Description</h3><p>${escapeHtml(book.description)}</p></div>` : ''}

    <div class="detail-section">
      <h3>Proposé par</h3>
      <div class="owner-card">
        <div class="owner-card__avatar">${escapeHtml(initials(book.owner?.name))}</div>
        <div>
          <div style="font-weight:700">${escapeHtml(book.owner?.name || 'Utilisateur')}</div>
          <div class="text-muted-2" style="font-size:.82rem"><i class="bi bi-geo-alt"></i> ${escapeHtml(book.owner?.city || 'Localisation non précisée')}</div>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <p class="text-muted-2" style="font-size:.8rem">Ajouté le ${formatDate(book.createdAt)}</p>
    </div>

    <div id="detail-actions"></div>`;

  root.querySelector('#back').onclick = () => {
    if (history.length > 1) history.back();
    else go('#/');
  };

  const actions = root.querySelector('#detail-actions');
  if (mine) {
    actions.innerHTML = `
      <div class="action-bar" style="flex-direction:column">
        <button class="btn btn-soft btn-pill btn-block" id="edit"><i class="bi bi-pencil"></i> Modifier le livre</button>
        <div style="display:flex; gap:10px; width:100%">
          <button class="btn btn-light btn-pill" id="toggle" style="flex:1">${book.available ? 'Marquer indisponible' : 'Rendre disponible'}</button>
          <button class="btn btn-light btn-pill" id="del" title="Supprimer"><i class="bi bi-trash text-danger"></i></button>
        </div>
      </div>`;
    actions.querySelector('#edit').onclick = () => go('#/edit/' + book.id);
    actions.querySelector('#toggle').onclick = async () => {
      try {
        await api.updateBook(book.id, { available: !book.available });
        toast('Disponibilité mise à jour', 'success');
        refresh();
      } catch (e) {
        toast(e.message, 'error');
      }
    };
    actions.querySelector('#del').onclick = async () => {
      const ok = await confirmDialog('Voulez-vous vraiment supprimer ce livre ?', {
        title: 'Supprimer le livre',
        confirmText: 'Supprimer',
        danger: true,
      });
      if (!ok) return;
      try {
        await api.deleteBook(book.id);
        toast('Livre supprimé', 'success');
        go('#/mes-livres');
      } catch (e) {
        toast(e.message, 'error');
      }
    };
  } else if (book.available) {
    actions.innerHTML = `<div class="action-bar"><button class="btn btn-primary btn-pill btn-block" id="req"><i class="bi bi-arrow-left-right"></i> Demander l'échange</button></div>`;
    actions.querySelector('#req').onclick = async () => {
      if (!isLoggedIn()) {
        toast('Connectez-vous pour demander un échange', 'info');
        go('#/login');
        return;
      }
      const message = await textareaDialog({
        title: "Demander l'échange",
        label: `Un message pour ${book.owner?.name || 'le propriétaire'} (facultatif)`,
        placeholder: 'Bonjour, je serais intéressé(e) par ce livre…',
        submitText: 'Envoyer la demande',
      });
      if (message === null) return;
      try {
        await api.createExchange({ bookId: book.id, message });
        toast('Demande envoyée !', 'success');
        go('#/echanges');
      } catch (e) {
        toast(e.message, 'error');
      }
    };
  } else {
    actions.innerHTML = `<div class="action-bar"><button class="btn btn-light btn-pill btn-block" disabled>Ce livre n'est pas disponible</button></div>`;
  }
}

/* ===================== ADD / EDIT BOOK ===================== */
function bookFormView(root, existing) {
  const isEdit = Boolean(existing);
  let coverData = existing?.cover || '';

  root.innerHTML = `
    <div class="form-page">
      <h1 class="page-title">${isEdit ? 'Modifier le livre' : 'Ajouter un livre'}</h1>
      <form id="book-form" novalidate>
        <div class="field">
          <label>Titre *</label>
          <input name="title" class="form-control" required value="${escapeHtml(existing?.title || '')}" />
        </div>
        <div class="field">
          <label>Auteur *</label>
          <input name="author" class="form-control" required value="${escapeHtml(existing?.author || '')}" />
        </div>
        <div class="row g-2">
          <div class="col-7 field">
            <label>Catégorie</label>
            <select name="category" class="form-select">
              ${CATEGORIES.map((c) => `<option ${existing?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="col-5 field">
            <label>État</label>
            <select name="condition" class="form-select">
              ${CONDITIONS.map((c) => `<option ${existing?.condition === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="field">
          <label>Description</label>
          <textarea name="description" class="form-control" rows="3" placeholder="Résumé, état détaillé…">${escapeHtml(existing?.description || '')}</textarea>
        </div>
        <div class="field">
          <label>Couverture</label>
          <div class="cover-upload">
            <div class="cover-upload__preview" id="cover-preview">
              ${coverData ? `<img src="${escapeHtml(coverData)}" alt="" />` : '<i class="bi bi-image"></i>'}
            </div>
            <div>
              <input type="file" accept="image/*" id="cover-input" class="form-control form-control-sm" />
              <button type="button" class="btn btn-sm btn-light btn-pill mt-2b" id="cover-clear" ${coverData ? '' : 'hidden'}>Retirer l'image</button>
            </div>
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-pill btn-block mt-2">${isEdit ? 'Enregistrer les modifications' : 'Publier le livre'}</button>
      </form>
    </div>`;

  const input = root.querySelector('#cover-input');
  const preview = root.querySelector('#cover-preview');
  const clearBtn = root.querySelector('#cover-clear');

  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast('Image trop volumineuse (max 2 Mo)', 'error');
      input.value = '';
      return;
    }
    coverData = await readFileAsDataURL(file);
    preview.innerHTML = `<img src="${coverData}" alt="" />`;
    clearBtn.hidden = false;
  };
  clearBtn.onclick = () => {
    coverData = '';
    input.value = '';
    preview.innerHTML = '<i class="bi bi-image"></i>';
    clearBtn.hidden = true;
  };

  root.querySelector('#book-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      title: (fd.get('title') || '').trim(),
      author: (fd.get('author') || '').trim(),
      category: fd.get('category'),
      condition: fd.get('condition'),
      description: (fd.get('description') || '').trim(),
      cover: coverData,
    };
    if (!payload.title || !payload.author) {
      toast('Le titre et l\'auteur sont requis', 'error');
      return;
    }
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      if (isEdit) {
        await api.updateBook(existing.id, payload);
        toast('Livre mis à jour', 'success');
        go('#/book/' + existing.id);
      } else {
        const { book } = await api.createBook(payload);
        toast('Livre publié !', 'success');
        go('#/book/' + book.id);
      }
    } catch (e2) {
      toast(e2.message, 'error');
      btn.disabled = false;
    }
  };
}

export async function addBookView(root) {
  bookFormView(root, null);
}

export async function editBookView(root, ctx) {
  root.innerHTML = spinner();
  try {
    const { book } = await api.book(ctx.params.id);
    if (!session.user || book.ownerId !== session.user.id) {
      toast('Action non autorisée', 'error');
      go('#/');
      return;
    }
    bookFormView(root, book);
  } catch (e) {
    root.innerHTML = emptyState('exclamation-triangle', e.message);
  }
}

/* ===================== MY BOOKS ===================== */
export async function myBooksView(root) {
  root.innerHTML = `
    <div class="section-head">
      <h1 class="page-title" style="margin:0">Mes livres</h1>
      <a href="#/add" class="btn btn-soft btn-pill btn-sm"><i class="bi bi-plus-lg"></i> Ajouter</a>
    </div>
    <div id="mybooks">${spinner()}</div>`;
  const el = root.querySelector('#mybooks');
  try {
    const { books } = await api.books({ owner: session.user.id });
    if (!books.length) {
      el.innerHTML = emptyState('book', "Vous n'avez pas encore publié de livre.", '<a href="#/add" class="btn btn-primary btn-pill">Ajouter un livre</a>');
      return;
    }
    el.innerHTML = books
      .map(
        (b) => `<div class="mybook-row">
          ${coverHtml(b)}
          <div class="mybook-row__body">
            <a href="#/book/${b.id}"><p class="mybook-row__title">${escapeHtml(b.title)}</p></a>
            <div class="mybook-row__sub">${escapeHtml(b.category)} · ${b.available ? '<span class="text-success">Disponible</span>' : '<span class="text-danger">Échangé</span>'}</div>
          </div>
          <button class="icon-btn" data-edit="${b.id}" title="Modifier"><i class="bi bi-pencil"></i></button>
          <button class="icon-btn icon-btn--danger" data-del="${b.id}" title="Supprimer"><i class="bi bi-trash"></i></button>
        </div>`
      )
      .join('');
    el.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.onclick = () => go('#/edit/' + btn.dataset.edit);
    });
    el.querySelectorAll('[data-del]').forEach((btn) => {
      btn.onclick = async () => {
        const ok = await confirmDialog('Supprimer ce livre ?', { title: 'Confirmer', confirmText: 'Supprimer', danger: true });
        if (!ok) return;
        try {
          await api.deleteBook(btn.dataset.del);
          toast('Livre supprimé', 'success');
          refresh();
        } catch (e) {
          toast(e.message, 'error');
        }
      };
    });
  } catch (e) {
    el.innerHTML = emptyState('wifi-off', e.message);
  }
}

/* ===================== EXCHANGES ===================== */
function exActions(ex, tab) {
  if (tab === 'received') {
    if (ex.status === 'pending') {
      return `<button class="btn btn-success btn-pill" data-act="accepted">Accepter</button>
              <button class="btn btn-light btn-pill" data-act="rejected">Refuser</button>`;
    }
    if (ex.status === 'accepted') {
      return '<button class="btn btn-primary btn-pill" data-act="completed">Marquer comme terminé</button>';
    }
    return '';
  }
  if (ex.status === 'pending') {
    return '<button class="btn btn-light btn-pill" data-act="cancelled">Annuler la demande</button>';
  }
  return '';
}

function exchangeCard(ex, tab) {
  const other = tab === 'received' ? ex.requester : ex.owner;
  const book = ex.book || { title: 'Livre supprimé', cover: '', id: null };
  const titleHtml = ex.book
    ? `<a href="#/book/${ex.book.id}"><p class="ex-card__title">${escapeHtml(book.title)}</p></a>`
    : `<p class="ex-card__title">${escapeHtml(book.title)}</p>`;
  return `
    <div class="ex-card">
      ${coverHtml(book)}
      <div class="ex-card__body">
        ${titleHtml}
        <div class="ex-card__meta">${tab === 'received' ? 'Demandé par' : 'Propriétaire'} : ${escapeHtml(other?.name || '—')}${other?.city ? ` · ${escapeHtml(other.city)}` : ''}</div>
        ${ex.message ? `<div class="ex-card__msg">« ${escapeHtml(ex.message)} »</div>` : ''}
        <div>${statusTag(ex.status)}</div>
        <div class="ex-actions" data-id="${ex.id}">${exActions(ex, tab)}</div>
      </div>
    </div>`;
}

export async function exchangesView(root, ctx) {
  const tab = ctx.query.tab === 'sent' ? 'sent' : 'received';
  root.innerHTML = `
    <h1 class="page-title">Mes échanges</h1>
    <div class="tabs">
      <button class="tab ${tab === 'received' ? 'active' : ''}" data-tab="received">Demandes reçues</button>
      <button class="tab ${tab === 'sent' ? 'active' : ''}" data-tab="sent">Demandes envoyées</button>
    </div>
    <div id="ex-list">${spinner()}</div>`;

  root.querySelectorAll('.tab').forEach((t) => {
    t.onclick = () => go('#/echanges?tab=' + t.dataset.tab);
  });

  const el = root.querySelector('#ex-list');
  try {
    const { incoming, outgoing } = await api.exchanges();
    const list = tab === 'received' ? incoming : outgoing;
    if (!list.length) {
      el.innerHTML = emptyState(
        'inbox',
        tab === 'received' ? 'Aucune demande reçue pour le moment.' : "Vous n'avez envoyé aucune demande.",
        tab === 'sent' ? '<a href="#/" class="btn btn-primary btn-pill">Parcourir les livres</a>' : ''
      );
      return;
    }
    el.innerHTML = list.map((ex) => exchangeCard(ex, tab)).join('');
    el.querySelectorAll('.ex-actions').forEach((box) => {
      box.querySelectorAll('button[data-act]').forEach((btn) => {
        btn.onclick = async () => {
          btn.disabled = true;
          try {
            await api.updateExchange(box.dataset.id, btn.dataset.act);
            toast('Demande mise à jour', 'success');
            refresh();
          } catch (e) {
            toast(e.message, 'error');
            btn.disabled = false;
          }
        };
      });
    });
  } catch (e) {
    el.innerHTML = emptyState('wifi-off', e.message);
  }
}

/* ===================== PROFILE ===================== */
export async function profileView(root) {
  const user = session.user;
  root.innerHTML = `
    <div class="profile-head">
      <div class="profile-avatar">${escapeHtml(initials(user.name))}</div>
      <h1>${escapeHtml(user.name)}</h1>
      <div class="email">${escapeHtml(user.email)}</div>
      ${user.city ? `<div class="text-muted-2 mt-2b"><i class="bi bi-geo-alt"></i> ${escapeHtml(user.city)}</div>` : ''}
    </div>
    <div class="stats">
      <div class="stat"><div class="stat__num" data-stat="books">—</div><div class="stat__label">Livres</div></div>
      <div class="stat"><div class="stat__num" data-stat="in">—</div><div class="stat__label">Reçues</div></div>
      <div class="stat"><div class="stat__num" data-stat="out">—</div><div class="stat__label">Envoyées</div></div>
    </div>
    <a href="#/mes-livres" class="btn btn-soft btn-pill btn-block mt-2"><i class="bi bi-book"></i> Gérer mes livres</a>
    <a href="#/add" class="btn btn-light btn-pill btn-block mt-2b"><i class="bi bi-plus-lg"></i> Ajouter un livre</a>
    <button class="btn btn-light btn-pill btn-block mt-2b text-danger" id="logout"><i class="bi bi-box-arrow-right"></i> Se déconnecter</button>`;

  root.querySelector('#logout').onclick = () => {
    clearSession();
    window.dispatchEvent(new Event('app:auth-changed'));
    toast('Vous êtes déconnecté', 'info');
    go('#/');
  };

  try {
    const [{ books }, { incoming, outgoing }] = await Promise.all([
      api.books({ owner: user.id }),
      api.exchanges(),
    ]);
    root.querySelector('[data-stat="books"]').textContent = books.length;
    root.querySelector('[data-stat="in"]').textContent = incoming.length;
    root.querySelector('[data-stat="out"]').textContent = outgoing.length;
  } catch {
    /* stats are best-effort */
  }
}

/* ===================== AUTH ===================== */
export async function loginView(root) {
  root.innerHTML = `
    <div class="auth-wrap">
      <div class="auth-logo"><i class="bi bi-book-half"></i></div>
      <h1>Connexion</h1>
      <p class="sub">Accédez à votre bibliothèque</p>
      <form id="login-form">
        <div class="field"><label>Email</label><input name="email" type="email" class="form-control" placeholder="vous@exemple.fr" required></div>
        <div class="field"><label>Mot de passe</label><input name="password" type="password" class="form-control" placeholder="••••••••" required></div>
        <button class="btn btn-primary btn-pill btn-block mt-2" type="submit">Se connecter</button>
      </form>
      <div class="auth-switch">Pas encore de compte ? <a href="#/register">Inscrivez-vous</a></div>
      <div class="demo-hint"><b>Compte de démonstration</b><br>Email : <code>sofiane@biblio.fr</code><br>Mot de passe : <code>password123</code></div>
    </div>`;

  root.querySelector('#login-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    try {
      const { token, user } = await api.login({ email: fd.get('email'), password: fd.get('password') });
      setSession(token, user);
      window.dispatchEvent(new Event('app:auth-changed'));
      toast(`Bienvenue ${user.name} !`, 'success');
      go('#/');
    } catch (e2) {
      toast(e2.message, 'error');
      btn.disabled = false;
    }
  };
}

export async function registerView(root) {
  root.innerHTML = `
    <div class="auth-wrap">
      <div class="auth-logo"><i class="bi bi-person-plus"></i></div>
      <h1>Inscription</h1>
      <p class="sub">Créez votre compte gratuitement</p>
      <form id="register-form">
        <div class="field"><label>Nom complet</label><input name="name" class="form-control" placeholder="Votre nom" required></div>
        <div class="field"><label>Email</label><input name="email" type="email" class="form-control" placeholder="vous@exemple.fr" required></div>
        <div class="field"><label>Ville</label><input name="city" class="form-control" placeholder="Votre ville (facultatif)"></div>
        <div class="field"><label>Mot de passe</label><input name="password" type="password" class="form-control" placeholder="6 caractères minimum" required></div>
        <button class="btn btn-primary btn-pill btn-block mt-2" type="submit">Créer mon compte</button>
      </form>
      <div class="auth-switch">Déjà inscrit ? <a href="#/login">Connectez-vous</a></div>
    </div>`;

  root.querySelector('#register-form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const password = fd.get('password') || '';
    if (password.length < 6) {
      toast('Le mot de passe doit contenir au moins 6 caractères', 'error');
      return;
    }
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    try {
      const { token, user } = await api.register({
        name: fd.get('name'),
        email: fd.get('email'),
        city: fd.get('city'),
        password,
      });
      setSession(token, user);
      window.dispatchEvent(new Event('app:auth-changed'));
      toast(`Bienvenue ${user.name} !`, 'success');
      go('#/');
    } catch (e2) {
      toast(e2.message, 'error');
      btn.disabled = false;
    }
  };
}

/* ===================== 404 ===================== */
export async function notFoundView(root) {
  root.innerHTML = emptyState('compass', 'Page introuvable.', '<a href="#/" class="btn btn-primary btn-pill">Retour à l\'accueil</a>');
}
