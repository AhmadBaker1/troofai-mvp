# TroofAI Crypto Protocol Specification v1

> This document defines the exact cryptographic payloads and signing formats
> used in TroofAI. No component should invent crypto formats ad-hoc.

## 1. Key Generation

- **Algorithm:** RSA-2048 (PKCS#1 v1.5 for signing)
- **Provider:** Windows CNG `Microsoft Platform Crypto Provider` when TPM available, software CNG fallback
- **Key persistence:** Named CNG key `TroofAI-DeviceKey`, persisted across app restarts
- **Public key format:** PEM (SubjectPublicKeyInfo / SPKI)

## 2. Device Enrollment

Agent → Hub via REST `POST /devices/enroll`

```json
{
  "tenant_id": "string (UUID of tenant)",
  "device_id": "string (UUID, generated once by agent)",
  "user_id": "string (e.g. alice@troofai.com)",
  "display_name": "string (e.g. Alice Baker)",
  "public_key_pem": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----",
  "key_algorithm": "RSA-2048",
  "hardware_bound": true | false,
  "agent_version": "1.0.0"
}
```

Hub stores the **full public key PEM** (not just a hash).

## 3. Meeting-Presence Binding (join_token flow)

### 3a. Hub issues join_token

Dashboard → Hub `POST /meetings/:id/join-token`

```json
{ "participant_id": "string (UUID)" }
```

Hub returns:

```json
{
  "join_token": "string (UUID, one-time use)",
  "meeting_id": "string",
  "participant_id": "string",
  "expires_at": "ISO8601 (now + 30s)"
}
```

Token stored in Redis with 30s TTL.

### 3b. Dashboard passes token to local companion

Dashboard → Agent via `POST http://localhost:9876/bind`

```json
{
  "join_token": "string",
  "meeting_id": "string",
  "participant_id": "string",
  "expires_at": "ISO8601"
}
```

### 3c. Agent signs and dashboard sends to Hub

Agent signs the following **newline-delimited string**:

```
{join_token}\n{meeting_id}\n{participant_id}\n{device_id}\n{expires_at}
```

Agent returns to dashboard:

```json
{
  "join_token": "string",
  "device_id": "string",
  "signature": "base64(RSA-SHA256(signing_string))"
}
```

Dashboard → Hub `POST /meetings/:id/bind`

```json
{
  "join_token": "string",
  "device_id": "string",
  "signature": "base64"
}
```

Hub verifies signature using device's stored public key, then binds
`participant_id ↔ device_id` for that meeting.

## 4. Challenge-Response

### 4a. Hub issues challenge

Hub → Agent via WebSocket event `challenge:issue`

```json
{
  "challenge_id": "string (UUID)",
  "nonce": "string (base64, 32 random bytes)",
  "meeting_id": "string",
  "participant_id": "string",
  "issued_at": "ISO8601",
  "expires_at": "ISO8601 (issued_at + 10s)"
}
```

Challenge stored in Redis with 15s TTL (10s expiry + 5s grace).

### 4b. Agent signs challenge

Agent constructs the following **newline-delimited string** (10 lines):

```
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
```

Lines joined by literal `\n`. No trailing newline.

Agent signs with `RSA-SHA256` using its private key.

### 4c. Agent sends response

Agent → Hub via WebSocket event `challenge:response`

```json
{
  "challenge_id": "string",
  "device_id": "string",
  "signature": "base64(RSA-SHA256(signing_string))"
}
```

### 4d. Hub verifies

1. Fetch challenge from Redis by `challenge_id`
2. Check `expires_at > now()`
3. Check `device_id` matches stored challenge
4. Construct identical signing string
5. Verify RSA-SHA256 signature against device's stored public key
6. Delete challenge from Redis (one-time use, replay protection)
7. Run policy engine
8. Update participant trust status
9. Emit `meeting:status-update` to dashboard
10. Log to audit

## 5. Policy Engine

Inputs:
- `device.status` — ACTIVE or REVOKED
- `device.lastHeartbeat` — timestamp
- `signatureValid` — boolean
- `challengeExpired` — boolean
- `hasMeetingBinding` — boolean

Rules (evaluated in order, first match wins):

| Condition | Result |
|-----------|--------|
| device.status ≠ ACTIVE | FAILED — "Device has been revoked" |
| challengeExpired | FAILED — "Challenge response expired" |
| signatureValid = false | FAILED — "Invalid signature" |
| hasMeetingBinding = false | UNKNOWN — "No meeting-presence binding" |
| lastHeartbeat > 5 min ago | STALE — "Device heartbeat stale" |
| All pass | VERIFIED |

## 6. Trust Status Values

| Status | Meaning |
|--------|---------|
| VERIFIED | Enrolled device, valid signature, fresh heartbeat, bound to meeting |
| UNVERIFIED | Participant present but no verification attempted yet |
| STALE | Device enrolled but heartbeat is old |
| UNKNOWN | No device binding for this participant |
| EXTERNAL | No enrollment found for this user in this tenant |
| FAILED | Challenge failed (bad sig, expired, revoked device) |
