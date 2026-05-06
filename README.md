# Axis Bank Corporate Payout — Owner Portal

> OAuth 2.0 + PKCE secured API test console for Axis Bank Corporate Payout services.  
> Built for Application Owners to configure, test and monitor all payout APIs live.

![Axis Bank](https://img.shields.io/badge/Axis%20Bank-Corporate%20Payout-B71C1C?style=flat-square)
![OAuth 2.0](https://img.shields.io/badge/OAuth-2.0%20%2B%20PKCE-0d47a1?style=flat-square)
![Node](https://img.shields.io/badge/Node.js-%3E%3D18-339933?style=flat-square)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=flat-square)
![License](https://img.shields.io/badge/License-UNLICENSED-red?style=flat-square)

---

## Project Structure

```
my-project/
│
├── api/
│   ├── token.js        # OAuth 2.0 token — client_credentials flow + HMAC checksum
│   ├── callback.js     # OAuth callback — auth-code ↔ PKCE token exchange + CSRF guard
│   ├── status.js       # Transaction status query (GET) with enriched labels
│   └── payout.js       # Unified POST handler: salary / transfer / acct_validate / fetch_vpa
│
├── public/
│   └── logo.png        # Axis Bank portal logo (320×80 px PNG)
│
├── index.html          # Single-page app shell (login + dashboard + 5 API testers)
├── style.css           # Full design system — tokens, login, topbar, sidebar, tester panels
├── script.js           # All frontend logic — auth, nav, tester builder, live API, metrics
├── package.json        # Node.js dependencies + scripts
├── vercel.json         # Vercel routes, CORS headers, env variable references
├── .gitignore          # Excludes .env, node_modules, *.key, secrets/
└── README.md           # This file
```

---

## Features

| Feature | Detail |
|---|---|
| OAuth 2.0 + PKCE | Full authorization code flow + client_credentials |
| Live API tester | Real HTTP → Axis Bank gateway when token provided |
| Sandbox mock | Safe testing without credentials (mock 200/401 responses) |
| 5 payout APIs | Salary, Transfer, Txn Status, Acct Validate, Fetch VPA |
| Metrics dashboard | Total calls, success %, error count, avg response time (live flash) |
| Request history | Session log: method · URL · status · ms · timestamp |
| HMAC checksum | Server-side SHA-256 on every payout request |
| CORS handled | api/*.js serverless functions proxy all calls |
| Responsive | Works on desktop, tablet, mobile |

---

## Quick Start

### 1. Clone

```bash
git clone https://github.com/2waytoceo/axis-bank-corporate-payout.git
cd axis-bank-corporate-payout
npm install
```

### 2. Create `.env`

```env
# Axis Bank API Connect (from apiconnect.axisbank.co.in)
AXIS_CLIENT_ID=xxxx-xxxx-xxxx-xxxx
AXIS_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
AXIS_IBM_CLIENT_ID=xxxx-xxxx-xxxx
AXIS_HMAC_KEY=xxxxxxxxxxxxxxxxxxxxxxxx

# Corporate account details
AXIS_CORP_ACCOUNT=xxxxxxxxxxxxxxx
AXIS_DEBIT_ACCOUNT=xxxxxxxxxxxxxxx

# App config
APP_BASE_URL=https://your-app.vercel.app
CALLBACK_URL=https://your-app.vercel.app/api/callback
JWT_SECRET=your-256-bit-secret

# Portal auth
OWNER_EMAIL=2waytoceo@gmail.com
OWNER_PASSWORD_HASH=<bcrypt-hash>
```

### 3. Run locally

```bash
# Static only (no server-side calls)
npx serve . -p 3000

# Full with Vercel serverless functions
npx vercel dev
# → http://localhost:3000
```

### 4. Login credentials (demo)

| Field    | Value                |
|----------|----------------------|
| Email    | `2waytoceo@gmail.com` |
| Password | `xxxxxxxxx'`        |

---

## Deploy to Vercel

```bash
npm i -g vercel
vercel login
vercel --prod
```

Then add all `.env` variables in **Vercel Dashboard → Project → Settings → Environment Variables**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/2waytoceo/axis-bank-corporate-payout)

---

## API Reference

### `POST /api/token`

```json
// Request body
{ "client_id": "xxxx", "client_secret": "xxxx", "ibm_client_id": "xxxx" }

// Response
{ "status": "SUCCESS", "access_token": "eyJ...", "token_type": "Bearer", "expires_in": 3600 }
```

### `POST /api/payout`

```
Authorization: Bearer <token>
X-IBM-Client-Id: <ibm_client_id>
```

```json
// operation: "salary" | "transfer" | "acct_validate" | "fetch_vpa"
{ "operation": "salary", "corporateAccountNo": "xxx", "debitAccount": "xxx", "transactions": [...] }
```

### `GET /api/status?txnRef=TXN-xxx`

```json
{ "status": "SUCCESS", "paymentStatus": "CREDITED", "statusLabel": "Credited", "statusColor": "success", "utr": "AXIS..." }
```

### `GET /api/callback?code=...&state=...` · `POST /api/callback`

OAuth 2.0 authorization code callback and PKCE token exchange.

---

## Axis Bank Endpoints Used

| API | Method | Endpoint |
|-----|--------|----------|
| Token | POST | `https://apiconnect.axisbank.co.in/gateway/axis/1.0/token` |
| Salary | POST | `https://apiconnect.axisbank.co.in/aapis/corporate-payout/v1/salary` |
| Transfer | POST | `https://apiconnect.axisbank.co.in/aapis/corporate-payout/v1/transfer` |
| Txn Status | GET | `https://apiconnect.axisbank.co.in/aapis/corporate-payout/v1/transaction/status` |
| Acct Validate | POST | `https://apiconnect.axisbank.co.in/aapis/corporate-payout/v1/account/validate` |
| Fetch VPA | POST | `https://apiconnect.axisbank.co.in/aapis/corporate-payout/v1/upi/fetchvpa` |

---

## Credential Guide

| Credential | Where to get |
|---|---|
| `Client ID` | Axis Bank API Connect portal → Your App |
| `Client Secret` | Axis Bank API Connect portal → Your App |
| `X-IBM-Client-Id` | Axis Bank API Connect → Subscription key |
| `HMAC Key` | Provided by Axis Bank onboarding team |
| `Bearer Token` | Generated via `POST /api/token` |

Register at **https://apiconnect.axisbank.co.in** to obtain credentials.

---

## Security

- `.env` is in `.gitignore` — never committed
- All credentials flow through Vercel serverless functions, never exposed to the browser
- HMAC-SHA256 checksum computed server-side on every payout call
- PKCE prevents authorization code interception attacks
- Constant-time comparison for OAuth `state` param (CSRF protection)
- Security headers set in `vercel.json`: `X-Frame-Options`, `X-XSS-Protection`, `X-Content-Type-Options`

---

## Author

**2waytoceo** · [2waytoceo@gmail.com](mailto:2waytoceo@gmail.com)  
Axis Bank Application Owner · Corporate Payout API Integration

---

*UNLICENSED — Private and confidential. Not for public distribution.*
