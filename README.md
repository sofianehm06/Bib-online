# 📚 BiblioÉchange — Application mobile de bibliothèque en ligne

Application web responsive (mobile-first) permettant la **gestion et l'échange de livres entre
utilisateurs**, avec recherche, filtrage par catégories et affichage détaillé.

Développée avec **HTML, CSS, JavaScript, Bootstrap 5** côté client et **Node.js (Express)** côté
serveur.

---

## ✨ Fonctionnalités

- **Authentification** : inscription / connexion (JWT + mots de passe hachés avec bcrypt)
- **Catalogue de livres** : ajout, modification, suppression de ses propres livres
- **Recherche** par titre, auteur ou description
- **Filtrage par catégories** (Roman, Science-fiction, Jeunesse, Informatique…)
- **Échange entre utilisateurs** : demande, acceptation, refus, annulation, finalisation
- **Couvertures** : import d'image (convertie en base64) ou pochette générée automatiquement
- **Interface responsive** type application mobile (barre de navigation inférieure, PWA installable)

## 🛠️ Stack technique

| Côté | Technologies |
|------|--------------|
| Frontend | HTML5, CSS3, JavaScript (ES Modules), **Bootstrap 5**, Bootstrap Icons |
| Backend | **Node.js**, Express |
| Stockage | Base de données JSON sur fichier (`data/db.json`) |
| Sécurité | JWT (`jsonwebtoken`), hachage `bcryptjs` |

> Aucune base de données externe à installer : les données sont persistées dans un simple fichier JSON.

## 🚀 Installation et lancement

```bash
# 1. Installer les dépendances
npm install

# 2. (Optionnel) Remplir la base avec des données de démonstration
npm run seed

# 3. Démarrer le serveur
npm start
```

Puis ouvrir **http://localhost:3000** dans le navigateur.

> Mode développement avec rechargement automatique : `npm run dev`

### 👤 Comptes de démonstration

Après `npm run seed`, trois comptes sont disponibles (mot de passe : `password123`) :

- `sofiane@biblio.fr`
- `amira@biblio.fr`
- `yassine@biblio.fr`

## 📁 Structure du projet

```
bib en ligne/
├── server.js              # Point d'entrée Express
├── package.json
├── src/
│   ├── db.js              # Datastore JSON
│   ├── auth.js            # JWT (signature + middlewares)
│   ├── seed.js            # Données de démonstration
│   └── routes/
│       ├── auth.js        # /api/auth  (register, login, me)
│       ├── books.js       # /api/books (CRUD, recherche, catégories)
│       └── exchanges.js   # /api/exchanges (demandes d'échange)
├── public/                # Frontend servi en statique
│   ├── index.html
│   ├── manifest.json      # PWA
│   ├── sw.js              # Service worker (hors-ligne)
│   ├── css/style.css
│   ├── icons/icon.svg
│   └── js/
│       ├── app.js         # Routeur + navigation
│       ├── api.js         # Client API + session
│       ├── ui.js          # Composants UI (toasts, modales…)
│       └── views.js       # Écrans de l'application
└── data/db.json           # Base de données (générée automatiquement)
```

## 🔌 API REST

| Méthode | Route | Description | Auth |
|---------|-------|-------------|:----:|
| POST | `/api/auth/register` | Créer un compte | — |
| POST | `/api/auth/login` | Se connecter | — |
| GET | `/api/auth/me` | Profil courant | ✅ |
| GET | `/api/books` | Lister/rechercher (`?q=&category=&owner=`) | — |
| GET | `/api/books/categories` | Catégories + compteurs | — |
| GET | `/api/books/:id` | Détail d'un livre | — |
| POST | `/api/books` | Ajouter un livre | ✅ |
| PUT | `/api/books/:id` | Modifier un livre | ✅ |
| DELETE | `/api/books/:id` | Supprimer un livre | ✅ |
| GET | `/api/exchanges` | Mes demandes (reçues/envoyées) | ✅ |
| POST | `/api/exchanges` | Demander un échange | ✅ |
| PATCH | `/api/exchanges/:id` | Changer le statut | ✅ |

## 📝 Licence

MIT — projet réalisé à des fins pédagogiques.
