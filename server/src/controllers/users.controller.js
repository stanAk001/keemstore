import bcrypt from 'bcrypt';
import { many, one } from '../config/db.js';
import { BCRYPT_ROUNDS } from './auth.controller.js';
import { badRequest, conflict, notFound } from '../utils/httpError.js';

const SELECT = `select u.id, u.email, u.display_name, u.bio, u.avatar_url, u.active, u.last_login_at, u.created_at,
                       r.name as role
                  from users u join roles r on r.id = u.role_id`;

export async function list(req, res) {
  const staffOnly = req.query.scope !== 'all';
  res.json(await many(`${SELECT} ${staffOnly ? "where r.name in ('admin','editor')" : ''} order by r.id, u.display_name`));
}

export async function authors(_req, res) {
  res.json(await many(`${SELECT} where r.name in ('admin','editor') and u.active order by u.display_name`));
}

export async function create(req, res) {
  const { email, password, display_name, role, bio } = req.body;
  if (await one('select 1 from users where lower(email) = $1', [email])) throw conflict('That email is already registered');
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const row = await one(
    `insert into users (email, password_hash, display_name, bio, role_id)
     values ($1, $2, $3, $4, (select id from roles where name = $5)) returning id`,
    [email, hash, display_name, bio ?? null, role],
  );
  res.status(201).json(await one(`${SELECT} where u.id = $1`, [row.id]));
}

async function adminCountExcluding(id) {
  const r = await one(`select count(*)::int as n from users u join roles r on r.id = u.role_id
                        where r.name = 'admin' and u.active and u.id <> $1`, [id]);
  return r.n;
}

export async function update(req, res) {
  const id = Number(req.params.id);
  const b = req.body;
  const existing = await one(`${SELECT} where u.id = $1`, [id]);
  if (!existing) throw notFound('User not found');

  // Never let the site end up without an active admin.
  const losingAdmin = existing.role === 'admin' && ((b.role && b.role !== 'admin') || b.active === false);
  if (losingAdmin && (await adminCountExcluding(id)) === 0) throw badRequest('At least one active admin is required');
  if (b.email && (await one('select 1 from users where lower(email) = $1 and id <> $2', [b.email, id]))) {
    throw conflict('That email is already registered');
  }

  const hash = b.password ? await bcrypt.hash(b.password, BCRYPT_ROUNDS) : null;
  await one(
    `update users set email = coalesce($1, email), display_name = coalesce($2, display_name), bio = coalesce($3, bio),
            avatar_url = coalesce($4, avatar_url), active = coalesce($5, active), password_hash = coalesce($6, password_hash),
            role_id = coalesce((select id from roles where name = $7), role_id)
      where id = $8 returning id`,
    [b.email ?? null, b.display_name ?? null, b.bio ?? null, b.avatar_url ?? null, b.active ?? null, hash, b.role ?? null, id],
  );
  res.json(await one(`${SELECT} where u.id = $1`, [id]));
}

export async function remove(req, res) {
  const id = Number(req.params.id);
  if (id === req.user.id) throw badRequest("You can't delete your own account");
  const existing = await one(`${SELECT} where u.id = $1`, [id]);
  if (!existing) throw notFound('User not found');
  if (existing.role === 'admin' && (await adminCountExcluding(id)) === 0) throw badRequest('At least one active admin is required');
  await one('delete from users where id = $1 returning id', [id]);
  res.status(204).end();
}
