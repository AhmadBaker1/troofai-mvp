'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="setup-page">
      <div className="setup-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span className="loading-spinner" style={{ width: 20, height: 20 }} />
        <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>Loading TroofAI Dashboard...</span>
      </div>
    </div>
  );
}
