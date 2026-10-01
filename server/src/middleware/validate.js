import { badRequest } from '../utils/httpError.js';

/** Validate and replace req.body with the parsed (coerced, stripped) value. */
export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      throw badRequest(details[0] ? `${details[0].path || 'body'}: ${details[0].message}` : 'Invalid input', details);
    }
    req.body = result.data;
    next();
  };
}
