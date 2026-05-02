'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';

const HUB_URL = 'http://localhost:3001';

interface Meeting {
  id: string;
  name: string;
  createdAt: string;
  endedAt: string | null;
  participants: { id: string; displayName: string; trustStatus: string; userId: string; deviceId: string | null }[];
  _count: { participants: number };
}

const MOCK_TENANT_ID = 'demo-tenant-00a1b2c3';

const MOCK_MEETINGS: Meeting[] = [
  {
    id: 'mtg-a1b2c3d4-e5f6-7890',
    name: 'Board Sync — Q2 Forecast',
    createdAt: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    endedAt: null,
    participants: [
      { id: 'p1', displayName: 'Alice Baker', trustStatus: 'VERIFIED', userId: 'alice@troofai.com', deviceId: 'dev-001' },
      { id: 'p2', displayName: 'Bob Chen', trustStatus: 'VERIFIED', userId: 'bob@troofai.com', deviceId: 'dev-002' },
      { id: 'p3', displayName: 'Alice Baker', trustStatus: 'FAILED', userId: 'alice.baker.external@gmail.com', deviceId: null },
    ],
    _count: { participants: 3 },
  },
  {
    id: 'mtg-b2c3d4e5-f6a7-8901',
    name: 'Engineering Stand-up',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    endedAt: new Date(Date.now() - 1000 * 60 * 60 * 2.5).toISOString(),
    participants: [
      { id: 'p4', displayName: 'Alice Baker', trustStatus: 'VERIFIED', userId: 'alice@troofai.com', deviceId: 'dev-001' },
      { id: 'p5', displayName: 'Carlos Rivera', trustStatus: 'VERIFIED', userId: 'carlos@troofai.com', deviceId: 'dev-003' },
      { id: 'p6', displayName: 'Dana Kim', trustStatus: 'VERIFIED', userId: 'dana@troofai.com', deviceId: 'dev-004' },
      { id: 'p7', displayName: 'Eve Novak', trustStatus: 'VERIFIED', userId: 'eve@troofai.com', deviceId: 'dev-005' },
    ],
    _count: { participants: 4 },
  },
  {
    id: 'mtg-c3d4e5f6-a7b8-9012',
    name: 'Investor Update Call',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    endedAt: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(),
    participants: [
      { id: 'p8', displayName: 'Alice Baker', trustStatus: 'VERIFIED', userId: 'alice@troofai.com', deviceId: 'dev-001' },
      { id: 'p9', displayName: 'Frank Walsh', trustStatus: 'VERIFIED', userId: 'frank@troofai.com', deviceId: 'dev-006' },
      { id: 'p10', displayName: 'Grace Liu', trustStatus: 'VERIFIED', userId: 'grace@troofai.com', deviceId: 'dev-007' },
      { id: 'p11', displayName: 'Bob Chen', trustStatus: 'VERIFIED', userId: 'bob@troofai.com', deviceId: 'dev-002' },
      { id: 'p12', displayName: 'Alice Baker', trustStatus: 'FAILED', userId: 'alice.b@proton.me', deviceId: null },
    ],
    _count: { participants: 5 },
  },
];

export default function MeetingsPage() {
  const [tenantId, setTenantId] = useState('');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMeetings() {
      try {
        const tenantRes = await fetch(`${HUB_URL}/tenants/demo`);
        if (!tenantRes.ok) throw new Error('Hub unavailable');
        const tenantData = await tenantRes.json();
        setTenantId(tenantData.tenant_id);
        const meetingsRes = await fetch(`${HUB_URL}/meetings?tenant_id=${tenantData.tenant_id}`);
        setMeetings(await meetingsRes.json());
      } catch {
        setTenantId(MOCK_TENANT_ID);
        setMeetings(MOCK_MEETINGS);
      }
      setLoading(false);
    }
    fetchMeetings();
  }, []);

  return (
    <DashboardLayout tenantId={tenantId}>
      <div className="dashboard-page">
        <div className="page-header">
          <h1>Meetings</h1>
          <p>Meeting history with participant trust verification results</p>
        </div>
        <div className="section-card">
          <div className="section-header">
            <span className="section-title">{meetings.length} Meeting{meetings.length !== 1 ? 's' : ''}</span>
            <Link href="/demo-meeting" style={{ background: 'var(--primary)', color: '#fff', padding: '0.4rem 1rem', borderRadius: '6px', fontSize: '0.78rem', textDecoration: 'none' }}>
              + New Demo Meeting
            </Link>
          </div>
          <div className="section-body">
            {meetings.length === 0 ? (
              <div className="empty-state">No meetings yet.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Meeting</th>
                    <th>Date</th>
                    <th>Participants</th>
                    <th>Verified</th>
                    <th>Failed</th>
                    <th>Trust Score</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {meetings.map((m) => {
                    const verified = m.participants.filter(p => p.trustStatus === 'VERIFIED').length;
                    const failed = m.participants.filter(p => p.trustStatus === 'FAILED').length;
                    const total = m.participants.length;
                    const score = total > 0 ? Math.round((verified / total) * 100) : 0;
                    return (
                      <tr key={m.id}>
                        <td>
                          <div className="table-name">{m.name}</div>
                          <div className="table-email" style={{ fontFamily: 'monospace' }}>{m.id.slice(0, 8)}...</div>
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{new Date(m.createdAt).toLocaleString()}</td>
                        <td>{total}</td>
                        <td>{verified > 0 ? <span className="status-pill active">✓ {verified}</span> : <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>0</span>}</td>
                        <td>{failed > 0 ? <span className="status-pill" style={{ background: 'var(--failed-bg)', color: 'var(--failed)' }}>✗ {failed}</span> : <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>0</span>}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: 60, height: 4, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ width: `${score}%`, height: '100%', background: score >= 50 ? 'var(--verified)' : 'var(--failed)', borderRadius: 4 }} />
                            </div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: score >= 50 ? 'var(--verified)' : 'var(--failed)' }}>{score}%</span>
                          </div>
                        </td>
                        <td>
                          <Link href={`/demo-meeting?id=${m.id}&tenant=${tenantId}`} style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>View →</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
