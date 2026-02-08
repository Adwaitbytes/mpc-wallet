<p align="center">
  <img src="https://img.shields.io/badge/stellar-testnet-blue?style=flat-square" alt="Stellar Testnet">
  <img src="https://img.shields.io/badge/MPC-2%20of%203-8b5cf6?style=flat-square" alt="MPC 2-of-3">
  <img src="https://img.shields.io/badge/encryption-AES--256--GCM-10b981?style=flat-square" alt="AES-256-GCM">
  <img src="https://img.shields.io/badge/license-MIT-white?style=flat-square" alt="MIT">
  <a href="https://fledge-six.vercel.app"><img src="https://img.shields.io/badge/live-fledge--six.vercel.app-6366f1?style=flat-square" alt="Live"></a>
</p>

<h1 align="center">Fledge</h1>

<p align="center">
Family crypto vault with MPC threshold signing on Stellar.<br>
No single person holds the key. Not the child. Not the parent. Not the server.
</p>

<br>

## The Problem

Crypto wallets are built for individuals. One key, one owner, full control. But families don't work that way.

A 12-year-old shouldn't have unsupervised access to money. A parent shouldn't have to manage another wallet. And no one should trust a centralized app with their private key.

There is **zero** infrastructure for family-based crypto custody — on any chain.

## The Solution

Fledge splits a Stellar wallet's private key into 3 shares using **Shamir Secret Sharing** with a **2-of-3 threshold**. One share goes to the child, one to each parent. Any 2 can authorize a transaction. No single person can act alone.

When a child wants to spend, a parent approves — the key is reconstructed in memory for less than a second, signs a real Stellar transaction, submits it to Horizon, and is **immediately wiped**.

```
Child creates wallet → Private key generated
                           ↓
              Shamir split (2-of-3, GF(256))
                    ↓        ↓        ↓
                Share 1   Share 2   Share 3
                (Child)  (Parent A) (Parent B)
                    ↓        ↓        ↓
              AES-256-GCM encrypted (scrypt, unique salt)
                    ↓        ↓        ↓
              Stored in PostgreSQL (encrypted at rest)
```

```
Child requests "Send 10 XLM" → Parent approves
                                     ↓
                      Decrypt child share + parent share
                                     ↓
                          shamirCombine() → private key
                                     ↓
              TransactionBuilder → Operation.payment → sign
                                     ↓
                          Submit to Stellar Horizon
                                     ↓
                     tx_hash recorded → key WIPED from memory
```

<br>

## How It Works

**1. Child signs in with Google** — zero crypto knowledge needed.

**2. Adds two parents by email** — they receive an invitation link.

**3. Parents accept** — sign in with Google, automatically joined to the family.

**4. Stellar wallet created** — real Ed25519 keypair on the Stellar network.

**5. Private key split** — Shamir Secret Sharing over GF(256), 2-of-3 threshold. Each share encrypted with AES-256-GCM using scrypt key derivation (100,000 iterations, unique salt per share).

**6. Child requests spending** — specifies amount, destination, and purpose.

**7. Parent approves** — 2 shares decrypted, key reconstructed, Stellar transaction signed and submitted, key wiped. The full private key exists for < 1 second.

<br>

## Security Architecture

### Key Splitting

| Property | Value |
|----------|-------|
| **Algorithm** | Shamir Secret Sharing over GF(256) |
| **Threshold** | 2-of-3 (any 2 shares reconstruct the key) |
| **Library** | `secrets.js-grempe` (information-theoretic security) |

### Share Encryption

| Property | Value |
|----------|-------|
| **Cipher** | AES-256-GCM (authenticated encryption) |
| **Key Derivation** | scrypt (100,000 iterations) |
| **Key Material** | `SHARE_ENCRYPTION_KEY` + `memberId` (unique per share) |
| **IV** | 12 bytes, cryptographically random per share |
| **Salt** | 16 bytes, cryptographically random per share |
| **Auth Tag** | 128-bit GCM tag (tamper detection) |

### Memory Safety

```typescript
// After signing, the private key is immediately destroyed
transaction.sign(keypair);

// Wipe raw secret key bytes
keypair.rawSecretKey().fill(0);

// Wipe intermediate share data
retrievedShares.forEach((_, idx) => { retrievedShares[idx] = ''; });
privateKeyHex = '';
```

The private key never touches disk. It is reconstructed in server memory, used to sign one transaction, and wiped. Even if the server is compromised mid-request, the attacker gets one signing session — not the key.

### What an Attacker Would Need

| Attack Vector | Blocked By |
|---|---|
| Database breach | Shares encrypted with AES-256-GCM + scrypt. Useless without `SHARE_ENCRYPTION_KEY` |
| Steal 1 share | Need 2-of-3 for reconstruction. One share reveals zero information about the key |
| Server memory dump | Key exists for < 1 second, wiped immediately after signing |
| Intercept transaction | Stellar transactions are signed client-to-Horizon, HTTPS only |
| Brute force scrypt | 100,000 iterations with unique salt per share |

