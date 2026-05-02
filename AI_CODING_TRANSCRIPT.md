# TroofAI MVP Build Using Antigravity (AI Coding Transcript)
### Antigravity (Google DeepMind Agentic Coding Agent) · April 2026

---

> **TroofAI started as an MVP I built during the KPMG Innovation Hackathon. I then used Antigravity (Google DeepMind coding agent) to accelerate the next iteration for YC — taking the core cryptographic concept and building it into a full-stack working prototype with NestJS backend, Next.js dashboard, Windows TPM-backed companion agent, and challenge-response verification. This transcript shows how I used AI to accelerate execution while retaining ownership of architecture, security design, and product decisions.**

---

> **Submitted by:** Ahmad Baker  
> **Tool:** Antigravity by Google DeepMind (Claude Opus 4.6 Thinking)  
> **Project:** TroofAI — Cryptographic trust layer for enterprise video meetings  
> **Date Range:** April 5–13, 2026  
> **Result:** Full-stack working prototype with real cryptography (TPM-backed RSA-2048) and a 90-second YC demo

---

## What Is TroofAI?

TroofAI is a **cryptographic trust layer for high-stakes meetings**. It proves which video call participants are joining from company-enrolled devices bound to their corporate identity, in real time — stopping deepfake impersonation at the infrastructure level.

**The core loop:** `Enroll Device → Join Meeting → Bind Identity → Challenge → Verify → Audit`

### Origin: KPMG Innovation Hackathon → YC

TroofAI wasn't born in this AI coding session. I originally built the MVP during the **KPMG Innovation Hackathon**, where the core concept — hardware-backed cryptographic identity verification for video calls — was validated by enterprise judges familiar with real corporate security gaps.

What you see in this transcript is the **next iteration**: taking that hackathon prototype and rebuilding it into a production-grade demo for YC Summer 2026, using AI coding tools to move at solo-founder speed. The crypto protocol, the trust model, and the product vision were mine from the start — the AI accelerated the engineering.

---

## What We Built (Me + AI)

| Component | Tech Stack | Who Led | Key Output |
|-----------|-----------|---------|------------|
| **Crypto Protocol Spec** | Markdown | **Me** — authored SPEC.md from hackathon | Deterministic signing format, policy engine rules, trust status model |
| **Hub API** (backend) | NestJS + Fastify + Prisma + PostgreSQL + Redis | **Me + AI** — I designed the architecture & API contracts, AI implemented | 10 modules: auth, device, meeting, challenge, policy, audit, gateway, prisma, redis, stats |
| **Windows Companion Agent** | C# .NET 8 + CNG/TPM | **Me + AI** — I specified TPM/CNG requirement & signing flow, AI implemented | 5 services: KeyService, EnrollmentService, WebSocketService, ChallengeSigningService, BindingService |
| **Admin Dashboard** | Next.js + React + TypeScript | **Me + AI** — I designed pages & UX, AI implemented & QA'd | 7 pages: landing, dashboard, devices, meetings, audit, demo-meeting, enrollment |
| **Infrastructure** | Docker Compose | **Me + AI** — I chose Postgres + Redis, AI scaffolded | PostgreSQL 16 + Redis 7 |

