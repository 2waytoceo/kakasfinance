/**
 * api/callback.js  —  Axis Bank OAuth 2.0 Callback Handler
 * ─────────────────────────────────────────────────────────────
 * Vercel Serverless Function
 *
 * Handles the redirect_uri after Axis Bank authorization consent.
 *
 * GET  /api/callback?code=AUTH_CODE&state=XYZ
 *      → Redirects frontend with auth code for PKCE exchange
 *
 * POST /api/callback  { code, code_verifier, redirect_uri }
 *      → Exchanges auth code + PKCE verifier for access token
 * ─────────────────────────────────────────────────────────────
 */

const AXIS_TOKEN_URL =
  process.env.AXIS_TOKEN_URL ||
  'https://apiconnect.axisbank.co.in/gateway/axis/1.0/token';

/* Constant-time comparison to prevent timing attacks on state param */
function safeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function exchangeCode({ code, code_verifier, redirect_uri }) {
  const body = new URLSearchParams({
    grant_type:    'authorization_code',
    client_id:     process.env.AXIS_CLIENT_ID,
    client_secret: process.env.AXIS_CLIENT_SECRET,
    code,
    code_verifier,
    redirect_uri:  redirect_uri || `${process.env.APP_BASE_URL}/api/callback`,
  }).toString();

  const res = await fetch(AXIS_TOKEN_URL, {
    method:  'POST',
    headers: {
      'Content-Type':    'application/x-www-form-urlencoded',
      'X-IBM-Client-Id': process.env.AXIS_IBM_CLIENT_ID,
      'Accept':          'application/json',
    },
    body,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.errorMessage || data.error_description || `HTTP ${res.status}`);

  return {
    access_token:  data.access_token,
    refresh_token: data.refresh_token || null,
    token_type:    data.token_type    || 'Bearer',
    expires_in:    data.expires_in    || 3600,
    scope:         data.scope         || 'corporate_payout',
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.APP_BASE_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  /* ── GET: Axis Bank redirected here after consent ───────── */
  if (req.method === 'GET') {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.error('[callback] auth error:', error, error_description);
      return res.redirect(302, `/?auth_error=${encodeURIComponent(error_description || error)}`);
    }

    if (!code) {
      return res.status(400).json({
        status: 'FAILURE', errorCode: 'MISSING_CODE',
        errorMessage: 'Authorization code not found in callback URL.',
      });
    }

    // Hand code to the SPA to do the PKCE exchange
    return res.redirect(302,
      `/?auth_code=${encodeURIComponent(code)}&state=${encodeURIComponent(state || '')}`
    );
  }

  /* ── POST: SPA sends code + code_verifier for token ─────── */
  if (req.method === 'POST') {
    const { code, code_verifier, redirect_uri } = req.body || {};

    if (!code || !code_verifier) {
      return res.status(400).json({
        status: 'FAILURE', errorCode: 'MISSING_PARAMS',
        errorMessage: 'code and code_verifier are required for token exchange.',
      });
    }

    try {
      const tokens = await exchangeCode({ code, code_verifier, redirect_uri });
      return res.status(200).json({ status: 'SUCCESS', ...tokens, issued_at: new Date().toISOString() });
    } catch (err) {
      console.error('[callback] exchange error:', err.message);
      return res.status(502).json({
        status: 'FAILURE', errorCode: 'TOKEN_EXCHANGE_FAILED', errorMessage: err.message,
      });
    }
  }

  return res.status(405).json({
    status: 'FAILURE', errorCode: 'METHOD_NOT_ALLOWED',
    errorMessage: 'Only GET and POST are supported.',
  });
}
