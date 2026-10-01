import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { one } from '../config/db.js';
import { unauthorized, forbidden } from '../utils/httpError.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

/**
 * Verifies the bearer token and re-loads the user so deactivated accounts or
 * role changes take effect immediately rather than when the token expires.
 */
export async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw unauthorized('Your session has expired. Please sign in again.');
  }

  const user = await one(
    `select u.id, u.email, u.display_name, u.active, r.name as role
       from users u join roles r on r.id = u.role_id where u.id = $1`,
    [payload.sub],
  );
  if (!user || !user.active) throw unauthorized('Account not found or disabled');
  req.user = user;
  next();
}

/** Attach req.user when a valid token is present, but never reject. */
export async function optionalAuth(req, res, next) {
  if (!req.headers.authorization) return next();
  try {
    await requireAuth(req, res, () => {});
  } catch {
    req.user = undefined;
  }
  next();
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) throw unauthorized();
    if (!roles.includes(req.user.role)) throw forbidden();
    next();
  };
}

export const requireStaff = requireRole('admin', 'editor');
export const requireAdmin = requireRole('admin');
