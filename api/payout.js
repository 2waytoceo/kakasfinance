/**
 * api/payout.js  —  Corporate Payout Unified Handler
 * ─────────────────────────────────────────────────────────────
 * Vercel Serverless Function
 *
 * Handles 4 payout operations via a single endpoint:
 *   salary       — bulk / individual salary disbursement
 *   transfer     — IMPS / NEFT / RTGS fund transfer
 *   acct_validate — account name inquiry (penny-drop)
 *   fetch_vpa    — UPI VPA resolution
 *
 * POST /api/payout
 * Headers: Authorization: Bearer <access_token>
 *          X-IBM-Client-Id: <ibm_client_id>
 * Body:    { operation, ...fields }
 * ─────────────────────────────────────────────────────────────
 */

import crypto from 'crypto';

const BASE = 'https://apiconnect.axisbank.co.in/aapis/corporate-payout/v1';

const ENDPOINTS = {
  salary:        `${BASE}/salary`,
  transfer:      `${BASE}/transfer`,
  acct_validate: `${BASE}/account/validate`,
  fetch_vpa:     `${BASE}/upi/fetchvpa`,
};

const REQUIRED_FIELDS = {
  salary:        ['corporateAccountNo', 'debitAccount', 'transactions'],
  transfer:      ['debitAccount', 'beneficiaryAccount', 'beneficiaryIFSC', 'amount', 'transferMode', 'uniqueRefNo'],
  acct_validate: ['beneficiaryAccount', 'beneficiaryIFSC'],
  fetch_vpa:     ['vpaAddress', 'corporateAccountNo'],
};

function generateChecksum(payload, key) {
  const k = key || process.env.AXIS_HMAC_KEY;
  if (!k) return '';
  return crypto.createHmac('sha256', k).update(JSON.stringify(payload)).digest('base64');
}

function buildPayload(op, d) {
  const ts = new Date().toISOString();
  switch (op) {
    case 'salary': return {
      corporateAccountNo: d.corporateAccountNo || process.env.AXIS_CORP_ACCOUNT,
      debitAccount:       d.debitAccount       || process.env.AXIS_DEBIT_ACCOUNT,
      batchRefId:         d.batchRefId         || `BATCH-${Date.now()}`,
      paymentDate:        d.paymentDate        || ts.split('T')[0],
      transactions:       d.transactions       || [],
      initiatedAt:        ts,
    };
    case 'transfer': return {
      debitAccount:       d.debitAccount,
      beneficiaryAccount: d.beneficiaryAccount,
      beneficiaryIFSC:    d.beneficiaryIFSC,
      beneficiaryName:    d.beneficiaryName || '',
      amount:             d.amount,
      transferMode:       d.transferMode || 'IMPS',
      remarks:            d.remarks      || 'Fund Transfer',
      uniqueRefNo:        d.uniqueRefNo  || `REF-${Date.now()}`,
      callbackUrl:        d.callbackUrl  || process.env.CALLBACK_URL || '',
      initiatedAt:        ts,
    };
    case 'acct_validate': return {
      beneficiaryAccount: d.beneficiaryAccount,
      beneficiaryIFSC:    d.beneficiaryIFSC,
      validationMode:     d.validationMode || 'NAME_MATCH',
      corpRefId:          d.corpRefId      || `VAL-${Date.now()}`,
      initiatedAt:        ts,
    };
    case 'fetch_vpa': return {
      vpaAddress:         d.vpaAddress,
      corporateAccountNo: d.corporateAccountNo || process.env.AXIS_CORP_ACCOUNT,
      purposeCode:        d.purposeCode || 'P2B',
      initiatedAt:        ts,
    };
    default: return d;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-IBM-Client-Id');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'FAILURE', errorCode: 'METHOD_NOT_ALLOWED', errorMessage: 'Only POST accepted.' });
  }

  const authHeader  = req.headers['authorization'] || '';
  const ibmClientId = req.headers['x-ibm-client-id'] || process.env.AXIS_IBM_CLIENT_ID;

  if (!authHeader.startsWith('Bearer ') || authHeader.length < 20) {
    return res.status(401).json({
      status: 'FAILURE', errorCode: 'AUTH_001', httpStatus: 401,
      errorMessage: 'Valid Bearer token required in Authorization header.',
    });
  }

  const { operation, ...data } = req.body || {};

  if (!operation || !ENDPOINTS[operation]) {
    return res.status(400).json({
      status: 'FAILURE', errorCode: 'INVALID_OPERATION',
      errorMessage: `operation must be one of: ${Object.keys(ENDPOINTS).join(', ')}`,
    });
  }

  const required = REQUIRED_FIELDS[operation] || [];
  const missing  = required.filter(f => !data[f]);
  if (missing.length) {
    return res.status(400).json({
      status: 'FAILURE', errorCode: 'MISSING_FIELDS',
      errorMessage: `Missing required fields: ${missing.join(', ')}`,
      missingFields: missing,
    });
  }

  const payload  = buildPayload(operation, data);
  const checksum = generateChecksum(payload, data.hmacKey);

  try {
    const response = await fetch(ENDPOINTS[operation], {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'Authorization':   authHeader,
        'X-IBM-Client-Id': ibmClientId,
        'X-Checksum':      checksum,
        'Accept':          'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        status: 'FAILURE',
        errorCode:    responseData.errorCode    || `HTTP_${response.status}`,
        errorMessage: responseData.errorMessage || 'Axis Bank API returned an error.',
        httpStatus:   response.status,
        axisResponse: responseData,
      });
    }

    return res.status(200).json({
      status:   'SUCCESS',
      operation,
      data:     responseData,
      servedAt: new Date().toISOString(),
    });

  } catch (err) {
    console.error(`[payout/${operation}] error:`, err.message);
    return res.status(500).json({
      status: 'FAILURE', errorCode: 'GATEWAY_ERROR',
      errorMessage: 'Payout service temporarily unavailable.',
      detail: err.message,
    });
  }
}