<br>

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS |
| **Auth** | NextAuth 4 + Google OAuth 2.0 |
| **Database** | Neon PostgreSQL (serverless) |
| **Blockchain** | Stellar SDK (`@stellar/stellar-sdk`) |
| **MPC** | Shamir Secret Sharing (`secrets.js-grempe`) |
| **Encryption** | Node.js `crypto` (AES-256-GCM, scrypt) |
| **Email** | Resend (parent invitations) |
| **Deployment** | Vercel (serverless functions) |

<br>

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── auth/page.tsx               # Google OAuth sign-in
│   ├── onboarding/page.tsx         # Family setup wizard
│   ├── child/page.tsx              # Child dashboard (balance, spend requests)
│   ├── parent/page.tsx             # Parent dashboard (approve/deny)
│   ├── status/page.tsx             # Family status (waiting for parents)
│   ├── invite/[token]/page.tsx     # Parent invitation acceptance
│   ├── components/
│   │   ├── ThemeProvider.tsx        # Dark/light theme
│   │   └── UnicornScene.tsx        # Ambient visual effects
│   ├── providers.tsx               # NextAuth session provider
│   └── api/
│       ├── auth/[...nextauth]/     # Google OAuth endpoints
│       │   ├── route.ts
│       │   └── options.ts          # NextAuth config + signIn callback
│       ├── onboarding/
│       │   └── setup/route.ts      # Family creation + parent invitations
│       ├── invite/
│       │   ├── [token]/route.ts    # Validate invite token
│       │   └── accept/route.ts     # Accept invite + create wallet
│       ├── mpc/
│       │   ├── create/route.ts     # Full MPC wallet creation
│       │   ├── create-simple/route.ts  # Simplified wallet creation
│       │   ├── sign/route.ts       # MPC transaction signing
│       │   ├── sign-transaction/route.ts
│       │   └── verify/route.ts     # Verify wallet recovery
│       ├── spend/
│       │   ├── request/route.ts    # Child submits spend request
│       │   ├── requests/route.ts   # List pending requests
│       │   ├── approve/route.ts    # Parent approves (signs + submits tx)
│       │   └── deny/route.ts       # Parent denies request
│       ├── family/
│       │   ├── balance/route.ts    # Live Stellar balance from Horizon
│       │   ├── status/route.ts     # Family + member status
│       │   └── transactions/route.ts # Transaction history from Horizon
│       ├── user/
│       │   └── state/route.ts      # User role + family state routing
│       └── dev/
│           └── reset/route.ts      # Drop all tables (dev only)
├── lib/
│   ├── db.ts                       # Neon PostgreSQL + lazy init + auto-schema
│   ├── auth.ts                     # getCurrentUser + requireAuth + auto-create
│   ├── crypto.ts                   # AES-256-GCM encrypt/decrypt (scrypt)
│   ├── email.ts                    # Resend parent invitations
│   ├── stellar.ts                  # Horizon balance, transactions, Friendbot
│   └── mpc/
│       ├── shamir.ts               # Shamir split/combine (secrets.js-grempe)
│       ├── shamir-simple.ts        # Lightweight Shamir for server-side use
│       ├── encryption.ts           # Client-side AES-GCM share encryption
│       ├── wallet.ts               # MPCWallet orchestrator (create/sign/verify)
│       └── storage.ts              # Share storage abstraction
├── hooks/
│   └── useSmartRouter.ts           # Auto-route based on user state
└── middleware.ts                    # Auth middleware + public path whitelist
```

<br>

## Database Schema

5 tables, auto-created on first request:

```sql
guardian_users          -- Google OAuth users (child + parents)
guardian_families       -- Family unit (child_id, allowance, wallet_public_key, status)
guardian_members        -- Family membership (role, invite_token, share_index)
guardian_wallet_shares  -- Encrypted Shamir shares (AES-256-GCM ciphertext, iv, salt)
guardian_spend_requests -- Spending requests (amount, destination, purpose, tx_hash)
```

<br>

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/[...nextauth]` | GET/POST | Google OAuth sign-in/callback |
| `/api/onboarding/setup` | POST | Create family + invite parents |
| `/api/invite/[token]` | GET | Validate invitation token |
| `/api/invite/accept` | POST | Accept invite, create wallet when 2 parents join |
| `/api/mpc/create` | POST | Full MPC wallet creation (Shamir + encrypt) |
| `/api/mpc/create-simple` | POST | Simplified wallet creation |
| `/api/mpc/sign` | POST | MPC transaction signing |
| `/api/mpc/sign-transaction` | POST | Sign + submit Stellar transaction |
| `/api/mpc/verify` | POST | Verify wallet recovery capability |
| `/api/spend/request` | POST | Child creates spend request |
| `/api/spend/requests` | GET | List pending spend requests |
| `/api/spend/approve` | POST | Parent approves (decrypt → combine → sign → submit → wipe) |
| `/api/spend/deny` | POST | Parent denies request |
| `/api/family/balance` | GET | Live XLM balance from Stellar Horizon |
| `/api/family/status` | GET | Family and member status |
| `/api/family/transactions` | GET | Transaction history from Stellar Horizon |
| `/api/user/state` | GET | User role + routing state |

