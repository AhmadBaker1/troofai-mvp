'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { io } from 'socket.io-client';

const HUB_URL = 'http://localhost:3001';

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
  device: {
    id: string;
    hardwareBound: boolean;
    userId: string;
  } | null;
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

function getStatusClass(s: string) {
  if (s === 'VERIFIED') return 'verified';
  if (s === 'FAILED') return 'failed';
  if (s === 'STALE') return 'stale';
  return 'unknown';
}

function getStatusLabel(s: string) {
  if (s === 'VERIFIED') return '✓ Verified';
  if (s === 'FAILED') return '✗ Failed';
  if (s === 'STALE') return '⚠ Stale';
  return '? Pending';
}

function getEventTypeClass(t: string) {
  if (t.includes('PASSED') || t.includes('BOUND') || t.includes('ENROLLED')) return 'passed';
  if (t.includes('FAILED') || t.includes('NO_DEVICE')) return 'failed';
  return 'info';
}

// ======== Demo participant presets ========
const DEMO_PARTICIPANTS = [
  { user_id: 'alice@troofai.com', display_name: 'Alice Baker', isEnrolled: true },
  { user_id: 'ahmad@troofai.com', display_name: 'Ahmad Baker', isEnrolled: false },
  { user_id: 'alice.baker.external@gmail.com', display_name: 'Alice Baker (External)', isEnrolled: false },
];

