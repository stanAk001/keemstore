import bcrypt from 'bcrypt';
import { one, query } from '../config/db.js';
import { env } from '../config/env.js';
import { signToken } from '../middleware/auth.js';
import { unauthorized, forbidden, conflict } from '../utils/httpError.js';

const ROUNDS = 12;
// Constant-time-ish: compare against a dummy hash when the user doesn't exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', ROUNDS);

const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  display_name: u.display_name,
  bio: u.bio ?? null,
  avatar_url: u.avatar_url ?? null,
  role: u.role,
});

export async function register(req, res) {
  if (!env.allowPublicRegistration) throw forbidden('Registration is currently closed');
  const { email, password, display_name } = req.body;
  if (await one('select 1 from users where lower(email) = $1', [email])) throw conflict('An account with that email already exists');
  const hash = await bcrypt.hash(password, ROUNDS);
  const user = await one(
    `insert into users (email, password_hash, display_name, role_id)
     values ($1, $2, $3, (select id from roles where name = 'user'))
     returning id, email, display_name, bio, avatar_url, 'user' as role`,
    [email, hash, display_name],
  );
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await one(
    `select u.*, r.name as role from users u join roles r on r.id = u.role_id where lower(u.email) = $1`,
    [email],
  );
  const ok = await bcrypt.compare(password, user?.password_hash || DUMMY_HASH);
  if (!user || !ok) throw unauthorized('Email or password is incorrect');
  if (!user.active) throw forbidden('This account has been disabled');
  await query('update users set last_login_at = now() where id = $1', [user.id]);
  res.json({ token: signToken(user), user: publicUser(user) });
}

export async function me(req, res) {
  const user = await one(
    `select u.id, u.email, u.display_name, u.bio, u.avatar_url, r.name as role
       from users u join roles r on r.id = u.role_id where u.id = $1`,
    [req.user.id],
  );
  res.json({ user: publicUser(user) });
}

export async function updateMe(req, res) {
  const { display_name, bio, avatar_url, password } = req.body;
  const hash = password ? await bcrypt.hash(password, ROUNDS) : null;
  await query(
    `update users set display_name = coalesce($1, display_name), bio = coalesce($2, bio),
            avatar_url = coalesce($3, avatar_url), password_hash = coalesce($4, password_hash)
      where id = $5`,
    [display_name ?? null, bio ?? null, avatar_url ?? null, hash, req.user.id],
  );
  return me(req, res);
}

export { ROUNDS as BCRYPT_ROUNDS };
