'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let sid = localStorage.getItem('civicform_session_id');
      if (!sid) {
        sid = 'session_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('civicform_session_id', sid);
      }
      router.push(`/upload?session=${sid}`);
    }
  }, [router]);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <span className="spinner"></span>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
          Redirecting to application flow...
        </span>
      </div>
    </div>
  );
}
