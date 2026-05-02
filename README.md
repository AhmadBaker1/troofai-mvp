<p align="center">
  <img src="apps/web/public/troofai-logo-white.svg" alt="TroofAI Logo" width="200" />
</p>

<h1 align="center">TroofAI — Trust, made provable.</h1>

<p align="center">
  <strong>Hardware-backed identity verification for video meetings.</strong><br/>
  Stop deepfakes and impersonators with cryptographic proof tied to physical devices.
</p>

<p align="center">
  <a href="https://troofai.com">Website</a> ·
  <a href="#demo">Live Demo</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#getting-started">Getting Started</a>
</p>

---

## The Problem

AI-generated deepfakes are making it impossible to trust who's really on a video call. A single spoofed executive on a board call can authorize wire transfers, leak strategy, or impersonate leadership — and today's meeting platforms have **zero** way to prove a participant is who they claim to be.

## The Solution

TroofAI binds every participant's identity to a **hardware-backed cryptographic key** stored in their device's TPM (Trusted Platform Module). During a meeting, TroofAI silently issues challenges that only the real device can sign — if a participant can't prove they're on an enrolled device, they're flagged in real-time.

**No deepfake can sign a TPM challenge.**

---

## Demo

The MVP ships with a fully self-contained demo mode (no backend required). All pages fall back to high-fidelity mock data when the Hub API is unreachable, making it perfect for evaluation and Vercel deployment.

### Key Demo Flows

| Flow | Description |
|------|-------------|
| **Dashboard** (`/dashboard`) | Real-time trust overview — enrolled devices, verification rates, threat alerts, recent meetings |
| **Device Enrollment** (`/enrollment`) | Interactive TPM key-binding animation showing how hardware-backed keys are generated |
| **Meeting Simulator** (`/demo-meeting`) | Live challenge-response demo: verified users pass, impersonators get flagged |
| **Meetings** (`/meetings`) | Meeting history with per-participant trust scores and verification status |
| **Device Fleet** (`/devices`) | Enrolled device management — TPM vs software keys, heartbeat status, key algorithms |
| **Audit Log** (`/audit`) | Complete cryptographic verification trail for compliance and forensics |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        TroofAI Platform                     │
├───────────────┬──────────────────┬──────────────────────────┤
│  apps/web     │  services/hub-api │  agent/windows           │
│  Next.js 16   │  NestJS 10       │  .NET (C#)               │
│  React 19     │  Prisma ORM      │  TPM 2.0 integration     │
│  Dashboard UI │  PostgreSQL      │  RSA-2048 key management │
│               │  Redis           │  WebSocket client         │
│               │  WebSocket       │                           │
└───────────────┴──────────────────┴──────────────────────────┘
```

### Verification Protocol

```
1. ENROLL    Device generates RSA-2048 key pair inside TPM
             → Public key sent to Hub, private key never leaves hardware

2. BIND      Participant joins meeting
             → Dashboard requests join token → Agent signs it → Hub verifies

3. CHALLENGE Hub issues cryptographic nonce to all participants
             → Agent signs with TPM-backed private key → Hub verifies signature

4. VERDICT   ✓ VERIFIED  — Signature valid, device enrolled, heartbeat fresh
             ✗ FAILED    — No device, bad signature, or expired challenge
```

> Full protocol specification: [`SPEC.md`](./SPEC.md)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Backend API** | NestJS 10, Fastify, Prisma ORM |
| **Database** | PostgreSQL 16 |
| **Cache / Challenges** | Redis 7 |
| **Real-time** | Socket.IO (WebSocket) |
| **Device Agent** | .NET / C# with Windows CNG (TPM 2.0) |
| **Crypto** | RSA-2048, SHA-256 (PKCS#1 v1.5) |

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Docker** (for PostgreSQL & Redis — only needed for full backend)

### Quick Start (Demo Mode — No Backend Required)

```bash
# Clone the repo
git clone https://github.com/AhmadBaker1/troofai-mvp.git
cd troofai-mvp

# Install dependencies
npm install
cd apps/web && npm install

# Start the dashboard
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the app automatically falls back to demo data.

### Full Stack (with Backend)

```bash
# Start PostgreSQL & Redis
docker compose up -d

# Install and setup the Hub API
cd services/hub-api
npm install
npx prisma migrate dev --name init
npx prisma generate
npm run start:dev

# In a new terminal — start the frontend
cd apps/web
npm run dev
```

---

## Project Structure

```
troofai-mvp/
├── apps/
│   └── web/                    # Next.js dashboard (frontend)
│       └── src/
│           ├── app/
│           │   ├── dashboard/      # Trust overview
│           │   ├── devices/        # Device fleet management
│           │   ├── meetings/       # Meeting history
│           │   ├── enrollment/     # Device enrollment flow
│           │   ├── demo-meeting/   # Live meeting simulator
│           │   ├── audit/          # Audit log
│           │   └── zoom-meeting/   # Zoom SDK integration
│           └── components/
│               └── DashboardLayout.tsx
├── services/
│   └── hub-api/                # NestJS backend API
│       ├── prisma/                 # Database schema & migrations
│       └── src/
│           ├── device/             # Device enrollment & management
│           ├── meeting/            # Meeting lifecycle
│           ├── challenge/          # Challenge-response protocol
│           ├── audit/              # Audit trail
│           ├── auth/               # Tenant authentication
│           ├── gateway/            # WebSocket events
│           ├── policy/             # Trust policy engine
│           └── stats/              # Dashboard statistics
├── agent/
│   └── windows/                # Windows companion agent (.NET)
│       └── TroofAI.Companion/
│           └── Services/
│               ├── KeyService.cs           # TPM key generation
│               ├── BindingService.cs        # Meeting-presence binding
│               ├── ChallengeSigningService.cs  # Challenge signing
│               ├── EnrollmentService.cs     # Device enrollment
│               └── WebSocketService.cs      # Hub communication
├── docker-compose.yml          # PostgreSQL + Redis
├── SPEC.md                     # Crypto protocol specification
└── package.json                # Workspace root
```

---

## Deployment (Vercel)

The Next.js frontend deploys directly to Vercel:

1. Import the repo on [vercel.com](https://vercel.com)
2. Set **Root Directory** to `apps/web`
3. Framework Preset: **Next.js** (auto-detected)
4. Deploy ✓

The app runs entirely in demo mode on Vercel — no backend configuration needed.

---

## Trust Status Reference

| Status | Meaning |
|--------|---------|
| ✓ **VERIFIED** | Enrolled device, valid signature, fresh heartbeat, bound to meeting |
| ⏳ **PENDING** | Verification not yet attempted |
| ⚠ **STALE** | Device enrolled but heartbeat is old |
| ? **UNKNOWN** | No device binding for this participant |
| 🌐 **EXTERNAL** | No enrollment found for this user in this tenant |
| ✗ **FAILED** | Challenge failed — bad signature, expired, or revoked device |

---

## License

Proprietary — © 2026 TroofAI. All rights reserved.

---

<p align="center">
  <strong>TroofAI</strong> — Because trust shouldn't be optional.<br/>
  <a href="https://troofai.com">troofai.com</a>
</p>
