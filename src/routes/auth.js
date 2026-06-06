import express from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';

import { db } from '../db.js';
import { signToken, authRequired } from '../auth.js';

const router = express.Router();

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, city: u.city, createdAt: u.createdAt };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, city } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nom, email et mot de passe sont requis' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const exists = db.data.users.find((u) => u.email === normalizedEmail);
  if (exists) {
    return res.status(409).json({ error: 'Un compte existe déjà avec cet email' });
  }

  const user = {
    id: randomUUID(),
    name: String(name).trim(),
    email: normalizedEmail,
    city: String(city || '').trim(),
    passwordHash: await bcrypt.hash(String(password), 10),
    createdAt: new Date().toISOString(),
  };
  db.data.users.push(user);
  db.save();

  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe sont requis' });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = db.data.users.find((u) => u.email === normalizedEmail);
  if (!user) return res.status(401).json({ error: 'Identifiants incorrects' });

  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Identifiants incorrects' });

  res.json({ token: signToken(user), user: publicUser(user) });
});

// GET /api/auth/me
router.get('/me', authRequired, (req, res) => {
  const user = db.data.users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json({ user: publicUser(user) });
});

export default router;
