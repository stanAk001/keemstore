// Small helpers for building parameterised SQL safely.
// Column names always come from server-side allow-lists, never from the request.

const JSON_TYPES = new Set(['object']);

function toParam(value) {
  if (value !== null && JSON_TYPES.has(typeof value) && !Array.isArray(value)) return JSON.stringify(value);
  return value;
}

/**
 * Pick allowed keys from `data` and build an INSERT.
 * `jsonColumns` are serialised with JSON.stringify (arrays included).
 */
export function buildInsert(table, data, allowed, jsonColumns = []) {
  const cols = allowed.filter((c) => data[c] !== undefined);
  const values = cols.map((c) => (jsonColumns.includes(c) ? JSON.stringify(data[c]) : toParam(data[c])));
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const text = cols.length
    ? `insert into ${table} (${cols.join(', ')}) values (${placeholders.join(', ')}) returning *`
    : `insert into ${table} default values returning *`;
  return { text, values };
}

export function buildUpdate(table, id, data, allowed, jsonColumns = []) {
  const cols = allowed.filter((c) => data[c] !== undefined);
  if (!cols.length) return null;
  const values = cols.map((c) => (jsonColumns.includes(c) ? JSON.stringify(data[c]) : toParam(data[c])));
  const sets = cols.map((c, i) => `${c} = $${i + 1}`);
  values.push(id);
  return { text: `update ${table} set ${sets.join(', ')} where id = $${values.length} returning *`, values };
}

/** Accumulates WHERE clauses with positional parameters. */
export class Where {
  constructor() {
    this.clauses = [];
    this.values = [];
  }

  add(clause, ...params) {
    // `?` placeholders are replaced with $n in order.
    let text = clause;
    for (const p of params) {
      this.values.push(p);
      text = text.replace('?', `$${this.values.length}`);
    }
    this.clauses.push(text);
    return this;
  }

  param(value) {
    this.values.push(value);
    return `$${this.values.length}`;
  }

  toString() {
    return this.clauses.length ? `where ${this.clauses.join(' and ')}` : '';
  }
}

export function paginate(query, { defaultLimit = 24, maxLimit = 100 } = {}) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  return { limit, page, offset: (page - 1) * limit };
}

export function pageMeta(total, { limit, page }) {
  return { total, page, limit, pages: Math.max(Math.ceil(total / limit), 1) };
}
