import express from 'express';
import { randomUUID } from 'node:crypto';

import { db } from '../db.js';
import { authRequired, authOptional } from '../auth.js';

const router = express.Router();

export const CATEGORIES = [
  'Roman',
  'Science-fiction',
  'Policier',
  'Jeunesse',
  'Sciences',
  'Histoire',
  'Biographie',
  'Bande dessinée',
  'Cuisine',
  'Informatique',
  'Développement personnel',
  'Autre',
];

const CONDITIONS = ['Neuf', 'Très bon', 'Bon', 'Usé'];

function withOwner(book) {
  const owner = db.data.users.find((u) => u.id === book.ownerId);
  return {
    ...book,
    owner: owner ? { id: owner.id, name: owner.name, city: owner.city } : null,
  };
}

// GET /api/books/categories  → list with per-category counts
router.get('/categories', (_req, res) => {
  const counts = {};
  for (const b of db.data.books) counts[b.category] = (counts[b.category] || 0) + 1;
  res.json({
    categories: CATEGORIES.map((name) => ({ name, count: counts[name] || 0 })),
  });
});

// GET /api/books?q=&category=&owner=&available=
router.get('/', authOptional, (req, res) => {
  const { q, category, owner, available } = req.query;
  let list = db.data.books.slice();

  if (q) {
    const term = String(q).toLowerCase();
    list = list.filter(
      (b) =>
        b.title.toLowerCase().includes(term) ||
        b.author.toLowerCase().includes(term) ||
        (b.description || '').toLowerCase().includes(term)
    );
  }
  if (category) list = list.filter((b) => b.category === category);
  if (owner) list = list.filter((b) => b.ownerId === owner);
  if (available === 'true') list = list.filter((b) => b.available);

  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ books: list.map(withOwner) });
});

// GET /api/books/:id
router.get('/:id', (req, res) => {
  const book = db.data.books.find((b) => b.id === req.params.id);
  if (!book) return res.status(404).json({ error: 'Livre introuvable' });
  res.json({ book: withOwner(book) });
});

// POST /api/books
router.post('/', authRequired, (req, res) => {
  const { title, author, category, description, cover, condition } = req.body || {};
  if (!title || !author) {
    return res.status(400).json({ error: 'Le titre et l\'auteur sont requis' });
  }
  const book = {
    id: randomUUID(),
    title: String(title).trim(),
    author: String(author).trim(),
    category: CATEGORIES.includes(category) ? category : 'Autre',
    description: String(description || '').trim(),
    cover: String(cover || '').trim(),
    condition: CONDITIONS.includes(condition) ? condition : 'Bon',
    ownerId: req.user.id,
    available: true,
    createdAt: new Date().toISOString(),
  };
  db.data.books.push(book);
  db.save();
  res.status(201).json({ book: withOwner(book) });
});

// PUT /api/books/:id  (owner only)
router.put('/:id', authRequired, (req, res) => {
  const book = db.data.books.find((b) => b.id === req.params.id);
  if (!book) return res.status(404).json({ error: 'Livre introuvable' });
  if (book.ownerId !== req.user.id) {
    return res.status(403).json({ error: 'Action non autorisée' });
  }

  const { title, author, category, description, cover, condition, available } = req.body || {};
  if (title !== undefined) book.title = String(title).trim();
  if (author !== undefined) book.author = String(author).trim();
  if (category !== undefined && CATEGORIES.includes(category)) book.category = category;
  if (description !== undefined) book.description = String(description).trim();
  if (cover !== undefined) book.cover = String(cover).trim();
  if (condition !== undefined && CONDITIONS.includes(condition)) book.condition = condition;
  if (available !== undefined) book.available = Boolean(available);

  db.save();
  res.json({ book: withOwner(book) });
});

// DELETE /api/books/:id  (owner only)
router.delete('/:id', authRequired, (req, res) => {
  const idx = db.data.books.findIndex((b) => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Livre introuvable' });
  if (db.data.books[idx].ownerId !== req.user.id) {
    return res.status(403).json({ error: 'Action non autorisée' });
  }
  db.data.books.splice(idx, 1);
  // Cascade: drop any exchange requests tied to this book
  db.data.exchanges = db.data.exchanges.filter((e) => e.bookId !== req.params.id);
  db.save();
  res.json({ ok: true });
});

export default router;
