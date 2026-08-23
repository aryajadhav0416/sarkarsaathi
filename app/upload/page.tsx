'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DocumentUploader from '@/components/DocumentUploader';
import StepTracker from '@/components/StepTracker';

function UploadContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session') || '';

  // Settings
  const [businessType, setBusinessType] = useState('Proprietorship');
  const [gstRegistered, setGstRegistered] = useState('yes');

  // Manual fields
  const [manualFields, setManualFields] = useState<Record<string, string>>({
    mobileNumber: '',
    nicCode: '',
    investment: '',
    turnover: ''
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId && typeof window !== 'undefined') {
      const sid = localStorage.getItem('civicform_session_id') || 'session_' + Math.random().toString(36).substring(2, 15);
      router.push(`/upload?session=${sid}`);
      return;
    }
    
    // Load pre-existing manual fields or checklist results
    const fetchExistingData = async () => {
      if (!sessionId) return;
      try {
        const res = await fetch(`/api/checklist/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          const loadedFields: Record<string, string> = {};
          data.forEach((item: any) => {
            if (item.source === 'manual_only' && item.extractedValue) {
              loadedFields[item.field] = item.extractedValue;
            }
            if (item.field === 'businessType' && item.extractedValue) {
              setBusinessType(item.extractedValue);
            }
            if (item.field === 'gstin') {
              setGstRegistered(item.status === 'not_applicable' ? 'no' : 'yes');
            }
          });
          setManualFields(prev => ({ ...prev, ...loadedFields }));
        }
      } catch (err) {
        console.error('Error fetching existing session data:', err);
      }
    };
    fetchExistingData();
  }, [sessionId, router]);

  const saveManualEntry = async (field: string, value: string) => {
    try {
      const res = await fetch('/api/manual-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, field, value })
      });
      if (!res.ok) {
        throw new Error('Failed to save manual input.');
      }
    } catch (err) {
      console.error('Error saving manual field:', err);
    }
  };

  const handleManualFieldChange = (field: string, val: string) => {
    setManualFields(prev => ({
      ...prev,
      [field]: val
    }));
  };

  const handleSettingChange = async (field: string, val: string) => {
    if (field === 'businessType') {
      setBusinessType(val);
    } else if (field === 'gstRegistered') {
      setGstRegistered(val);
    }
    await saveManualEntry(field, val);
  };

  const handleUploadComplete = () => {
    setSuccessMsg('Document successfully uploaded and analyzed!');
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  return (
    <main className="main-content container">
      <div className="bg-glow"></div>
      
      <div className="card" id="main-scaffold-card" style={{ maxWidth: '650px' }}>
        <StepTracker />
        <div className="status-badge" id="scaffold-status">
          <span className="status-dot"></span>
          Step 1: Upload & Initial Profile
        </div>

        <h1>Udyam Document Upload & Form Profile</h1>
        <p className="lead" style={{ marginBottom: '24px' }}>
          Upload identification and credentials to auto-extract core Udyam fields, and fill in the manual indicators.
        </p>

        {successMsg && (
          <div className="status-banner success-banner" style={{ marginBottom: '20px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '12px', borderRadius: '6px', fontSize: '0.85rem' }}>
            🎉 {successMsg}
          </div>
        )}

        {/* 1. Document Uploader Component */}
        <DocumentUploader sessionId={sessionId} onUploadComplete={handleUploadComplete} />

        {/* 2. Manual Form Details */}
        <div style={{ marginTop: '32px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
          <h3 className="section-title" style={{ marginBottom: '16px' }}>Business Configuration & Manual Fields</h3>
          
          <div className="form-grid" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="businessType-select" style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                Business Entity Type
              </label>
              <select 
                id="businessType-select"
                value={businessType} 
                onChange={(e) => handleSettingChange('businessType', e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.85rem', backgroundColor: '#fff' }}
              >
                <option value="Proprietorship">Proprietorship (Sole Owner)</option>
                <option value="Partnership">Partnership Firm</option>
                <option value="Private Limited Company">Private Limited Company</option>
                <option value="LLP">Limited Liability Partnership (LLP)</option>
                <option value="Cooperative">Cooperative Society</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="gstRegistered-select" style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                Are you GST-Registered?
              </label>
              <select 
                id="gstRegistered-select"
                value={gstRegistered} 
                onChange={(e) => handleSettingChange('gstRegistered', e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.85rem', backgroundColor: '#fff' }}
              >
                <option value="yes">Yes (GSTIN Required)</option>
                <option value="no">No (GSTIN Exempt)</option>
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="mobileNumber-input" style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                Aadhaar-Linked Mobile *
              </label>
              <input 
                id="mobileNumber-input"
                type="text"
                placeholder="e.g. 9876543210"
                value={manualFields.mobileNumber || ''}
                onChange={(e) => handleManualFieldChange('mobileNumber', e.target.value)}
                onBlur={(e) => saveManualEntry('mobileNumber', e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="nicCode-input" style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                NIC Activity Code *
              </label>
              <input 
                id="nicCode-input"
                type="text"
                placeholder="e.g. 62011"
                value={manualFields.nicCode || ''}
                onChange={(e) => handleManualFieldChange('nicCode', e.target.value)}
                onBlur={(e) => saveManualEntry('nicCode', e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="investment-input" style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                Investment Figure (INR) *
              </label>
              <input 
                id="investment-input"
                type="text"
                placeholder="e.g. 250000"
                value={manualFields.investment || ''}
                onChange={(e) => handleManualFieldChange('investment', e.target.value)}
                onBlur={(e) => saveManualEntry('investment', e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="turnover-input" style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                Turnover Figure (INR) *
              </label>
              <input 
                id="turnover-input"
                type="text"
                placeholder="e.g. 1200000"
                value={manualFields.turnover || ''}
                onChange={(e) => handleManualFieldChange('turnover', e.target.value)}
                onBlur={(e) => saveManualEntry('turnover', e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>
          </div>
        </div>

        {/* 3. Navigation Link */}
        <div className="nav-action-bar">
          <div></div> {/* Spacer */}
          <button 
            type="button"
            className="nav-btn nav-btn-primary"
            onClick={() => router.push(`/checklist?session=${sessionId}`)}
          >
            Continue to Checklist &rarr;
          </button>
        </div>
      </div>
    </main>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <span className="spinner"></span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Loading upload flow...</span>
        </div>
      </div>
    }>
      <UploadContent />
    </Suspense>
  );
}