<br>

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 9.x
- Google OAuth credentials ([console.cloud.google.com](https://console.cloud.google.com/apis/credentials))
- Neon PostgreSQL database ([neon.tech](https://neon.tech))
- Resend API key ([resend.com](https://resend.com))

### Setup

```bash
git clone https://github.com/Adwaitbytes/mpc-wallet.git
cd mpc-wallet
pnpm install
```

Create `.env.local`:

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-at-least-32-chars

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=re_your_api_key

# Wallet share encryption (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SHARE_ENCRYPTION_KEY=your-64-char-hex-key

# Stellar Network
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_FRIENDBOT_URL=https://friendbot.stellar.org
```

### Run

```bash
pnpm dev
# Open http://localhost:3000
```

### Build

```bash
pnpm build
pnpm start
```

<br>

## The Approval Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                     CHILD DASHBOARD                              │
│                                                                  │
│  Balance: 9,990.00 XLM                    [Request Spending]     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ Request: Send 10 XLM to GDEST...                       │     │
│  │ Purpose: "Buy game skin"                                │     │
│  │ Status:  ⏳ Waiting for parent approval                 │     │
│  └─────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘

                           │
                           ▼

┌──────────────────────────────────────────────────────────────────┐
│                    PARENT DASHBOARD                               │
│                                                                  │
│  Pending Requests:                                               │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ Child wants to send 10 XLM                              │     │
│  │ To: GDEST... │ Purpose: "Buy game skin"                 │     │
│  │                                                         │     │
│  │          [✓ Approve]        [✗ Deny]                    │     │
│  └─────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘

                           │ Approve clicked
                           ▼

┌──────────────────────────────────────────────────────────────────┐
│                   SERVER (< 1 second)                            │
│                                                                  │
│  1. Fetch child's encrypted share from DB                        │
│  2. Fetch parent's encrypted share from DB                       │
│  3. Decrypt both (AES-256-GCM + scrypt)                          │
│  4. shamirCombine([childShare, parentShare]) → private key       │
│  5. Keypair.fromSecret(privateKey)                               │
│  6. TransactionBuilder → Operation.payment(10 XLM)              │
│  7. transaction.sign(keypair)                                    │
│  8. POST to Stellar Horizon → tx_hash                            │
│  9. keypair.rawSecretKey().fill(0)  ← KEY DESTROYED             │
│ 10. Update DB: status='approved', tx_hash='abc123...'            │
└──────────────────────────────────────────────────────────────────┘
```

<br>

## Stellar Integration

Every Stellar interaction uses real network APIs, not simulations:

| Operation | Stellar API |
|-----------|-------------|
| **Create account** | Friendbot (`GET /friendbot?addr={key}`) |
| **Check balance** | Horizon (`GET /accounts/{key}`) |
| **Transaction history** | Horizon (`GET /accounts/{key}/payments`) |
| **Build transaction** | `TransactionBuilder` + `Operation.payment` |
| **Sign transaction** | `Keypair.fromSecret()` + `transaction.sign()` |
| **Submit transaction** | Horizon (`POST /transactions`, XDR body) |
| **Network** | Testnet (mainnet-ready with config change) |

<br>

## Deploy to Vercel

```bash
# Push to GitHub, then:
vercel --prod
```

Set these environment variables in Vercel dashboard:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string |
| `GOOGLE_CLIENT_ID` | Your Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth secret |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |
| `NEXTAUTH_SECRET` | Random 32+ char string |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |
| `RESEND_API_KEY` | Your Resend API key |
| `SHARE_ENCRYPTION_KEY` | 64 char hex string |

Add to Google Cloud Console (OAuth client):
- Authorized origin: `https://your-app.vercel.app`
- Authorized redirect: `https://your-app.vercel.app/api/auth/callback/google`

<br>

## Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| Family onboarding | Done | Google OAuth, parent invites, email delivery |
| MPC wallet creation | Done | Shamir split, AES-256-GCM encryption, Stellar keypair |
| Spend request flow | Done | Child requests, parent approves/denies |
| Real Stellar transactions | Done | Build, sign, submit to Horizon, record tx_hash |
| USDC support | Planned | Stellar USDC (Circle anchor) alongside XLM |
| Allowance automation | Planned | Scheduled weekly deposits via Stellar payments |
| SEP-24 fiat on-ramp | Planned | Parents deposit fiat → XLM/USDC via Stellar anchors |
| Mobile app | Planned | React Native + push notifications for spend requests |
| Mainnet launch | Planned | Switch from testnet to `Networks.PUBLIC` |

<br>

## Built By

**Adwait Keshari** — [GitHub](https://github.com/Adwaitbytes) · [Twitter](https://x.com/stellaraydotfun)

Also the creator of [StellaRay](https://stellaray.fun) — zero-knowledge authentication for Stellar using Protocol 25.

<br>

## License

MIT

<br>

<p align="center">
<sub>Every generation gets a new financial tool. Boomers got credit cards. Millennials got Venmo.<br>Gen Alpha gets programmable money. Fledge makes sure they're ready.</sub>
</p>
