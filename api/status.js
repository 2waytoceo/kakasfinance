/**
 * api/status.js  —  Transaction Status Handler
 * ─────────────────────────────────────────────────────────────
 * Vercel Serverless Function
 *
 * Queries real-time payout status from Axis Bank gateway.
 * Supports lookup by Transaction Reference Number or UTR.
 *
 * GET  /api/status?txnRef=TXN-xxx
 * GET  /api/status?utr=UTRxxxxxxx
 * POST /api/status  { txnRef?, utr?, channelId? }
 *
 * Headers: Authorization: Bearer <token>
 *          X-IBM-Client-Id: <ibm_client_id>
 * ─────────────────────────────────────────────────────────────
 */

const AXIS_STATUS_URL =
  process.env.AXIS_STATUS_URL ||
  'https://apiconnect.axisbank.co.in/aapis/corporate-payout/v1/transaction/status';

/* Human-readable status enrichment map */
const STATUS_MAP = {
  CREDITED:    { label: 'Credited',           color: 'success' },
  PROCESSED:   { label: 'Processed',          color: 'success' },
  SUCCESS:     { label: 'Successful',          color: 'success' },
  PENDING:     { label: 'Pending',             color: 'warning' },
  IN_PROGRESS: { label: 'In Progress',         color: 'warning' },
  QUEUED:      { label: 'Queued',              color: 'info'    },
  FAILED:      { label: 'Failed',              color: 'danger'  },
  REJECTED:    { label: 'Rejected',            color: 'danger'  },
  REVERSED:    { label: 'Reversed',            color: 'warning' },
  RETURNED:    { label: 'Returned to Sender',  color: 'warning' },
  CANCELLED:   { label: 'Cancelled',           color: 'danger'  },
};

function enrichStatus(raw) {
  const key = (raw || '').toUpperCase();
  return STATUS_MAP[key] || { label: raw || 'Unknown', color: 'secondary' };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-IBM-Client-Id');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ status: 'FAILURE', errorCode: 'METHOD_NOT_ALLOWED', errorMessage: 'GET or POST only.' });
  }

  const authHeader  = req.headers['authorization'] || '';
  const ibmClientId = req.headers['x-ibm-client-id'] || process.env.AXIS_IBM_CLIENT_ID;

  if (!authHeader.startsWith('Bearer ') || authHeader.length < 20) {
    return res.status(401).json({
      status: 'FAILURE', errorCode: 'AUTH_001', httpStatus: 401,
      errorMessage: 'Valid Bearer token required in Authorization header.',
    });
  }

  let txnRef, utr, channelId = 'CORP_API';

  if (req.method === 'GET') {
    txnRef    = req.query.txnRef    || req.query.transactionRefNo;
    utr       = req.query.utr       || req.query.utrNo;
    channelId = req.query.channelId || channelId;
  } else {
    ({ txnRef, utr, channelId = 'CORP_API' } = req.body || {});
  }

  if (!txnRef && !utr) {
    return res.status(400).json({
      status: 'FAILURE', errorCode: 'MISSING_IDENTIFIER',
      errorMessage: 'Provide txnRef (transaction reference) or utr (UTR number).',
    });
  }

  try {
    const params = new URLSearchParams();
    if (txnRef)    params.set('transactionRefNo', txnRef);
    if (utr)       params.set('utrNo', utr);
    if (channelId) params.set('channelId', channelId);

    const response = await fetch(`${AXIS_STATUS_URL}?${params}`, {
      method:  'GET',
      headers: {
        'Authorization':   authHeader,
        'X-IBM-Client-Id': ibmClientId,
        'Accept':          'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        status: 'FAILURE',
        errorCode:    data.errorCode    || `HTTP_${response.status}`,
        errorMessage: data.errorMessage || 'Status query failed.',
        httpStatus:   response.status,
      });
    }

    const enriched = enrichStatus(data.paymentStatus || data.status);

    return res.status(200).json({
      status:         'SUCCESS',
      transactionRef: data.transactionRef || txnRef,
      utr:            data.utr  || utr,
      paymentStatus:  data.paymentStatus || data.status,
      statusLabel:    enriched.label,
      statusColor:    enriched.color,
      amount:         data.amount,
      beneficiaryAccount: data.beneficiaryAccount,
      beneficiaryName:    data.beneficiaryName,
      transferMode:   data.transferMode,
      creditedAt:     data.creditedAt || data.timestamp,
      queriedAt:      new Date().toISOString(),
      raw:            data,
    });

  } catch (err) {
    console.error('[status] error:', err.message);
    return res.status(500).json({
      status: 'FAILURE', errorCode: 'GATEWAY_ERROR',
      errorMessage: 'Transaction status service temporarily unavailable.',
      detail: err.message,
    });
  }
}
