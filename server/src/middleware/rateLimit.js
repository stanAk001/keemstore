import rateLimit from 'express-rate-limit';

const base = { standardHeaders: 'draft-7', legacyHeaders: false };

export const apiLimiter = rateLimit({ ...base, windowMs: 60_000, limit: 300 });

export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60_000,
  limit: 20,
  message: { error: 'Too many sign-in attempts. Please wait a few minutes and try again.' },
});

// Tracking beacons are cheap but should not be floodable.
export const trackingLimiter = rateLimit({ ...base, windowMs: 60_000, limit: 120 });

export const newsletterLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60_000,
  limit: 10,
  message: { error: 'Too many sign-up attempts. Please try again later.' },
});
