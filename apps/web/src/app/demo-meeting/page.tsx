'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface Participant {
  id: string;
  userId: string;
  displayName: string;
  deviceId: string | null;
  trustStatus: string;
  statusReason: string | null;
  joinedAt: string;
  boundAt: string | null;
  lastChallengeAt: string | null;
  device: { id: string; hardwareBound: boolean; userId: string } | null;
}

interface AuditEvent {
  id: string;
  eventType: string;
  actor: string;
  details: any;
  createdAt: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

function getStatusClass(status: string): string {
  switch (status) {
    case 'VERIFIED': return 'verified';
    case 'FAILED': return 'failed';
    case 'STALE': return 'stale';
    default: return 'unknown';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'VERIFIED': return '✓ Verified';
    case 'FAILED': return '✗ Failed';
    case 'STALE': return '⚠ Stale';
    case 'UNKNOWN': return '? Unknown';
    case 'PENDING': return '⏳ Pending';
    default: return status;
  }
}

function getEventTypeClass(type: string): string {
  if (type.includes('PASSED') || type.includes('BOUND') || type.includes('ENROLLED')) return 'passed';
  if (type.includes('FAILED') || type.includes('NO_DEVICE')) return 'failed';
  return 'info';
}

function formatEventType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Mock participants ──────────────────────────────────────────────────
const now = new Date().toISOString();

const INITIAL_PARTICIPANTS: Participant[] = [
  {
    id: 'p-alice-real',
    userId: 'alice@troofai.com',
    displayName: 'Alice Baker',
    deviceId: 'dev-c7a1e3f0',
    trustStatus: 'PENDING',
    statusReason: null,
    joinedAt: now,
    boundAt: now,
    lastChallengeAt: null,
    device: { id: 'dev-c7a1e3f0', hardwareBound: true, userId: 'alice@troofai.com' },
  },
  {
    id: 'p-bob',
    userId: 'bob@troofai.com',
    displayName: 'Bob Chen',
    deviceId: 'dev-b8d2f4a1',
    trustStatus: 'PENDING',
    statusReason: null,
    joinedAt: now,
    boundAt: now,
    lastChallengeAt: null,
    device: { id: 'dev-b8d2f4a1', hardwareBound: true, userId: 'bob@troofai.com' },
  },
  {
    id: 'p-alice-fake',
    userId: 'alice.baker.external@gmail.com',
    displayName: 'Alice Baker',
    deviceId: null,
    trustStatus: 'PENDING',
    statusReason: null,
    joinedAt: now,
    boundAt: null,
    lastChallengeAt: null,
    device: null,
  },
];

function DemoMeetingContent() {
  const searchParams = useSearchParams();
  const meetingId = searchParams.get('id') || 'demo-live-session';

  const [participants, setParticipants] = useState<Participant[]>(INITIAL_PARTICIPANTS);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([
    { id: 'init-1', eventType: 'PARTICIPANT_JOINED', actor: 'alice@troofai.com', details: { display_name: 'Alice Baker' }, createdAt: now },
    { id: 'init-2', eventType: 'PARTICIPANT_JOINED', actor: 'bob@troofai.com', details: { display_name: 'Bob Chen' }, createdAt: now },
    { id: 'init-3', eventType: 'PARTICIPANT_JOINED', actor: 'alice.baker.external@gmail.com', details: { display_name: 'Alice Baker' }, createdAt: now },
    { id: 'init-4', eventType: 'MEETING_BINDING_BOUND', actor: 'alice@troofai.com', details: { display_name: 'Alice Baker', device_id: 'c7a1e3f0', hardware_bound: true }, createdAt: now },
    { id: 'init-5', eventType: 'MEETING_BINDING_BOUND', actor: 'bob@troofai.com', details: { display_name: 'Bob Chen', device_id: 'b8d2f4a1', hardware_bound: true }, createdAt: now },
  ]);
  const [challenging, setChallenging] = useState(false);
  const [challengeCount, setChallengeCount] = useState(0);
  const auditEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    auditEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [auditEvents]);

  const triggerChallenge = async () => {
    setChallenging(true);
    const ts = new Date().toISOString();
    const count = challengeCount + 1;
    setChallengeCount(count);

    // Phase 1: Issue challenges
    setAuditEvents(prev => [
      ...prev,
      { id: `ch-${count}-issue`, eventType: 'CHALLENGE_ISSUED', actor: 'system', details: { display_name: 'All participants' }, createdAt: ts },
    ]);

    await new Promise(r => setTimeout(r, 1200));

    // Phase 2: Alice (real) responds — VERIFIED
    const ts2 = new Date().toISOString();
    setParticipants(prev => prev.map(p =>
      p.id === 'p-alice-real' ? { ...p, trustStatus: 'VERIFIED', lastChallengeAt: ts2 } : p
    ));
    setAuditEvents(prev => [
      ...prev,
      { id: `ch-${count}-alice`, eventType: 'CHALLENGE_PASSED', actor: 'alice@troofai.com', details: { display_name: 'Alice Baker', device_id: 'c7a1e3f0', hardware_bound: true }, createdAt: ts2 },
    ]);

    await new Promise(r => setTimeout(r, 800));

    // Phase 3: Bob responds — VERIFIED
    const ts3 = new Date().toISOString();
    setParticipants(prev => prev.map(p =>
      p.id === 'p-bob' ? { ...p, trustStatus: 'VERIFIED', lastChallengeAt: ts3 } : p
    ));
    setAuditEvents(prev => [
      ...prev,
      { id: `ch-${count}-bob`, eventType: 'CHALLENGE_PASSED', actor: 'bob@troofai.com', details: { display_name: 'Bob Chen', device_id: 'b8d2f4a1', hardware_bound: true }, createdAt: ts3 },
    ]);

    await new Promise(r => setTimeout(r, 1000));

    // Phase 4: Fake Alice — FAILED
    const ts4 = new Date().toISOString();
    setParticipants(prev => prev.map(p =>
      p.id === 'p-alice-fake' ? { ...p, trustStatus: 'FAILED', lastChallengeAt: ts4, statusReason: 'No enrolled device found' } : p
    ));
    setAuditEvents(prev => [
      ...prev,
      { id: `ch-${count}-fake`, eventType: 'CHALLENGE_FAILED_NO_DEVICE', actor: 'alice.baker.external@gmail.com', details: { display_name: 'Alice Baker', reason: 'No enrolled device found for this user' }, createdAt: ts4 },
    ]);

    await new Promise(r => setTimeout(r, 500));
    setChallenging(false);
  };

