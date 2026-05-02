'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

const HUB_URL = 'http://localhost:3001';

interface Device {
  id: string;
  userId: string;
  displayName: string;
  hardwareBound: boolean;
  status: string;
  keyAlgorithm: string;
  lastHeartbeat: string;
  enrolledAt: string;
}

// ── Mock data ──────────────────────────────────────────────────────────
const MOCK_TENANT_ID = 'demo-tenant-00a1b2c3';

const MOCK_DEVICES: Device[] = [
  {
    id: 'c7a1e3f0-9b2d-4f8e-a1c3-d5e7f9012345',
    userId: 'alice@troofai.com',
    displayName: 'Alice Baker',
    hardwareBound: true,
    status: 'ACTIVE',
    keyAlgorithm: 'RSA-2048',
    lastHeartbeat: new Date(Date.now() - 1000 * 45).toISOString(),
    enrolledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
  },
  {
    id: 'b8d2f4a1-0c3e-5a9f-b2d4-e6f8a0123456',
    userId: 'bob@troofai.com',
    displayName: 'Bob Chen',
    hardwareBound: true,
    status: 'ACTIVE',
    keyAlgorithm: 'RSA-2048',
    lastHeartbeat: new Date(Date.now() - 1000 * 120).toISOString(),
    enrolledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
  },
  {
    id: 'a9e3f5b2-1d4f-6b0a-c3e5-f7a9b1234567',
    userId: 'carlos@troofai.com',
    displayName: 'Carlos Rivera',
    hardwareBound: false,
    status: 'INACTIVE',
    keyAlgorithm: 'RSA-2048',
    lastHeartbeat: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    enrolledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
];

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function DevicesPage() {
  const [tenantId, setTenantId] = useState('');
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDevices() {
      try {
        const tenantRes = await fetch(`${HUB_URL}/tenants/demo`);
        if (!tenantRes.ok) throw new Error('Hub unavailable');
        const tenantData = await tenantRes.json();
        setTenantId(tenantData.tenant_id);

        const devicesRes = await fetch(`${HUB_URL}/devices?tenant_id=${tenantData.tenant_id}`);
        const data = await devicesRes.json();
        setDevices(Array.isArray(data) ? data : []);
      } catch {
        console.info('[TroofAI] Hub API unavailable — using demo data');
        setTenantId(MOCK_TENANT_ID);
        setDevices(MOCK_DEVICES);
      }
      setLoading(false);
    }

    fetchDevices();
  }, []);

  return (
    <DashboardLayout tenantId={tenantId}>
      <div className="dashboard-page">
        <div className="page-header">
          <h1>Device Fleet</h1>
          <p>All enrolled corporate devices and their cryptographic key status</p>
        </div>

        <div className="section-card">
          <div className="section-header">
            <span className="section-title">{devices.length} Enrolled Device{devices.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="section-body">
            {devices.length === 0 ? (
              <div className="empty-state">
                No devices enrolled yet. Start the TroofAI Companion Agent to enroll this device.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Device ID</th>
                    <th>Key Type</th>
                    <th>Algorithm</th>
                    <th>Status</th>
                    <th>Last Heartbeat</th>
                    <th>Enrolled</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <div className="table-user">
                          <div className="table-avatar">{d.displayName.split(' ').map(n => n[0]).join('')}</div>
                          <div>
                            <div className="table-name">{d.displayName}</div>
                            <div className="table-email">{d.userId}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {d.id.slice(0, 8)}...
                      </td>
                      <td>
                        <span className={`status-pill ${d.hardwareBound ? 'hw' : 'sw'}`}>
                          {d.hardwareBound ? '🔒 Hardware (TPM)' : '🔑 Software'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.78rem' }}>{d.keyAlgorithm}</td>
                      <td>
                        <span className={`status-pill ${d.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                          {d.status === 'ACTIVE' ? '● Active' : '○ Revoked'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {d.lastHeartbeat ? timeAgo(d.lastHeartbeat) : 'Never'}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {new Date(d.enrolledAt).toLocaleDateString()}
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
