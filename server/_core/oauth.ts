import type { Express } from 'express';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { parse as parseCookies } from 'cookie';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getUserByOpenId, upsertUser } from '../db';
import { sdk } from './sdk';
import { COOKIE_NAME, getSessionCookieOptions } from './localAuth';

const transactionCookie = 'poipoi_google_oauth';
const transactions = new Map<string, { browser: string; nonce: string; verifier: string; expires: number }>();
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'), { timeoutDuration: 10000 });
const random = () => randomBytes(32).toString('base64url');
function configuration() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const sessionSecret = process.env.JWT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim() || 'http://localhost:3000/api/oauth/google/callback';
  let validRedirect = false;
  try {
    const url = new URL(redirectUri);
    validRedirect = (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
      && !url.username && !url.password && !url.search && !url.hash && url.pathname === '/api/oauth/google/callback';
  } catch { /* Invalid configuration is reported as unavailable. */ }
  return { clientId, clientSecret, redirectUri, enabled: Boolean(clientId && clientSecret && sessionSecret && sessionSecret.length >= 32 && validRedirect) };
}
function pruneTransactions() {
  for (const [state, entry] of transactions) if (entry.expires <= Date.now()) transactions.delete(state);
}

export function registerOAuthRoutes(app: Express) {
  app.get('/api/oauth/google/status', (_req, res) => {
    res.set('Cache-Control', 'no-store').json({ enabled: configuration().enabled });
  });
  app.get('/api/oauth/google/start', (req, res) => {
    res.set('Cache-Control', 'no-store');
    const config = configuration();
    if (!config.enabled) { res.redirect('/login?google_error=not_configured'); return; }
    // Always bind the transaction cookie to the configured callback host.
    const callback = new URL(config.redirectUri);
    if (req.get('host') !== callback.host || req.protocol !== callback.protocol.slice(0, -1)) {
      res.redirect(new URL('/api/oauth/google/start', callback.origin).toString()); return;
    }
    pruneTransactions();
    if (transactions.size >= 500) { res.status(429).send('認証要求が多いため、しばらくしてからお試しください。'); return; }
    const state = random(), browser = random(), nonce = random(), verifier = random();
    transactions.set(state, { browser, nonce, verifier, expires: Date.now() + 10 * 60 * 1000 });
    res.cookie(transactionCookie, browser, { ...getSessionCookieOptions(req), path: '/api/oauth/google', maxAge: 10 * 60 * 1000 });
    const query = new URLSearchParams({
      client_id: config.clientId!, redirect_uri: config.redirectUri, response_type: 'code',
      scope: 'openid email profile', state, nonce, prompt: 'select_account',
      code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256',
    });
    res.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + query.toString());
  });
  app.get('/api/oauth/google/callback', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.set('Referrer-Policy', 'no-referrer');
    const config = configuration();
    if (!config.enabled) { res.redirect('/login?google_error=not_configured'); return; }
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const transaction = transactions.get(state);
    let browser = '';
    try { browser = parseCookies(req.headers.cookie || '')[transactionCookie] || ''; } catch { /* Reject malformed cookies. */ }
    if (!transaction || transaction.expires <= Date.now() || !/^[A-Za-z0-9_-]{43}$/.test(browser) ||
        !timingSafeEqual(Buffer.from(browser), Buffer.from(transaction.browser))) {
      res.redirect('/login?google_error=state'); return;
    }
    transactions.delete(state); // Single use, including cancelled attempts.
    res.clearCookie(transactionCookie, { ...getSessionCookieOptions(req), path: '/api/oauth/google' });
    if (req.query.error) { res.redirect('/login?google_error=cancelled'); return; }
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    if (!code || code.length > 8192) { res.redirect('/login?google_error=verification'); return; }
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code, client_id: config.clientId!, client_secret: config.clientSecret!,
          redirect_uri: config.redirectUri, grant_type: 'authorization_code', code_verifier: transaction.verifier }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error('Token exchange failed');
      const tokens = await response.json() as { id_token?: unknown };
      if (typeof tokens.id_token !== 'string') throw new Error('Missing ID token');
      const { payload } = await jwtVerify(tokens.id_token, googleKeys, {
        issuer: ['https://accounts.google.com', 'accounts.google.com'], audience: config.clientId!, algorithms: ['RS256'],
        requiredClaims: ['sub', 'exp', 'iat', 'nonce'], maxTokenAge: '10m',
      });
      if (payload.nonce !== transaction.nonce || !payload.sub || payload.email_verified !== true || typeof payload.email !== 'string') {
        throw new Error('Invalid verified identity');
      }
      // Identity is based on Google's stable subject, never an unverified email merge.
      const openId = 'google_' + createHash('sha256').update(payload.sub).digest('base64url');
      let user = await getUserByOpenId(openId);
      if (!user) {
        await upsertUser({ openId, name: typeof payload.name === 'string' && payload.name.trim() ? payload.name : payload.email,
          email: payload.email, loginMethod: 'google', role: 'user', lastSignedIn: new Date() });
        user = await getUserByOpenId(openId);
      }
      if (!user) { res.redirect('/login?google_error=storage'); return; }
      const token = await sdk.createSessionToken(user.openId, { name: user.name || payload.email, expiresInMs: 30 * 24 * 60 * 60 * 1000 });
      res.cookie(COOKIE_NAME, token, getSessionCookieOptions(req));
      res.redirect('/streaming');
    } catch {
      // Do not log codes, tokens, secrets or upstream error payloads.
      res.redirect('/login?google_error=failed');
    }
  });
}
