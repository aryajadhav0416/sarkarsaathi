'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Checklist from '@/components/Checklist';
import StepTracker from '@/components/StepTracker';

function ChecklistContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session') || '';

  return (
    <main className="main-content container">
      <div className="bg-glow"></div>
      
      <div className="card" id="checklist-scaffold-card" style={{ maxWidth: '650px' }}>
        <StepTracker />
        <div className="status-badge" id="scaffold-status">
          <span className="status-dot"></span>
          Step 2: Review Checklist
        </div>

        <h1>Udyam Audit Checklist</h1>
        <p className="lead" style={{ marginBottom: '16px' }}>
          Inspect which required fields were extracted from your files and identify what items are still missing or unclear.
        </p>

        {sessionId ? (
          <Checklist sessionId={sessionId} refreshTrigger={0} />
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>Session ID is missing. Please go back to the upload screen.</p>
        )}

        {/* Navigation Step Control Links */}
        <div className="nav-action-bar">
          <button 
            type="button"
            className="nav-btn nav-btn-secondary"
            onClick={() => router.push(`/upload?session=${sessionId}`)}
          >
            &larr; Back to Upload
          </button>
          
          <button 
            type="button"
            className="nav-btn nav-btn-primary"
            onClick={() => router.push(`/preview?session=${sessionId}`)}
          >
            Continue to Preview &rarr;
          </button>
        </div>
      </div>
    </main>
  );
}

export default function ChecklistPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <span className="spinner"></span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Loading checklist auditing...</span>
        </div>
      </div>
    }>
      <ChecklistContent />
    </Suspense>
  );
}
