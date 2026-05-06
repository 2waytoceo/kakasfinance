/**
 * api/token.js  —  Axis Bank OAuth 2.0 Token Endpoint
 * ─────────────────────────────────────────────────────────────
 * Vercel Serverless Function
 *
 * Exchanges client_credentials for a Bearer access token from
 * Axis Bank API Connect gateway (PKCE + client_credentials flow).
 *
 * POST /api/token
 * Body : { client_id, client_secret, ibm_client_id }
 * Returns: { access_token, token_type, expires_in, scope }
 * ─────────────────────────────────────────────────────────────
 */

import crypto from 'crypto';

const AXIS_TOKEN_URL =
  process.env.AXIS_TOKEN_URL ||
  'https://apiconnect.axisbank.co.in/gateway/axis/1.0/token';

/* ── HMAC-SHA256 checksum (required by Axis Bank) ────────── */
function buildChecksum(data, key) {
  if (!key) { console.warn('[token] AXIS_HMAC_KEY not set'); return ''; }
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

/* ── Vercel handler ──────────────────────────────────────── */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.APP_BASE_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({
      status: 'FAILURE',
      errorCode: 'METHOD_NOT_ALLOWED',
      errorMessage: 'Only POST is accepted on /api/token.',
    });
  }

  const {
    client_id     = process.env.AXIS_CLIENT_ID,
    client_secret = process.env.AXIS_CLIENT_SECRET,
    ibm_client_id = process.env.AXIS_IBM_CLIENT_ID,
  } = req.body || {};

  if (!client_id || !client_secret || !ibm_client_id) {
    return res.status(400).json({
      status: 'FAILURE',
      errorCode: 'MISSING_CREDENTIALS',
      errorMessage: 'client_id, client_secret and ibm_client_id are all required.',
    });
  }

  const checksumData = `${client_id}${client_secret}${Date.now()}`;
  const checksum     = buildChecksum(checksumData, process.env.AXIS_HMAC_KEY || client_secret);

  const body = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id,
    client_secret,
    scope:         'corporate_payout',
  }).toString();

  try {
    const response = await fetch(AXIS_TOKEN_URL, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/x-www-form-urlencoded',
        'X-IBM-Client-Id': ibm_client_id,
        'X-Checksum':      checksum,
        'Accept':          'application/json',
      },
      body,
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        status:       'FAILURE',
        errorCode:    data.errorCode || 'TOKEN_ERROR',
        errorMessage: data.errorMessage || data.error_description || 'Token request failed.',
        httpStatus:   response.status,
      });
    }

    return res.status(200).json({
      status:       'SUCCESS',
      access_token: data.access_token,
      token_type:   data.token_type  || 'Bearer',
      expires_in:   data.expires_in  || 3600,
      scope:        data.scope       || 'corporate_payout',
      issued_at:    new Date().toISOString(),
    });

  } catch (err) {
    console.error('[token] fetch error:', err.message);
    return res.status(500).json({
      status:       'FAILURE',
      errorCode:    'INTERNAL_ERROR',
      errorMessage: 'Token service temporarily unavailable. Please retry.',
      detail:       err.message,
    });
  }
}
