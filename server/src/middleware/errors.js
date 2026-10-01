import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
}

// Postgres error codes we translate into client errors.
const PG_ERRORS = {
  23505: [409, 'That value is already in use'],
  23503: [409, 'This record is linked to other content'],
  23514: [400, 'A value is outside the allowed range'],
  '22P02': [400, 'Invalid identifier'],
};

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err?.code && PG_ERRORS[err.code]) {
    const [status, message] = PG_ERRORS[err.code];
    const field = err.constraint ? ` (${err.constraint.replace(/_key$|_fkey$/, '')})` : '';
    return res.status(status).json({ error: message + field });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body' });
  }
  if (err?.name === 'MulterError') {
    return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : err.message });
  }

  console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ error: env.isProd ? 'Something went wrong' : err.message });
}
