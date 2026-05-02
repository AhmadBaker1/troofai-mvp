'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

const HUB_URL = 'http://localhost:3001';

interface AuditEvent {
  id: string;
  eventType: string;
  actor: string;
  details: any;
  createdAt: string;
  meetingId: string | null;
}

const MOCK_TENANT_ID = 'demo-tenant-00a1b2c3';

const now = Date.now();
const MOCK_EVENTS: AuditEvent[] = [
  { id: 'ae-01', eventType: 'DEVICE_ENROLLED', actor: 'alice@troofai.com', details: { display_name: 'Alice Baker', device_id: 'c7a1e3f0-9b2d-4f8e', hardware_bound: true }, createdAt: new Date(now - 1000 * 60 * 60 * 24 * 12).toISOString(), meetingId: null },
  { id: 'ae-02', eventType: 'DEVICE_ENROLLED', actor: 'bob@troofai.com', details: { display_name: 'Bob Chen', device_id: 'b8d2f4a1-0c3e-5a9f', hardware_bound: true }, createdAt: new Date(now - 1000 * 60 * 60 * 24 * 8).toISOString(), meetingId: null },
  { id: 'ae-03', eventType: 'DEVICE_ENROLLED', actor: 'carlos@troofai.com', details: { display_name: 'Carlos Rivera', device_id: 'a9e3f5b2-1d4f-6b0a', hardware_bound: false }, createdAt: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(), meetingId: null },
  { id: 'ae-04', eventType: 'PARTICIPANT_JOINED', actor: 'alice@troofai.com', details: { display_name: 'Alice Baker' }, createdAt: new Date(now - 1000 * 60 * 24).toISOString(), meetingId: 'mtg-a1b2c3d4' },
  { id: 'ae-05', eventType: 'PARTICIPANT_JOINED', actor: 'bob@troofai.com', details: { display_name: 'Bob Chen' }, createdAt: new Date(now - 1000 * 60 * 23).toISOString(), meetingId: 'mtg-a1b2c3d4' },
  { id: 'ae-06', eventType: 'PARTICIPANT_JOINED', actor: 'alice.baker.external@gmail.com', details: { display_name: 'Alice Baker' }, createdAt: new Date(now - 1000 * 60 * 22.5).toISOString(), meetingId: 'mtg-a1b2c3d4' },
  { id: 'ae-07', eventType: 'MEETING_BINDING_BOUND', actor: 'alice@troofai.com', details: { display_name: 'Alice Baker', device_id: 'c7a1e3f0-9b2d-4f8e', hardware_bound: true }, createdAt: new Date(now - 1000 * 60 * 23.5).toISOString(), meetingId: 'mtg-a1b2c3d4' },
  { id: 'ae-08', eventType: 'MEETING_BINDING_BOUND', actor: 'bob@troofai.com', details: { display_name: 'Bob Chen', device_id: 'b8d2f4a1-0c3e-5a9f', hardware_bound: true }, createdAt: new Date(now - 1000 * 60 * 22.8).toISOString(), meetingId: 'mtg-a1b2c3d4' },
  { id: 'ae-09', eventType: 'CHALLENGE_PASSED', actor: 'alice@troofai.com', details: { display_name: 'Alice Baker', device_id: 'c7a1e3f0-9b2d-4f8e', hardware_bound: true }, createdAt: new Date(now - 1000 * 60 * 22).toISOString(), meetingId: 'mtg-a1b2c3d4' },
  { id: 'ae-10', eventType: 'CHALLENGE_PASSED', actor: 'bob@troofai.com', details: { display_name: 'Bob Chen', device_id: 'b8d2f4a1-0c3e-5a9f', hardware_bound: true }, createdAt: new Date(now - 1000 * 60 * 21.5).toISOString(), meetingId: 'mtg-a1b2c3d4' },
  { id: 'ae-11', eventType: 'CHALLENGE_FAILED_NO_DEVICE', actor: 'alice.baker.external@gmail.com', details: { display_name: 'Alice Baker', reason: 'No enrolled device found for this user' }, createdAt: new Date(now - 1000 * 60 * 21).toISOString(), meetingId: 'mtg-a1b2c3d4' },
  { id: 'ae-12', eventType: 'HEARTBEAT_RECEIVED', actor: 'alice@troofai.com', details: { display_name: 'Alice Baker', device_id: 'c7a1e3f0-9b2d-4f8e' }, createdAt: new Date(now - 1000 * 45).toISOString(), meetingId: null },
];

function formatEventType(type: string): string {
  return type.replace(/_/g, ' ');
}

function getEventColor(type: string): string {
  if (type.includes('PASSED') || type.includes('BOUND') || type.includes('ENROLLED') || type.includes('HEARTBEAT')) return 'var(--verified)';
  if (type.includes('FAILED') || type.includes('NO_DEVICE')) return 'var(--failed)';
  return 'var(--text-muted)';
}

export default function AuditPage() {
  const [tenantId, setTenantId] = useState('');
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAudit() {
      try {
        const tenantRes = await fetch(`${HUB_URL}/tenants/demo`);
        if (!tenantRes.ok) throw new Error('Hub unavailable');
        const tenantData = await tenantRes.json();
        setTenantId(tenantData.tenant_id);
        const meetingsRes = await fetch(`${HUB_URL}/meetings?tenant_id=${tenantData.tenant_id}`);
        const meetings = await meetingsRes.json();
        const allEvents: AuditEvent[] = [];
        for (const m of meetings.slice(0, 10)) {
          const auditRes = await fetch(`${HUB_URL}/audit/meeting/${m.id}`);
          const meetingEvents = await auditRes.json();
          allEvents.push(...meetingEvents);
        }
        allEvents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setEvents(allEvents);
      } catch {
        setTenantId(MOCK_TENANT_ID);
        setEvents(MOCK_EVENTS.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
      setLoading(false);
    }
    fetchAudit();
  }, []);

  return (
    <DashboardLayout tenantId={tenantId}>
      <div className="dashboard-page">
        <div className="page-header">
          <h1>Audit Log</h1>
          <p>Complete cryptographic verification trail for compliance and forensics</p>
        </div>
        <div className="section-card">
          <div className="section-header">
            <span className="section-title">{events.length} Events</span>
          </div>
          <div className="section-body">
            {events.length === 0 ? (
              <div className="empty-state">No audit events yet.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Event</th>
                    <th>Actor</th>
                    <th>Details</th>
                    <th>Meeting</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(e.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, fontSize: '0.78rem', color: getEventColor(e.eventType) }}>
                          {formatEventType(e.eventType)}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.78rem' }}>{e.actor}</td>
                      <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: 300 }}>
                        {e.details?.reason && <span style={{ fontStyle: 'italic' }}>{e.details.reason}</span>}
                        {e.details?.display_name && !e.details.reason && <span>{e.details.display_name}</span>}
                        {e.details?.device_id && (
                          <div style={{ fontFamily: 'monospace', marginTop: 2 }}>
                            Device: {e.details.device_id.slice(0, 8)}...
                            {e.details.hardware_bound !== undefined && (
                              <span className={`status-pill ${e.details.hardware_bound ? 'hw' : 'sw'}`} style={{ marginLeft: 8 }}>
                                {e.details.hardware_bound ? 'TPM' : 'SW'}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {e.meetingId ? `${e.meetingId.slice(0, 8)}...` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
