'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

const MOCK_TENANT_ID = 'demo-tenant-00a1b2c3';

interface Device {
  id: string;
  userId: string;
  displayName: string;
  hardwareBound: boolean;
  status: string;
  keyAlgorithm: string;
  enrolledAt: string;
}

export default function EnrollPage() {
  const [step, setStep] = useState<'form' | 'binding' | 'success'>('form');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [bindPhase, setBindPhase] = useState(0);
  const [enrolledDevice, setEnrolledDevice] = useState<Device | null>(null);

  const startEnrollment = async () => {
    if (!employeeEmail || !employeeName) return;
    setStep('binding');
    setBindPhase(0);

    const delays = [800, 1200, 1000, 1200, 800, 1000];
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, delays[i]));
      setBindPhase(i + 1);
    }

    // Create mock enrolled device
    const mockDevice: Device = {
      id: `dev-${crypto.randomUUID().slice(0, 8)}`,
      userId: employeeEmail,
      displayName: employeeName,
      hardwareBound: true,
      status: 'ACTIVE',
      keyAlgorithm: 'RSA-2048',
      enrolledAt: new Date().toISOString(),
    };
    setEnrolledDevice(mockDevice);

    await new Promise(r => setTimeout(r, 800));
    setStep('success');
  };

  const bindPhases = [
    { icon: '🔍', label: 'Detecting TPM Hardware', detail: 'Scanning for Trusted Platform Module...' },
    { icon: '✓', label: 'TPM 2.0 Detected', detail: 'Microsoft Software Key Storage Provider' },
    { icon: '🔐', label: 'Generating Key Pair', detail: 'RSA-2048 inside hardware security module' },
    { icon: '🛡️', label: 'Private Key Secured', detail: 'Non-exportable — never leaves the TPM' },
    { icon: '📤', label: 'Sending Public Key', detail: 'Transmitting to TroofAI Hub...' },
    { icon: '✅', label: 'Device Enrolled', detail: `${employeeName} is now trusted` },
  ];

  return (
    <DashboardLayout tenantId={MOCK_TENANT_ID}>
      <div className="dashboard-page">
        <div className="page-header">
          <h1>Device Enrollment</h1>
          <p>Enroll a new corporate device into the TroofAI trust network</p>
        </div>

        <div className="enroll-flow">
          {/* Step indicators */}
          <div className="enroll-steps-bar">
            <div className={`enroll-step-dot ${step === 'form' ? 'active' : 'done'}`}>
              {step !== 'form' ? '✓' : '1'}
            </div>
            <div className="enroll-step-line" />
            <div className={`enroll-step-dot ${step === 'binding' ? 'active' : step === 'success' ? 'done' : ''}`}>
              {step === 'success' ? '✓' : '2'}
            </div>
            <div className="enroll-step-line" />
            <div className={`enroll-step-dot ${step === 'success' ? 'active' : ''}`}>3</div>
          </div>

          {step === 'form' && (
            <div className="enroll-card">
              <div className="enroll-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8M12 17v4" />
                </svg>
              </div>
              <h2>Enroll a New Device</h2>
              <p>Enter the employee&apos;s details to begin enrollment. The TroofAI Companion Agent will generate a hardware-backed key pair on their device.</p>

              <div className="enroll-form">
                <div className="enroll-field">
                  <label>Employee Email</label>
                  <input type="email" placeholder="alice@troofai.com" value={employeeEmail} onChange={(e) => setEmployeeEmail(e.target.value)} />
                </div>
                <div className="enroll-field">
                  <label>Display Name</label>
                  <input type="text" placeholder="Alice Baker" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} />
                </div>

                <div className="enroll-note">
                  <strong>How it works:</strong> The TroofAI Companion Agent generates an RSA-2048 key pair inside the device&apos;s TPM — the <strong>private key never leaves the hardware</strong>. Only the public key is sent to the TroofAI Hub for verification.
                  <br /><br />
                  <em>In production, enrollment is automated via MDM (JAMF, Intune, SCCM).</em>
                </div>

                <button className="enroll-generate-btn" onClick={startEnrollment} disabled={!employeeEmail || !employeeName}>
                  Begin Device Enrollment →
                </button>
              </div>
            </div>
          )}

          {step === 'binding' && (
            <div className="enroll-card binding-card">
              <div className="binding-visual">
                <div className={`binding-shield ${bindPhase >= 5 ? 'complete' : ''}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    {bindPhase >= 5 && <polyline points="9 12 11 14 15 10" />}
                  </svg>
                </div>
                <div className="binding-orbit">
                  <div className={`binding-dot dot-1 ${bindPhase >= 1 ? 'active' : ''}`} />
                  <div className={`binding-dot dot-2 ${bindPhase >= 3 ? 'active' : ''}`} />
                  <div className={`binding-dot dot-3 ${bindPhase >= 5 ? 'active' : ''}`} />
                </div>
              </div>

              <h2 className="binding-title">{bindPhase >= 5 ? 'Enrollment Complete' : 'Binding Device...'}</h2>
              <p className="binding-user">{employeeName} — {employeeEmail}</p>

              <div className="binding-phases">
                {bindPhases.map((phase, i) => (
                  <div key={i} className={`binding-phase ${bindPhase > i ? 'done' : bindPhase === i ? 'active' : ''}`}>
                    <div className="binding-phase-icon">
                      {bindPhase > i ? '✓' : bindPhase === i ? (
                        <span className="loading-spinner" style={{ width: 14, height: 14 }} />
                      ) : (
                        <span style={{ opacity: 0.3 }}>{i + 1}</span>
                      )}
                    </div>
                    <div className="binding-phase-text">
                      <div className="binding-phase-label">{phase.label}</div>
                      <div className="binding-phase-detail">{phase.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="enroll-card">
              <div className="enroll-card-icon success">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              </div>
              <h2>Device Enrolled Successfully!</h2>
              <p>{employeeName}&apos;s device is now part of the TroofAI trust network.</p>

              {enrolledDevice && (
                <div className="enroll-device-detail">
                  <div className="enroll-detail-row">
                    <span className="enroll-detail-label">User</span>
                    <span className="enroll-detail-value">{employeeName} ({employeeEmail})</span>
                  </div>
                  <div className="enroll-detail-row">
                    <span className="enroll-detail-label">Device ID</span>
                    <span className="enroll-detail-value" style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>{enrolledDevice.id}</span>
                  </div>
                  <div className="enroll-detail-row">
                    <span className="enroll-detail-label">Key Type</span>
                    <span className="enroll-detail-value">🔒 Hardware-Backed (TPM 2.0)</span>
                  </div>
                  <div className="enroll-detail-row">
                    <span className="enroll-detail-label">Algorithm</span>
                    <span className="enroll-detail-value">RSA-2048</span>
                  </div>
                  <div className="enroll-detail-row">
                    <span className="enroll-detail-label">Status</span>
                    <span className="enroll-detail-value"><span className="status-pill active">● Active</span></span>
                  </div>
                </div>
              )}

              <div className="enroll-key-flow">
                <div className="key-flow-step">
                  <div className="key-flow-icon">💻</div>
                  <div className="key-flow-label">Device TPM</div>
                  <div className="key-flow-sub">Private key stays here</div>
                </div>
                <div className="key-flow-arrow">→</div>
                <div className="key-flow-step">
                  <div className="key-flow-icon">🔑</div>
                  <div className="key-flow-label">Public Key</div>
                  <div className="key-flow-sub">Extracted &amp; sent</div>
                </div>
                <div className="key-flow-arrow">→</div>
                <div className="key-flow-step">
                  <div className="key-flow-icon">☁️</div>
                  <div className="key-flow-label">TroofAI Hub</div>
                  <div className="key-flow-sub">Stored for verification</div>
                </div>
              </div>

              <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center' }}>
                <a href="/devices" className="enroll-link-btn">View in Device Fleet →</a>
                <button className="enroll-link-btn secondary" onClick={() => { setStep('form'); setEmployeeEmail(''); setEmployeeName(''); }}>
                  Enroll Another Device
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
