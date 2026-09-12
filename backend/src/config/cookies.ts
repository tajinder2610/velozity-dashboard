import { CookieOptions } from 'express';

// Locally frontend (5173) and backend (4000) are both on localhost, so a
// same-site cookie works. In production the frontend (Vercel) and backend
// (Render) are on different domains — see Technology_Decisions.md §7 — so
// the cookie must be SameSite=None, which browsers only honor if Secure is
// also set. Getting this wrong doesn't error loudly, it just silently drops
// the cookie, so it's centralized here instead of repeated at each call site.
export function refreshCookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export const REFRESH_COOKIE_NAME = 'refreshToken';