**~6,700 lines of working prototype code across 3 languages (TypeScript, C#, SQL/Prisma)**

---

## How I Used AI: The Workflow

I treated the AI as a senior engineer I was pairing with — I brought the domain knowledge, the crypto protocol, and the product vision. The AI brought speed and breadth across three languages.

1. **I fed the AI my existing work** → the SPEC.md crypto protocol I'd written, the KPMG hackathon MVP architecture, and the TroofAI brand system
2. **I set the constraints** → Windows-first, TPM-backed keys, honest claims (no attestation overclaiming), neutral meeting UI
3. **The AI proposed an implementation plan** → 601-line plan with architecture diagrams
4. **I reviewed the plan line-by-line** → caught the Zoom-clone idea and redirected to neutral UI, validated the crypto flow against my spec, confirmed the policy engine rules matched my threat model
5. **The AI built while I monitored** → I reviewed code output, flagged issues, and course-corrected in real time
6. **I debugged integration issues alongside the AI** → WebSocket connectivity, CORS, cross-language signing format alignment between Node.js and C#
7. **The AI QA'd visually** → used browser automation; I reviewed the screenshots and directed styling changes
8. **I validated the end-to-end trust loop** → made sure the crypto was actually correct, not just compiling

---

## The MVP Build Session (April 12–13)

This was the core build — ~8 hours, one session. Everything below happened in a single continuous AI conversation.

### Phase 1: Research & Planning (45 min)

**What I brought to the table:** I had already written the crypto protocol spec (SPEC.md) defining the exact signing format, challenge-response flow, and policy engine rules from the KPMG hackathon. I also had the trust status model (VERIFIED/STALE/UNKNOWN/EXTERNAL/FAILED) designed based on real enterprise threat scenarios I'd researched.

I fed this to the AI and it asked clarifying questions:
- "What platform? Windows or macOS?" → I chose Windows (enterprise-first, TPM access)
- "Docker Desktop available?" → Yes
- "Should the meeting UI clone Zoom or be neutral?" → I chose neutral TroofAI simulator (avoids trademark issues, keeps focus on the trust layer)
- "Solo demo or multi-device?" → Solo (scope control for a one-person team)

The AI then produced a **601-line implementation plan**. I reviewed it line-by-line, validated the crypto flow against my spec, confirmed the database schema captured the right relationships, and approved.

**Key decision I made here:** The AI proposed canonical JSON for cross-language signing. I agreed with its own counterpoint that this would be a bug factory between Node.js and C#, and we locked in the newline-delimited format from my original spec.

### Phase 2: Hub API Build (2 hours)

Built the entire NestJS backend:

```
services/hub-api/src/
├── auth/           # API key guard
├── device/         # POST /devices/enroll
├── meeting/        # CRUD + participants + join-token + bind
├── challenge/      # Nonce gen, Redis TTL, RSA-SHA256 verification
├── policy/         # Rule engine (VERIFIED/STALE/UNKNOWN/EXTERNAL/FAILED)
├── audit/          # Full crypto audit trail (JSONB events)
├── gateway/        # WebSocket gateway for real-time
├── prisma/         # Schema + migrations + seed
├── redis/          # Challenge TTL store
├── stats/          # Dashboard aggregation
├── app.module.ts
└── main.ts
```

**Key decisions the AI made:**
- Used Fastify instead of Express for performance
- Stored challenges in Redis with 15s TTL (10s expiry + 5s grace) for replay protection
- Created a deterministic newline-delimited signing format instead of canonical JSON (avoiding cross-language parsing bugs between Node.js and C#)

### Phase 3: Windows Companion Agent (1.5 hours)

Built the C# .NET 8 console application:

```
agent/windows/TroofAI.Companion/
├── Program.cs                    # Entry point, CLI menu
├── Services/
│   ├── KeyService.cs             # CNG key gen + TPM-backed signing
│   ├── EnrollmentService.cs      # REST enrollment with Hub
│   ├── WebSocketService.cs       # Persistent WS + auto-reconnect
│   ├── ChallengeSigningService.cs # Sign challenges per SPEC.md
│   └── BindingService.cs         # localhost HTTP for join_token binding
└── TroofAI.Companion.csproj
```

**Key AI behavior:** Correctly used `CngProvider.MicrosoftPlatformCryptoProvider` for hardware-backed key generation where TPM is available, with a graceful software fallback. This is non-trivial Windows platform API work.

### Phase 4: Admin Dashboard (2.5 hours)

Built 5 complete admin pages plus an enrollment wizard:

| Page | What it shows |
|------|--------------|
| `/dashboard` | Threat alert banner, 4 stat cards, recent meetings, enrolled devices |
| `/devices` | Device fleet table with TPM badges, heartbeat status, enrollment dates |
| `/meetings` | Meeting history with trust score bars, verified/failed pill counts |
| `/audit` | Full cryptographic audit trail with timestamps and event types |
| `/demo-meeting` | Live meeting view with participant tiles, trust badges, challenge button |

**Key AI behavior:** Used **browser automation** to spin up the dev server, navigate to each page, take screenshots, and iterate on styling issues it found visually. It functionally QA'd its own work.

### Phase 5: End-to-End Integration (1 hour)

- Connected all three services (Next.js ↔ NestJS ↔ C# Agent)
- Debugged WebSocket connectivity issues
- Fixed CORS between Next.js and NestJS
- Tested the full trust loop end-to-end
- Created a dashboard recording (WebP video)

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Participant Machine                        │
│                                                              │
│  ┌──────────────────┐   localhost    ┌───────────────────┐   │
│  │  TroofAI Demo    │◄─────────────►│ TroofAI Companion │   │
│  │  Meeting Page    │  join_token    │   (C# .NET 8)     │   │
│  │  (Next.js)       │               │                    │   │
│  │                  │               │ • CNG/TPM-backed   │   │
│  │  • meeting_id    │               │   signing key      │   │
│  │  • participant_id│               │ • WebSocket to Hub │   │
│  │  • join_token    │               │ • Challenge signer │   │
│  └──────────────────┘               └────────┬──────────┘   │
│                                              │ WS           │
└──────────────────────────────────────────────┼──────────────┘
                                               │
                                               ▼
┌──────────────────────────────────────────────────────────────┐
│                       TroofAI Hub                            │
│                  (NestJS + Fastify, modular monolith)        │
│                                                              │
│  ┌──────────┐ ┌────────────────┐ ┌────────────────┐        │
│  │  Auth     │ │ Device Registry│ │  Challenge     │        │
│  │ (API key) │ │                │ │   Service      │        │
│  └──────────┘ └────────────────┘ └────────────────┘        │
│  ┌───────────┐ ┌────────────────┐ ┌────────────────┐       │
│  │  Meeting   │ │  Policy Engine │ │  Audit Log     │       │
│  │  Connector │ │                │ │                │       │
│  └───────────┘ └────────────────┘ └────────────────┘       │
│           │                                    │            │
│     ┌─────┴─────┐                    ┌────────┴────────┐   │
│     │ PostgreSQL │                    │      Redis      │   │
│     │ (durable)  │                    │  (TTL/nonces)   │   │
│     └───────────┘                    └─────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Key Design Decisions (AI-Human Collaboration)

| Decision | AI Proposed | I Chose | Why |
|----------|-----------|---------|-----|
| Signing format | Canonical JSON | Newline-delimited string | AI identified canonical JSON between Node.js and C# is "a two-day bug factory" |
| Meeting UI | Zoom-like clone | Neutral TroofAI simulator | Avoids trademark issues, focuses on the trust layer |
| Key storage | Software RSA | CNG with TPM fallback | AI correctly identified `MicrosoftPlatformCryptoProvider` for hardware binding |
| Challenge TTL | 5 seconds | 10s + 5s grace (15s Redis TTL) | AI suggested grace period for network latency |
| Attestation claims | Full TPM attestation | Honest "enrolled device-bound signing key" | AI flagged overclaiming — we're not doing PCR quotes in MVP |

---

## Crypto Protocol (Human-Defined, AI-Enforced)

```
Signed material (deterministic string, NOT JSON):

troofai-v1
{challenge_id}
{tenant_id}
{device_id}
{user_id}
{meeting_id}
{participant_id}
{nonce}
{issued_at}
{expires_at}

Lines joined by \n. Both C# and Node construct this exact string.
Device signs with RSA-SHA256. Hub verifies with stored public key.
```

### Policy Engine Rules
```
VERIFIED if ALL:
  - device.status == ACTIVE
  - device.last_heartbeat > now() - 5min
  - participant.device_id IS NOT NULL (binding exists)
  - challenge.signature VALID
  - challenge.responded_at < challenge.expires_at

STALE if: device enrolled but last_heartbeat > 5min ago
UNKNOWN if: participant has no device binding
EXTERNAL if: no enrollment found for this user_id
FAILED if: challenge signature invalid OR expired
```

---

## Task Tracking (AI-Managed)

The AI maintained a live task checklist throughout the build:

```markdown
## Phase 1: Foundation & Hub API
- [x] Create monorepo structure + root configs
- [x] Write SPEC.md crypto protocol
- [x] Set up docker-compose (Postgres + Redis)
- [x] Scaffold NestJS + Fastify + Prisma
- [x] Implement Prisma schema + migrations
- [x] Implement device enrollment endpoint
- [x] Implement meeting CRUD + participants
- [x] Implement challenge service (nonce gen, Redis TTL, signature verification)
- [x] Implement policy engine
- [x] Implement WebSocket gateway
- [x] Implement audit logging

## Phase 2: Windows Companion Agent
- [x] Create C# .NET 8 project
- [x] Implement KeyService (CNG key gen — TPM backed!)
- [x] Implement EnrollmentService (REST enrollment)
- [x] Implement WebSocketService (persistent connection + heartbeat)
- [x] Implement ChallengeSigningService (sign challenges per SPEC.md)
- [x] Implement BindingService (localhost HTTP for join_token)

## Phase 3: Next.js Demo Meeting UI
- [x] Create Next.js app with TroofAI branding
- [x] Build demo-meeting page layout
- [x] Build ParticipantTile + TrustBadge components
- [x] Build AuditPanel + ChallengeButton
- [x] Implement WebSocket client for real-time updates

## Phase 4: Integration + Demo Polish
- [x] Full flow: enroll → join → bind → challenge → verdict
- [x] Add "fake Alice" as external participant
```

---

## What The AI Did Well

- **Cross-language crypto:** Got the deterministic signing format correct between TypeScript and C# on the first try
- **Platform-specific APIs:** Correctly used Windows CNG/TPM APIs for hardware-backed key generation
- **Architecture decisions:** Proactively identified the "participant-to-device binding" gap — the system needs to prove not just "a device exists" but "this device is backing this participant in this meeting"
- **Honest claims:** Flagged that claiming "TPM attestation" would be overclaiming — we do device-bound signing, not PCR attestation
- **Visual QA:** Used browser automation to find and fix styling issues I hadn't noticed
- **Speed:** Built 10 NestJS modules, 5 C# services, and 7 React pages in a single session

## My Role: What I Built, Decided, and Caught

**Before the AI touched anything:**
- Built the original MVP at the **KPMG Innovation Hackathon** — the concept, trust model, and crypto protocol were mine
- Authored **SPEC.md** — the deterministic signing format, policy engine rules, and trust status taxonomy
- Designed the threat model: what "verified" actually means in an enterprise meeting context
- Researched Windows CNG/TPM APIs to know what was possible before specifying it

**During the build:**
- Reviewed the 601-line implementation plan line-by-line before approving
- Chose Windows-first (enterprise market), neutral UI (not Zoom clone), and honest attestation claims
- Specified that TPM-backed keys were a hard requirement, not a nice-to-have
- Debugged WebSocket connectivity and CORS issues alongside the AI
- Validated the end-to-end crypto flow worked correctly (not just compiled)
- Cut scope aggressively: no glassmorphism, no multi-device demo, no AI/deepfake detection — focus the demo on the one thing that matters

**The takeaway:** I used AI to accelerate execution while retaining ownership of architecture, security design, and product decisions. The AI brought speed across three languages and the ability to scaffold a modular backend in hours instead of days — but the crypto spec, the threat model, and every critical judgment call were mine.

Also used the tool for minor website improvements (mobile UI, asset cleanup, Cloudflare deployment, SEO fixes).

---

## Summary

| Metric | Value |
|--------|-------|
| **Build time** | ~8 hours of active coding |
| **Languages** | TypeScript, C#, SQL, CSS |
| **Backend** | 10 NestJS modules |
| **Frontend** | 7 routes |
| **Agent** | 5 C# services |
| **Database** | 5 tables (Prisma/PostgreSQL) |
| **Crypto** | RSA-2048 with TPM-backed keys |
| **Real-time** | WebSocket gateway, 5 event types |
| **AI tool** | Antigravity by Google DeepMind |
| **Planning** | 601-line implementation plan, live task tracker, walkthrough doc |

---

*Exported from Antigravity (Google DeepMind's agentic AI coding assistant) on April 26, 2026.*
