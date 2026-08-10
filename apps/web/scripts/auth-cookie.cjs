// Mint the session cookie a signed-in browser would carry.
//
// The gated surfaces — manager.esy.ge, admin.esy.ge, /account — are the bulk
// of this product, and none of them could be screenshotted, because signing in
// means real Google OAuth: a consent screen, possibly 2FA, and bot detection
// that exists precisely to stop what a test driver does.
//
// The way through is to notice what the app actually trusts. Authentication is
// an HttpOnly `esy_token` cookie holding a JWT whose only claim is the
// subject, signed HS512 with SHA-512(JWT_SECRET). A caller that knows the
// secret can mint that token itself — so the test signs one and sets the
// cookie, and every gated screen opens.
//
// Nothing in production changes. There is deliberately no dev-login endpoint
// (CLAUDE.md records it being removed), and this does not reintroduce one: the
// capability lives in the test process and rests on a secret that is different
// in production. A CI run would use that environment's own secret, or a
// throwaway stack's.
//
// The account still has to exist with the roles being tested — see
// scripts/seed-visual.sql.
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET
  || 'dev-local-esy-jwt-secret-please-override-in-production-0123456789abcdef';

/** The signing key JwtUtil derives: raw SHA-512 of the configured secret. */
function signingKey() {
  return crypto.createHash('sha512').update(SECRET, 'utf8').digest();
}

/** A token for this username, matching JwtUtil.generateToken(String). */
function mintToken(username, ttlSeconds = 3600) {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { sub: username, iat: now, exp: now + ttlSeconds },
    signingKey(),
    { algorithm: 'HS512' },
  );
}

/**
 * The cookie in Playwright's shape. Domain is the registrable parent (.lvh.me)
 * so one cookie covers the storefront, manager and admin hosts exactly as the
 * real one does — that shared domain is the whole point of the SSO design.
 */
function authCookie(username, { domain = '.lvh.me', ttlSeconds = 3600 } = {}) {
  return {
    name: 'esy_token',
    value: mintToken(username, ttlSeconds),
    domain,
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
    expires: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
}

module.exports = { mintToken, authCookie, signingKey };
