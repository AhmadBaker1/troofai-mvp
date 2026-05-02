'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';

const HUB_URL = 'http://localhost:3001';

interface Stats {
  devices: { total: number; active: number; hardware_bound: number };
  meetings: { total: number };
  participants: { total: number; verified: number; failed: number; verified_rate: number };
  audit_events: number;
  threats_detected: number;
}

interface Meeting {
  id: string;
  name: string;
  createdAt: string;
  participants: { id: string; displayName: string; trustStatus: string; userId: string }[];
  _count: { participants: number };
}

interface Device {
  id: string;
  userId: string;
  displayName: string;
  hardwareBound: boolean;
  status: string;
  lastHeartbeat: string;
  enrolledAt: string;
}

// ── Mock / demo data used when Hub API is unreachable ──────────────────
const MOCK_TENANT_ID = 'demo-tenant-00a1b2c3';

const MOCK_STATS: Stats = {
  devices: { total: 3, active: 2, hardware_bound: 2 },
  meetings: { total: 7 },
  participants: { total: 12, verified: 10, failed: 2, verified_rate: 83 },
  audit_events: 34,
  threats_detected: 2,
};

const MOCK_MEETINGS: Meeting[] = [
  {
    id: 'mtg-001',
    name: 'Board Sync — Q2 Forecast',
    createdAt: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    participants: [
      { id: 'p1', displayName: 'Alice Baker', trustStatus: 'VERIFIED', userId: 'alice@troofai.com' },
      { id: 'p2', displayName: 'Bob Chen', trustStatus: 'VERIFIED', userId: 'bob@troofai.com' },
      { id: 'p3', displayName: 'Alice Baker', trustStatus: 'FAILED', userId: 'alice.baker.external@gmail.com' },
    ],
    _count: { participants: 3 },
  },
  {
    id: 'mtg-002',
    name: 'Engineering Stand-up',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    participants: [
      { id: 'p4', displayName: 'Alice Baker', trustStatus: 'VERIFIED', userId: 'alice@troofai.com' },
      { id: 'p5', displayName: 'Carlos Rivera', trustStatus: 'VERIFIED', userId: 'carlos@troofai.com' },
      { id: 'p6', displayName: 'Dana Kim', trustStatus: 'VERIFIED', userId: 'dana@troofai.com' },
      { id: 'p7', displayName: 'Eve Novak', trustStatus: 'PENDING', userId: 'eve@troofai.com' },
    ],
    _count: { participants: 4 },
  },
  {
    id: 'mtg-003',
    name: 'Investor Update Call',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    participants: [
      { id: 'p8', displayName: 'Alice Baker', trustStatus: 'VERIFIED', userId: 'alice@troofai.com' },
      { id: 'p9', displayName: 'Frank Walsh', trustStatus: 'VERIFIED', userId: 'frank@troofai.com' },
      { id: 'p10', displayName: 'Grace Liu', trustStatus: 'VERIFIED', userId: 'grace@troofai.com' },
      { id: 'p11', displayName: 'Bob Chen', trustStatus: 'VERIFIED', userId: 'bob@troofai.com' },
      { id: 'p12', displayName: 'Alice Baker', trustStatus: 'FAILED', userId: 'alice.b@proton.me' },
    ],
    _count: { participants: 5 },
  },
];