function ZoomMeetingContent() {
  const searchParams = useSearchParams();
  const zoomNumber = searchParams.get('zoom') || '';
  const zoomPwd = searchParams.get('pwd') || '';

  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [challenging, setChallenging] = useState(false);
  const [phase, setPhase] = useState<'setup' | 'ready' | 'live'>('setup');
  const [setupLog, setSetupLog] = useState<string[]>([]);
  const auditEndRef = useRef<HTMLDivElement>(null);
  const setupDone = useRef(false);

  const addLog = (msg: string) => setSetupLog(prev => [...prev, msg]);

  // ======== Auto-setup ========
  useEffect(() => {
    if (setupDone.current) return;
    setupDone.current = true;

    (async () => {
      try {
        addLog('Connecting to TroofAI Hub...');
        const tenantRes = await fetch(`${HUB_URL}/tenants/demo`);
        const td = await tenantRes.json();
        setTenantId(td.tenant_id);
        addLog(`Tenant: ${td.tenant_id.slice(0, 8)}...`);

        addLog('Creating verified meeting session...');
        const meetingRes = await fetch(`${HUB_URL}/meetings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenant_id: td.tenant_id,
            name: zoomNumber ? `Zoom ${zoomNumber}` : 'TroofAI Demo Meeting',
          }),
        });
        const md = await meetingRes.json();
        const mid = md.meeting.id;
        addLog(`Meeting: ${mid.slice(0, 8)}...`);

        // Add participants
        const enrolledParticipantIds: string[] = [];
        for (const p of DEMO_PARTICIPANTS) {
          const pRes = await fetch(`${HUB_URL}/meetings/${mid}/participants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: p.user_id, display_name: p.display_name }),
          });
          const pd = await pRes.json();
          addLog(`+ ${p.display_name} (${p.user_id})`);
          if (p.isEnrolled) enrolledParticipantIds.push(pd.participant.id);
        }

        // Bind enrolled devices
        for (const pid of enrolledParticipantIds) {
          try {
            const tokenRes = await fetch(`${HUB_URL}/meetings/${mid}/join-token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ participant_id: pid }),
            });
            const tokenData = await tokenRes.json();

            const bindRes = await fetch('http://localhost:9876/bind', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                join_token: tokenData.join_token,
                meeting_id: tokenData.meeting_id,
                participant_id: tokenData.participant_id,
                expires_at: tokenData.expires_at,
              }),
            });
            const bindData = await bindRes.json();

            await fetch(`${HUB_URL}/meetings/${mid}/bind`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                join_token: bindData.join_token,
                device_id: bindData.device_id,
                signature: bindData.signature,
              }),
            });
            addLog(`🔒 Device bound (TPM) for ${pid.slice(0, 8)}...`);
          } catch {
            addLog(`⚠ Agent not reachable — skipping bind for ${pid.slice(0, 8)}...`);
          }
        }

        setMeetingId(mid);
        setPhase('ready');
        addLog('✓ Meeting ready — click "Go Live" to start verification');
      } catch (e: any) {
        addLog(`Error: ${e.message}`);
      }
    })();
  }, [zoomNumber]);

  // ======== Data fetching ========
  const fetchData = useCallback(async () => {
    if (!meetingId) return;
    try {
      const [mRes, aRes] = await Promise.all([
        fetch(`${HUB_URL}/meetings/${meetingId}`),
        fetch(`${HUB_URL}/audit/meeting/${meetingId}`),
      ]);
      setParticipants((await mRes.json()).participants || []);
      setAuditEvents((await aRes.json()) || []);
    } catch {}
  }, [meetingId]);

  useEffect(() => {
    if (!meetingId) return;
    const ws = io(HUB_URL, { transports: ['websocket', 'polling'] });
    ws.on('connect', () => ws.emit('meeting:subscribe', { meeting_id: meetingId }));
    ws.on('meeting:status-update', fetchData);
    return () => { ws.disconnect(); };
  }, [meetingId, fetchData]);

  useEffect(() => {
    fetchData();
    const i = setInterval(fetchData, 3000);
    return () => clearInterval(i);
  }, [fetchData]);

  useEffect(() => {
    auditEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [auditEvents]);

  const triggerChallenge = async () => {
    if (!meetingId) return;
    setChallenging(true);
    try {
      await fetch(`${HUB_URL}/challenges/meeting/${meetingId}`, { method: 'POST' });
      setTimeout(() => { fetchData(); setChallenging(false); }, 2000);
    } catch { setChallenging(false); }
  };

  const goLive = () => setPhase('live');

  const verifiedCount = participants.filter(p => p.trustStatus === 'VERIFIED').length;
  const failedCount = participants.filter(p => p.trustStatus === 'FAILED').length;
  const unknownCount = participants.filter(p => p.trustStatus === 'UNKNOWN').length;

  return (
    <div className="zoom-page">
      {/* Top bar */}
      <div className="zoom-topbar">
        <div className="zoom-topbar-brand">
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
            Troof<span style={{ fontWeight: 400 }}>AI</span>
          </span>
          <span className="zoom-topbar-divider" />
          <span className="zoom-topbar-label">Meeting Verification</span>
        </div>
        <div className="zoom-topbar-right">
          {phase === 'live' && (
            <>
              <span className="zoom-topbar-dot" />
              <span className="zoom-topbar-label" style={{ color: '#ef4444' }}>LIVE</span>
            </>
          )}
          {zoomNumber && (
            <span className="zoom-topbar-label" style={{ marginLeft: 16 }}>
              Zoom Meeting: {zoomNumber.replace(/(\d{3})(\d{4})(\d{4})/, '$1 $2 $3')}
            </span>
          )}
        </div>
      </div>

      <div className="zoom-layout">
        {/* LEFT: Meeting context area */}
        <div className="zoom-video-area">
          {phase === 'setup' && (
            <div className="meeting-context-panel">
              <div className="context-header">
                <div className="context-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                </div>
                <h2>Initializing Verification Session</h2>
              </div>
              <div className="setup-log">
                {setupLog.map((msg, i) => (
                  <div key={i} className="setup-log-item">{msg}</div>
                ))}
                <div className="setup-log-cursor" />
              </div>
            </div>
          )}

          {phase === 'ready' && (
            <div className="meeting-context-panel">
              <div className="context-header">
                <div className="context-icon ready">✓</div>
                <h2>Verification Session Ready</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 8, fontSize: '0.85rem' }}>
                  {participants.length} participants enrolled. Open your Zoom meeting and click Go Live.
                </p>
              </div>

              {zoomNumber && (
                <div className="zoom-join-card">
                  <div className="zoom-join-icon">📹</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>
                      Zoom Meeting: {zoomNumber.replace(/(\d{3})(\d{4})(\d{4})/, '$1 $2 $3')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                      Open your Zoom app and join this meeting, then click Go Live below
                    </div>
                  </div>
                </div>
              )}

              <button className="go-live-btn" onClick={goLive}>
                <span className="go-live-dot" />
                Go Live — Start Monitoring
              </button>
            </div>
          )}

          {phase === 'live' && (
            <div className="meeting-context-panel live">
              <div className="live-status-grid">
                <div className="live-stat-card">
                  <div className="live-stat-value" style={{ color: 'var(--verified)' }}>{verifiedCount}</div>
                  <div className="live-stat-label">Verified</div>
                </div>
                <div className="live-stat-card">
                  <div className="live-stat-value" style={{ color: 'var(--failed)' }}>{failedCount}</div>
                  <div className="live-stat-label">Failed</div>
                </div>
                <div className="live-stat-card">
                  <div className="live-stat-value" style={{ color: 'var(--stale)' }}>{unknownCount}</div>
                  <div className="live-stat-label">Pending</div>
                </div>
                <div className="live-stat-card">
                  <div className="live-stat-value">{participants.length}</div>
                  <div className="live-stat-label">Total</div>
                </div>
              </div>

              {zoomNumber && (
                <div className="zoom-active-badge">
                  <span className="zoom-topbar-dot" />
                  Connected to Zoom {zoomNumber.replace(/(\d{3})(\d{4})(\d{4})/, '$1 $2 $3')}
                </div>
              )}

              <div className="live-meeting-name">
                {zoomNumber ? `Zoom ${zoomNumber.replace(/(\d{3})(\d{4})(\d{4})/, '$1 $2 $3')}` : 'TroofAI Demo Meeting'}
              </div>

              <div className="live-participants-detail">
                {participants.map((p) => {
                  const sc = getStatusClass(p.trustStatus);
                  return (
                    <div key={p.id} className={`live-p-card ${sc}`}>
                      <div className={`live-p-avatar ${p.device ? 'enrolled' : 'external'}`}>
                        {p.displayName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="live-p-info">
                        <div className="live-p-name">{p.displayName}</div>
                        <div className="live-p-email">{p.userId}</div>
                        {p.device && (
                          <div className="live-p-device">
                            Device: {p.device.id.slice(0, 8)}...
                            {p.device.hardwareBound && <span className="live-tpm-tag">TPM</span>}
                          </div>
                        )}
                        {!p.device && p.trustStatus !== 'VERIFIED' && (
                          <div className="live-p-device" style={{ color: 'var(--stale)' }}>
                            ⚠ No enrolled device detected
                          </div>
                        )}
                      </div>
                      <div className={`live-p-badge ${sc}`}>
                        {getStatusLabel(p.trustStatus)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: TroofAI verification panel */}
        <div className="verification-panel">
          {/* Threat banner */}
          {failedCount > 0 && (
            <div className="vpanel-threat">
              <span className="vpanel-threat-icon">⚠</span>
              <div>
                <strong>{failedCount} Unverified</strong>
                <span> — failed cryptographic check</span>
              </div>
            </div>
          )}

          {/* Verify button */}
          <div className="vpanel-actions">
            <button
              className="vpanel-verify-btn"
              onClick={triggerChallenge}
              disabled={challenging || phase !== 'live'}
            >
              {challenging ? (
                <><span className="loading-spinner" /> Verifying...</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                  Verify All Participants
                </>
              )}
            </button>
            <div className="vpanel-summary">
              {participants.length > 0 && (
                <>
                  {verifiedCount > 0 && <span className="vpanel-count verified">✓ {verifiedCount}</span>}
                  {failedCount > 0 && <span className="vpanel-count failed">✗ {failedCount}</span>}
                  <span className="vpanel-count total">{participants.length} total</span>
                </>
              )}
            </div>
          </div>

          {/* Participant list */}
          <div className="vpanel-section-title">Participants</div>
          <div className="vpanel-participants">
            {participants.map((p) => {
              const sc = getStatusClass(p.trustStatus);
              return (
                <div key={p.id} className={`vpanel-participant ${sc}`}>
                  <div className="vpanel-p-left">
                    <div className={`vpanel-p-avatar ${p.device ? 'enrolled' : 'external'}`}>
                      {p.displayName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div className="vpanel-p-name">{p.displayName}</div>
                      <div className="vpanel-p-email">{p.userId}</div>
                    </div>
                  </div>
                  <div className="vpanel-p-right">
                    <span className={`vpanel-badge ${sc}`}>{getStatusLabel(p.trustStatus)}</span>
                    {p.device?.hardwareBound && <span className="vpanel-hw-tag">🔒 TPM</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Audit trail */}
          <div className="vpanel-section-title">
            Verification Trail
            <span className="vpanel-event-count">{auditEvents.length}</span>
          </div>
          <div className="vpanel-audit">
            {auditEvents.map((e) => (
              <div key={e.id} className="vpanel-audit-item">
                <span className="vpanel-audit-time">{formatTime(e.createdAt)}</span>
                <span className={`vpanel-audit-type ${getEventTypeClass(e.eventType)}`}>
                  {e.eventType.replace(/_/g, ' ')}
                </span>
                <span className="vpanel-audit-actor">
                  {e.details?.display_name || e.actor}
                </span>
              </div>
            ))}
            <div ref={auditEndRef} />
          </div>

          <div className="vpanel-footer">
            TroofAI — Trust, made provable.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ZoomMeetingPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
        <span className="loading-spinner" style={{ width: 24, height: 24 }} />
      </div>
    }>
      <ZoomMeetingContent />
    </Suspense>
  );
}