  return (
    <div className="page-container">
      <header className="demo-header">
        <div className="header-brand">
          <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            Troof<span style={{ fontWeight: 400 }}>AI</span>
          </span>
          <div className="header-divider" />
          <span className="header-title">Meeting Companion</span>
        </div>
        <div className="header-status">
          <span className="status-dot" />
          <span>Live — Simulated</span>
        </div>
      </header>

      <div className="meeting-container">
        <div className="meeting-main">
          <div className="meeting-info-bar">
            <div>
              <div className="meeting-name">Board Sync — Q2 Forecast</div>
              <div className="meeting-id-label">Meeting ID: {meetingId.slice(0, 12)}...</div>
            </div>
            <button className="challenge-btn" onClick={triggerChallenge} disabled={challenging}>
              {challenging ? (
                <><span className="loading-spinner" /> Verifying...</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                  Trigger Challenge
                </>
              )}
            </button>
          </div>

          <div className="participants-grid">
            {participants.map((p) => {
              const statusClass = getStatusClass(p.trustStatus);
              const isReal = p.userId === 'alice@troofai.com' || p.userId === 'bob@troofai.com';

              return (
                <div key={p.id} className={`participant-tile ${statusClass}`}>
                  <div className={`participant-avatar ${isReal ? 'avatar-bg-alice' : 'avatar-bg-fake'}`}>
                    {p.displayName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="participant-name">{p.displayName}</div>
                  <div className="participant-email">{p.userId}</div>

                  <div className={`trust-badge ${statusClass}`}>
                    <span className="trust-icon">
                      {p.trustStatus === 'VERIFIED' ? '✓' :
                       p.trustStatus === 'FAILED' ? '✗' :
                       p.trustStatus === 'PENDING' ? '⏳' : '?'}
                    </span>
                    {getStatusLabel(p.trustStatus)}
                  </div>

                  <div className="participant-meta">
                    <div>
                      <span className="label">Device</span>
                      <span>{p.device ? `${p.device.hardwareBound ? 'HW-backed' : 'Software'} key` : 'None'}</span>
                    </div>
                    <div>
                      <span className="label">Bound</span>
                      <span>{p.boundAt ? '✓ Yes' : '✗ No'}</span>
                    </div>
                    {p.lastChallengeAt && (
                      <div>
                        <span className="label">Last challenge</span>
                        <span>{formatTime(p.lastChallengeAt)}</span>
                      </div>
                    )}
                    {p.statusReason && (
                      <div>
                        <span className="label">Reason</span>
                        <span style={{ color: 'var(--failed)' }}>{p.statusReason}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="audit-panel">
          <div className="audit-header">
            <span className="audit-title">Audit Log</span>
            <span className="audit-count">{auditEvents.length} events</span>
          </div>
          <div className="audit-list">
            {auditEvents.map((event) => (
              <div key={event.id} className="audit-event">
                <div className="audit-event-time">{formatTime(event.createdAt)}</div>
                <div>
                  <span className={`audit-event-type ${getEventTypeClass(event.eventType)}`}>
                    {formatEventType(event.eventType)}
                  </span>
                  <span className="audit-event-detail">
                    {event.details?.display_name || event.actor}
                  </span>
                </div>
                {event.details?.reason && (
                  <div className="audit-event-reason">{event.details.reason}</div>
                )}
                {event.details?.hardware_bound !== undefined && (
                  <div className="audit-event-reason">
                    Hardware-backed: {event.details.hardware_bound ? 'Yes' : 'No'}
                  </div>
                )}
              </div>
            ))}
            <div ref={auditEndRef} />
          </div>
        </div>
      </div>

      <div className="disclaimer-bar">
        ⓘ This demo uses TroofAI&apos;s internal meeting simulator. The backend is connector-ready for Zoom and Microsoft Teams.
      </div>
    </div>
  );
}

export default function DemoMeetingPage() {
  return (
    <Suspense fallback={
      <div className="setup-page">
        <div className="setup-card">
          <span className="loading-spinner" style={{ width: 24, height: 24 }} />
          <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading meeting...</p>
        </div>
      </div>
    }>
      <DemoMeetingContent />
    </Suspense>
  );
}
