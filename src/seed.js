// Populates the database with demo users and books so the app is not empty
// on first launch.  Run with:  npm run seed
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { db } from './db.js';

const now = () => new Date().toISOString();

const USERS = [
  { name: 'Sofiane Hammami', email: 'sofiane@biblio.fr', city: 'Tunis' },
  { name: 'Amira Ben Salah', email: 'amira@biblio.fr', city: 'Sfax' },
  { name: 'Yassine Trabelsi', email: 'yassine@biblio.fr', city: 'Sousse' },
];

// [title, author, category, condition, description]
const BOOKS = [
  ['Le Petit Prince', 'Antoine de Saint-Exupéry', 'Jeunesse', 'Bon',
    'Un conte poétique et philosophique sous l\'apparence d\'un conte pour enfants.'],
  ['1984', 'George Orwell', 'Science-fiction', 'Très bon',
    'Roman dystopique sur une société sous surveillance totale.'],
  ['L\'Étranger', 'Albert Camus', 'Roman', 'Bon',
    'Le récit de Meursault, un homme indifférent face à l\'absurdité du monde.'],
  ['Le Nom de la rose', 'Umberto Eco', 'Policier', 'Usé',
    'Une enquête médiévale dans une abbaye bénédictine.'],
  ['Sapiens', 'Yuval Noah Harari', 'Histoire', 'Neuf',
    'Une brève histoire de l\'humanité, de la préhistoire à nos jours.'],
  ['Clean Code', 'Robert C. Martin', 'Informatique', 'Très bon',
    'Les principes pour écrire un code lisible, maintenable et élégant.'],
  ['Une brève histoire du temps', 'Stephen Hawking', 'Sciences', 'Bon',
    'La cosmologie expliquée au grand public, du Big Bang aux trous noirs.'],
  ['Astérix le Gaulois', 'René Goscinny', 'Bande dessinée', 'Bon',
    'Les aventures du célèbre village gaulois qui résiste à l\'envahisseur.'],
  ['Le Comte de Monte-Cristo', 'Alexandre Dumas', 'Roman', 'Usé',
    'Une histoire de vengeance, d\'évasion et de justice.'],
  ['Steve Jobs', 'Walter Isaacson', 'Biographie', 'Très bon',
    'La biographie autorisée du cofondateur d\'Apple.'],
  ['Le Larousse de la cuisine', 'Collectif', 'Cuisine', 'Bon',
    'Plus de 1500 recettes pour cuisiner au quotidien.'],
  ['Les 7 habitudes', 'Stephen R. Covey', 'Développement personnel', 'Neuf',
    'Les habitudes des gens efficaces pour réussir sa vie personnelle et professionnelle.'],
  ['Dune', 'Frank Herbert', 'Science-fiction', 'Bon',
    'L\'épopée d\'Arrakis, planète désertique au cœur d\'enjeux galactiques.'],
  ['Harry Potter à l\'école des sorciers', 'J.K. Rowling', 'Jeunesse', 'Très bon',
    'Le premier tome des aventures du jeune sorcier.'],
];

async function seed() {
  db.reset();

  const passwordHash = await bcrypt.hash('password123', 10);
  const users = USERS.map((u) => ({
    id: randomUUID(),
    ...u,
    email: u.email.toLowerCase(),
    passwordHash,
    createdAt: now(),
  }));
  db.data.users.push(...users);

  BOOKS.forEach((b, i) => {
    const [title, author, category, condition, description] = b;
    db.data.books.push({
      id: randomUUID(),
      title,
      author,
      category,
      condition,
      description,
      cover: '',
      ownerId: users[i % users.length].id,
      available: true,
      createdAt: new Date(Date.now() - i * 36e5).toISOString(),
    });
  });

  db.save();

  console.log('\n  ✅  Base de données initialisée');
  console.log(`     ${users.length} utilisateurs, ${db.data.books.length} livres`);
  console.log('\n  Comptes de démonstration (mot de passe : password123) :');
  users.forEach((u) => console.log(`     • ${u.email}`));
  console.log('');
}

seed();