const MOCK_DEVICES: Device[] = [
  {
    id: 'dev-001',
    userId: 'alice@troofai.com',
    displayName: 'Alice Baker',
    hardwareBound: true,
    status: 'ACTIVE',
    lastHeartbeat: new Date(Date.now() - 1000 * 45).toISOString(),
    enrolledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
  },
  {
    id: 'dev-002',
    userId: 'bob@troofai.com',
    displayName: 'Bob Chen',
    hardwareBound: true,
    status: 'ACTIVE',
    lastHeartbeat: new Date(Date.now() - 1000 * 120).toISOString(),
    enrolledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
  },
  {
    id: 'dev-003',
    userId: 'carlos@troofai.com',
    displayName: 'Carlos Rivera',
    hardwareBound: false,
    status: 'INACTIVE',
    lastHeartbeat: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    enrolledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
];

// ── Helpers ────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function DashboardPage() {
  const [tenantId, setTenantId] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      try {
        const tenantRes = await fetch(`${HUB_URL}/tenants/demo`);
        if (!tenantRes.ok) throw new Error(`Hub returned ${tenantRes.status}`);
        const tenantData = await tenantRes.json();
        if (cancelled) return;
        setTenantId(tenantData.tenant_id);

        const [statsRes, meetingsRes, devicesRes] = await Promise.all([
          fetch(`${HUB_URL}/stats?tenant_id=${tenantData.tenant_id}`),
          fetch(`${HUB_URL}/meetings?tenant_id=${tenantData.tenant_id}`),
          fetch(`${HUB_URL}/devices?tenant_id=${tenantData.tenant_id}`),
        ]);

        if (cancelled) return;
        setStats(await statsRes.json());
        const meetingsData = await meetingsRes.json();
        setMeetings(Array.isArray(meetingsData) ? meetingsData : []);
        const devicesData = await devicesRes.json();
        setDevices(Array.isArray(devicesData) ? devicesData : []);
        setUsingMock(false);
      } catch {
        // Hub API unreachable — fall back to demo data
        if (cancelled) return;
        if (!usingMock) {
          console.info('[TroofAI] Hub API unavailable — using demo data');
        }
        setTenantId(MOCK_TENANT_ID);
        setStats(MOCK_STATS);
        setMeetings(MOCK_MEETINGS);
        setDevices(MOCK_DEVICES);
        setUsingMock(true);
      }
      if (!cancelled) setLoading(false);
    }

    fetchAll();
    // Only poll when the real API is available
    const interval = setInterval(fetchAll, usingMock ? 30000 : 5000);
    return () => { cancelled = true; clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usingMock]);

  const threatCount = stats?.threats_detected || 0;
  const verifiedRate = stats?.participants.verified_rate || 0;

  return (
    <DashboardLayout tenantId={tenantId}>
      <div className="dashboard-page">
        {/* Welcome header */}
        <div className="dash-welcome">
          <div>
            <h1 className="dash-title">Trust Overview</h1>
            <p className="dash-subtitle">Real-time cryptographic verification status across your organization</p>
          </div>
          <div className="dash-actions">
            <Link href="/enrollment" className="dash-action-btn primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v8M8 12h8" />
              </svg>
              Enroll Device
            </Link>
            <Link href="/zoom-meeting" className="dash-action-btn secondary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
              Start Meeting
            </Link>
          </div>
        </div>

        {/* Threat banner */}
        {threatCount > 0 && (
          <div className="dash-threat-banner">
            <div className="dash-threat-pulse" />
            <div className="dash-threat-content">
              <strong>{threatCount} Unverified Participant{threatCount > 1 ? 's' : ''}</strong>
              <span> detected in recent meetings — could not be cryptographically verified</span>
            </div>
            <Link href="/audit" className="dash-threat-link">View Audit →</Link>
          </div>
        )}

        {/* Stats row */}
        <div className="dash-stats">
          <div className="dash-stat-card">
            <div className="dash-stat-icon devices">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
            </div>
            <div className="dash-stat-info">
              <div className="dash-stat-value">{stats?.devices.total || 0}</div>
              <div className="dash-stat-label">Enrolled Devices</div>
              <div className="dash-stat-sub">{stats?.devices.hardware_bound || 0} TPM-backed</div>
            </div>
          </div>

          <div className="dash-stat-card">
            <div className="dash-stat-icon verified">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            </div>
            <div className="dash-stat-info">
              <div className="dash-stat-value">{verifiedRate}<span className="dash-stat-unit">%</span></div>
              <div className="dash-stat-label">Verification Rate</div>
              <div className="dash-stat-sub">{stats?.participants.verified || 0} of {stats?.participants.total || 0}</div>
            </div>
          </div>

          <div className="dash-stat-card">
            <div className="dash-stat-icon meetings">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            <div className="dash-stat-info">
              <div className="dash-stat-value">{stats?.meetings.total || 0}</div>
              <div className="dash-stat-label">Meetings Verified</div>
              <div className="dash-stat-sub">{stats?.audit_events || 0} audit events</div>
            </div>
          </div>

          <div className="dash-stat-card">
            <div className={`dash-stat-icon ${threatCount > 0 ? 'threats-active' : 'threats'}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="dash-stat-info">
              <div className="dash-stat-value" style={threatCount > 0 ? { color: 'var(--failed)' } : {}}>{threatCount}</div>
              <div className="dash-stat-label">Threats Detected</div>
              <div className="dash-stat-sub">Unverified participants</div>
            </div>
          </div>
        </div>

        {/* Two column grid */}
        <div className="dash-grid">
          {/* Recent Meetings */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h3>Recent Meetings</h3>
              <Link href="/meetings" className="dash-link">View All →</Link>
            </div>
            <div className="dash-card-body">
              {meetings.length === 0 ? (
                <div className="dash-empty">
                  <div className="dash-empty-icon">📋</div>
                  <p>No meetings yet</p>
                  <span>Launch a verification session to get started</span>
                </div>
              ) : (
                <div className="dash-list">
                  {meetings.slice(0, 5).map((m) => {
                    const verified = m.participants.filter(p => p.trustStatus === 'VERIFIED').length;
                    const failed = m.participants.filter(p => p.trustStatus === 'FAILED').length;
                    const pending = m.participants.length - verified - failed;
                    const score = m.participants.length > 0
                      ? Math.round((verified / m.participants.length) * 100)
                      : 0;

                    return (
                      <Link key={m.id} href={`/demo-meeting?id=${m.id}&tenant=${tenantId}`} className="dash-list-item">
                        <div className="dash-list-left">
                          <div className={`dash-meeting-score ${score === 100 ? 'perfect' : score > 0 ? 'partial' : 'none'}`}>
                            {score}%
                          </div>
                          <div>
                            <div className="dash-list-name">{m.name}</div>
                            <div className="dash-list-meta">
                              {m.participants.length} participant{m.participants.length !== 1 ? 's' : ''} · {timeAgo(m.createdAt)}
                            </div>
                          </div>
                        </div>
                        <div className="dash-trust-badges">
                          {verified > 0 && <span className="dash-badge verified">✓ {verified}</span>}
                          {failed > 0 && <span className="dash-badge failed">✗ {failed}</span>}
                          {pending > 0 && <span className="dash-badge pending">? {pending}</span>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Device Fleet */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h3>Device Fleet</h3>
              <Link href="/devices" className="dash-link">View All →</Link>
            </div>
            <div className="dash-card-body">
              {devices.length === 0 ? (
                <div className="dash-empty">
                  <div className="dash-empty-icon">💻</div>
                  <p>No devices enrolled</p>
                  <span>Run the TroofAI Companion Agent to enroll</span>
                </div>
              ) : (
                <div className="dash-list">
                  {devices.slice(0, 5).map((d) => (
                    <div key={d.id} className="dash-list-item">
                      <div className="dash-list-left">
                        <div className="dash-device-avatar">
                          {d.displayName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="dash-list-name">{d.displayName}</div>
                          <div className="dash-list-meta">{d.userId}</div>
                        </div>
                      </div>
                      <div className="dash-device-right">
                        <span className={`dash-badge ${d.hardwareBound ? 'hw' : 'sw'}`}>
                          {d.hardwareBound ? '🔒 TPM' : '🔑 SW'}
                        </span>
                        <span className={`dash-badge ${d.status === 'ACTIVE' ? 'verified' : 'failed'}`}>
                          {d.status === 'ACTIVE' ? '● Active' : '○ Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="dash-footer-info">
          <span>Powered by hardware-backed cryptography (TPM 2.0)</span>
          <span>·</span>
          <span>TroofAI — Trust, made provable.</span>
        </div>
      </div>
    </DashboardLayout>
  );
}
