import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-secret-bibliotheque-en-ligne-change-me';
const EXPIRES_IN = '7d';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    SECRET,
    { expiresIn: EXPIRES_IN }
  );
}

function extractToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

// Hard requirement: rejects the request when no valid token is present.
export function authRequired(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Authentification requise' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Session invalide ou expirée' });
  }
}

// Soft auth: attaches req.user when a valid token exists, never blocks.
export function authOptional(req, _res, next) {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, SECRET);
    } catch {
      /* ignore invalid token for optional auth */
    }
  }
  next();
}
