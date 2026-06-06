import express from 'express';
import { randomUUID } from 'node:crypto';

import { db } from '../db.js';
import { authRequired } from '../auth.js';

const router = express.Router();

function enrich(ex) {
  const book = db.data.books.find((b) => b.id === ex.bookId) || null;
  const requester = db.data.users.find((u) => u.id === ex.requesterId);
  const owner = db.data.users.find((u) => u.id === ex.ownerId);
  return {
    ...ex,
    book: book
      ? { id: book.id, title: book.title, author: book.author, cover: book.cover, category: book.category }
      : null,
    requester: requester ? { id: requester.id, name: requester.name, city: requester.city } : null,
    owner: owner ? { id: owner.id, name: owner.name, city: owner.city } : null,
  };
}

// GET /api/exchanges  → { incoming, outgoing } for the current user
router.get('/', authRequired, (req, res) => {
  const incoming = db.data.exchanges
    .filter((e) => e.ownerId === req.user.id)
    .map(enrich)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const outgoing = db.data.exchanges
    .filter((e) => e.requesterId === req.user.id)
    .map(enrich)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ incoming, outgoing });
});

// POST /api/exchanges  → request a book exchange
router.post('/', authRequired, (req, res) => {
  const { bookId, message } = req.body || {};
  const book = db.data.books.find((b) => b.id === bookId);
  if (!book) return res.status(404).json({ error: 'Livre introuvable' });
  if (book.ownerId === req.user.id) {
    return res.status(400).json({ error: 'Vous ne pouvez pas demander votre propre livre' });
  }
  if (!book.available) {
    return res.status(400).json({ error: 'Ce livre n\'est plus disponible' });
  }
  const duplicate = db.data.exchanges.find(
    (e) => e.bookId === bookId && e.requesterId === req.user.id && e.status === 'pending'
  );
  if (duplicate) {
    return res.status(409).json({ error: 'Vous avez déjà une demande en cours pour ce livre' });
  }

  const exchange = {
    id: randomUUID(),
    bookId,
    requesterId: req.user.id,
    ownerId: book.ownerId,
    message: String(message || '').trim(),
    status: 'pending', // pending | accepted | rejected | cancelled | completed
    createdAt: new Date().toISOString(),
  };
  db.data.exchanges.push(exchange);
  db.save();
  res.status(201).json({ exchange: enrich(exchange) });
});

// PATCH /api/exchanges/:id  → change status
router.patch('/:id', authRequired, (req, res) => {
  const exchange = db.data.exchanges.find((e) => e.id === req.params.id);
  if (!exchange) return res.status(404).json({ error: 'Demande introuvable' });

  const { status } = req.body || {};
  const allowed = ['accepted', 'rejected', 'cancelled', 'completed'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Statut invalide' });

  const isOwner = exchange.ownerId === req.user.id;
  const isRequester = exchange.requesterId === req.user.id;
  if (!isOwner && !isRequester) return res.status(403).json({ error: 'Action non autorisée' });

  if (status === 'cancelled' && !isRequester) {
    return res.status(403).json({ error: 'Seul le demandeur peut annuler la demande' });
  }
  if (['accepted', 'rejected', 'completed'].includes(status) && !isOwner) {
    return res.status(403).json({ error: 'Seul le propriétaire peut traiter la demande' });
  }

  exchange.status = status;

  // Keep book availability in sync with the exchange lifecycle
  const book = db.data.books.find((b) => b.id === exchange.bookId);
  if (book) {
    if (status === 'accepted' || status === 'completed') {
      book.available = false;
    } else if (status === 'rejected' || status === 'cancelled') {
      const stillReserved = db.data.exchanges.some(
        (e) =>
          e.bookId === book.id &&
          e.id !== exchange.id &&
          (e.status === 'accepted' || e.status === 'completed')
      );
      if (!stillReserved) book.available = true;
    }
  }

  db.save();
  res.json({ exchange: enrich(exchange) });
});

export default router;
