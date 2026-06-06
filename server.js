import express from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import authRoutes from './src/routes/auth.js';
import bookRoutes from './src/routes/books.js';
import exchangeRoutes from './src/routes/exchanges.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Body parsing — limit raised to accept base64 book covers
app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true }));

// REST API
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/exchanges', exchangeRoutes);

// Static frontend
app.use(express.static(join(__dirname, 'public')));

// SPA fallback: any non-API GET serves the app shell
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(join(__dirname, 'public', 'index.html'));
  }
  res.status(404).json({ error: 'Ressource introuvable' });
});

// Centralised error handler (e.g. malformed JSON body)
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(err.status || 400).json({ error: 'Requête invalide' });
});

app.listen(PORT, () => {
  console.log(`\n  📚  Bibliothèque en ligne`);
  console.log(`  ➜   http://localhost:${PORT}\n`);
});
