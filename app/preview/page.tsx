'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import StepTracker from '@/components/StepTracker';
import { activeSchemeConfig } from '@/lib/schemes';

interface ChecklistItem {
  field: string;
  required: boolean;
  status: 'present' | 'missing' | 'unclear' | 'not_applicable';
  extractedValue: string | null;
  source: 'extractable' | 'manual_only';
}

// Auto-Correction Helpers for Character Confusions
function sanitizePan(val: string): string {
  const s = val.trim().toUpperCase();
  if (s.length !== 10) return val;
  
  const toChar = (c: string) => {
    const map: Record<string, string> = { '0': 'O', '1': 'I', '2': 'Z', '5': 'S', '8': 'B' };
    return map[c] || c;
  };
  
  const toDigit = (c: string) => {
    const map: Record<string, string> = { 'O': '0', 'D': '0', 'Q': '0', 'I': '1', 'L': '1', 'Z': '2', 'S': '5', 'B': '8' };
    return map[c] || c;
  };

  let corrected = '';
  for (let i = 0; i < 5; i++) corrected += toChar(s[i]);
  for (let i = 5; i < 9; i++) corrected += toDigit(s[i]);
  corrected += toChar(s[9]);
  return corrected;
}

function sanitizeAadhaar(val: string): string {
  const s = val.trim();
  if (s.toUpperCase().startsWith('XXXX')) return val;
  
  const clean = s.replace(/[^0-9A-Z|]/ig, '');
  if (clean.length !== 12) return val;

  const map: Record<string, string> = {
    'O': '0', 'D': '0', 'Q': '0',
    'I': '1', 'L': '1', '|': '1',
    'Z': '2', 'S': '5', 'B': '8'
  };
  let corrected = '';
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i].toUpperCase();
    corrected += map[c] || c;
  }
  return corrected;
}

function sanitizeIfsc(val: string): string {
  const s = val.trim().toUpperCase();
  if (s.length !== 11) return val;
  
  const toChar = (c: string) => {
    const map: Record<string, string> = { '0': 'O', '1': 'I', '2': 'Z', '5': 'S', '8': 'B' };
    return map[c] || c;
  };

  let corrected = '';
  for (let i = 0; i < 4; i++) corrected += toChar(s[i]);
  corrected += '0';
  corrected += s.slice(5);
  return corrected;
}

function PreviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session') || '';

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states matching Udyam fields
  const [formData, setFormData] = useState<Record<string, string>>({
    aadhaarNumber: '',
    mobileNumber: '',
    panNumber: '',
    panOfBusiness: '',
    gstin: '',
    businessName: '',
    businessAddress: '',
    bankAccountNumber: '',
    ifscCode: '',
    nicCode: '',
    investment: '',
    turnover: ''
  });

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<Record<string, string | null>>({});

  const validateField = (field: string, value: string, itemsList: ChecklistItem[]): string | null => {
    // Find the item definition to check for applicability
    const matchedItem = itemsList.find(i => i.field === field);
    const isNa = matchedItem ? matchedItem.status === 'not_applicable' : false;
    if (isNa) return null;

    // Load from generic activeSchemeConfig
    const fieldConfig = activeSchemeConfig.fields.find((f: any) => f.field === field);
    if (fieldConfig && fieldConfig.validate) {
      // Pass both value and current settings context
      return fieldConfig.validate(value, formData);
    }

    // Default required fallback if no specific validator is defined
    const cleanVal = (value || '').trim();
    if (!cleanVal && matchedItem?.required) {
      return 'This field is required.';
    }

    return null;
  };

  const fetchPreviewData = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/checklist/${sessionId}`);
      if (!res.ok) {
        throw new Error('Failed to load form preview data.');
      }
      const data: ChecklistItem[] = await res.json();
      setItems(data);

      // Pre-fill local form states
      const updatedFields: Record<string, string> = {};
      data.forEach(item => {
        updatedFields[item.field] = item.extractedValue || '';
      });
      setFormData(prev => ({ ...prev, ...updatedFields }));

      // Run initial validations on mount
      const initialErrors: Record<string, string | null> = {};
      data.forEach(item => {
        initialErrors[item.field] = validateField(item.field, item.extractedValue || '', data);
      });
      setValidationErrors(initialErrors);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while loading preview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreviewData();
  }, [sessionId]);

  const handleFieldChange = (field: string, val: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: val
    }));
    
    // Live validation update on keystroke
    const err = validateField(field, val, items);
    setValidationErrors(prev => ({
      ...prev,
      [field]: err
    }));
  };

  const handleFieldBlur = async (field: string, val: string) => {
    let sanitizedVal = val;
    if (field === 'panNumber' || field === 'panOfBusiness') {
      sanitizedVal = sanitizePan(val);
    } else if (field === 'aadhaarNumber') {
      sanitizedVal = sanitizeAadhaar(val);
    } else if (field === 'ifscCode') {
      sanitizedVal = sanitizeIfsc(val);
    }

    if (sanitizedVal !== val) {
      setFormData(prev => ({
        ...prev,
        [field]: sanitizedVal
      }));
    }

    const err = validateField(field, sanitizedVal, items);
    setValidationErrors(prev => ({
      ...prev,
      [field]: err
    }));

    try {
      const res = await fetch('/api/manual-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, field, value: sanitizedVal })
      });
      if (!res.ok) {
        throw new Error('Failed to update form field.');
      }
      // Re-fetch checklist status to dynamically update check indicators
      const statusRes = await fetch(`/api/checklist/${sessionId}`);
      if (statusRes.ok) {
        const data: ChecklistItem[] = await statusRes.json();
        setItems(data);
        
        // Re-run validation across all fields to handle dependency checks
        const updatedErrors: Record<string, string | null> = {};
        data.forEach(item => {
          const itemVal = item.extractedValue || '';
          updatedErrors[item.field] = validateField(item.field, itemVal, data);
        });
        setValidationErrors(updatedErrors);
      }
    } catch (err) {
      console.error('Error saving preview form edit:', err);
    }
  };

  const getFieldStatus = (field: string): ChecklistItem['status'] => {
    const matched = items.find(i => i.field === field);
    return matched ? matched.status : 'missing';
  };

  const getInputStyleClass = (field: string) => {
    // If there's an active validation format error, highlight in red
    if (validationErrors[field]) return 'field-highlight-missing';

    const status = getFieldStatus(field);
    if (status === 'missing') return 'field-highlight-missing';
    if (status === 'unclear') return 'field-highlight-unclear';
    return '';
  };

  const renderValidationLabel = (field: string) => {
    // If there is an active inline formatting error, display it first
    if (validationErrors[field]) {
      return (
        <div className="field-validation-label missing" style={{ color: '#ef4444' }}>
          ⚠️ {validationErrors[field]}
        </div>
      );
    }

    const status = getFieldStatus(field);
    if (status === 'missing') {
      return (
        <div className="field-validation-label missing">
          ⚠️ Missing — Value is required for registration.
        </div>
      );
    }
    if (status === 'unclear') {
      return (
        <div className="field-validation-label unclear">
          ⚠️ Low Confidence — Please review and correct.
        </div>
      );
    }
    return null;
  };

  // Determine if form is valid to submit
  const hasErrors = Object.values(validationErrors).some(err => err !== null);

  return (
    <main className="main-content container">
      <div className="bg-glow"></div>

      <div className="card" id="preview-scaffold-card" style={{ maxWidth: '800px', width: '100%' }}>
        <StepTracker />
        <div className="status-badge" id="scaffold-status">
          <span className="status-dot"></span>
          Step 3: Form Preview & Corrections
        </div>

        <h1>Udyam Form Preview</h1>
        <p className="lead" style={{ marginBottom: '24px' }}>
          Below is your auto-filled registration profile. Missing or low-confidence extractions are highlighted. You can correct any field inline directly.
        </p>

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 0' }}>
            <span className="spinner"></span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Validating form inputs...</span>
          </div>
        )}

        {error && (
          <div className="status-banner error-banner" style={{ margin: '12px 0' }}>
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Dynamic Form Schema */}
        <form style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} onSubmit={(e) => e.preventDefault()}>
          
          {/* Section 1: Entrepreneur Profile */}
          <div style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: '#fff' }}>
            <h3 className="section-title" style={{ fontSize: '0.95rem', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '16px' }}>
              1. Personal & Identity Credentials
            </h3>
            <div className="form-grid">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="aadhaarNumber-preview" style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Aadhaar Number *</label>
                <input 
                  id="aadhaarNumber-preview"
                  type="text" 
                  className={getInputStyleClass('aadhaarNumber')}
                  value={formData.aadhaarNumber || ''}
                  onChange={(e) => handleFieldChange('aadhaarNumber', e.target.value)}
                  onBlur={(e) => handleFieldBlur('aadhaarNumber', e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.85rem' }}
                />
                {renderValidationLabel('aadhaarNumber')}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="name-preview" style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Entrepreneur Name *</label>
                <input 
                  id="name-preview"
                  type="text" 
                  className={getInputStyleClass('name')}
                  value={formData.name || ''}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  onBlur={(e) => handleFieldBlur('name', e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.85rem' }}
                />
                {renderValidationLabel('name')}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="panNumber-preview" style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Individual PAN *</label>
                <input 
                  id="panNumber-preview"
                  type="text" 
                  className={getInputStyleClass('panNumber')}
                  value={formData.panNumber || ''}
                  onChange={(e) => handleFieldChange('panNumber', e.target.value)}
                  onBlur={(e) => handleFieldBlur('panNumber', e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.85rem' }}
                />
                {renderValidationLabel('panNumber')}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="mobileNumber-preview" style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Aadhaar-Linked Mobile *</label>
                <input 
                  id="mobileNumber-preview"
                  type="text" 
                  className={getInputStyleClass('mobileNumber')}
                  value={formData.mobileNumber || ''}
                  onChange={(e) => handleFieldChange('mobileNumber', e.target.value)}
                  onBlur={(e) => handleFieldBlur('mobileNumber', e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.85rem' }}
                />
                {renderValidationLabel('mobileNumber')}
              </div>
            </div>
          </div>

          {/* Section 2: Organization Profile */}
          <div style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: '#fff' }}>
            <h3 className="section-title" style={{ fontSize: '0.95rem', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '16px' }}>
              2. Enterprise Registration Profile
            </h3>
            <div className="form-grid">
              <div className="form-group-span-2" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="businessName-preview" style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Enterprise Name *</label>
                <input 
                  id="businessName-preview"
                  type="text" 
                  className={getInputStyleClass('businessName')}
                  value={formData.businessName || ''}
                  onChange={(e) => handleFieldChange('businessName', e.target.value)}
                  onBlur={(e) => handleFieldBlur('businessName', e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.85rem' }}
                />
                {renderValidationLabel('businessName')}
              </div>

              <div className="form-group-span-2" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="businessAddress-preview" style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Business Address *</label>
                <textarea 
                  id="businessAddress-preview"
                  className={getInputStyleClass('businessAddress')}
                  value={formData.businessAddress || ''}
                  onChange={(e) => handleFieldChange('businessAddress', e.target.value)}
                  onBlur={(e) => handleFieldBlur('businessAddress', e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.85rem', height: '60px', fontFamily: 'inherit', resize: 'vertical' }}
                />
                {renderValidationLabel('businessAddress')}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="panOfBusiness-preview" style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Business PAN</label>
                <input 
                  id="panOfBusiness-preview"
                  type="text" 
                  disabled={getFieldStatus('panOfBusiness') === 'not_applicable'}
                  className={getInputStyleClass('panOfBusiness')}
                  value={getFieldStatus('panOfBusiness') === 'not_applicable' ? 'N/A - Proprietorship' : (formData.panOfBusiness || '')}
                  onChange={(e) => handleFieldChange('panOfBusiness', e.target.value)}
                  onBlur={(e) => handleFieldBlur('panOfBusiness', e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.85rem', backgroundColor: getFieldStatus('panOfBusiness') === 'not_applicable' ? '#f1f5f9' : '#fff' }}
                />
                {renderValidationLabel('panOfBusiness')}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="gstin-preview" style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>GSTIN (GST Number)</label>
                <input 
                  id="gstin-preview"
                  type="text" 
                  disabled={getFieldStatus('gstin') === 'not_applicable'}
                  className={getInputStyleClass('gstin')}
                  value={getFieldStatus('gstin') === 'not_applicable' ? 'N/A - Exempted' : (formData.gstin || '')}
                  onChange={(e) => handleFieldChange('gstin', e.target.value)}
                  onBlur={(e) => handleFieldBlur('gstin', e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.85rem', backgroundColor: getFieldStatus('gstin') === 'not_applicable' ? '#f1f5f9' : '#fff' }}
                />
                {renderValidationLabel('gstin')}
              </div>
            </div>
          </div>

          {/* Section 3: Financial & Operations */}
          <div style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: '#fff' }}>
            <h3 className="section-title" style={{ fontSize: '0.95rem', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '16px' }}>
              3. Finance & Operational Parameters
            </h3>
            <div className="form-grid">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="bankAccountNumber-preview" style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Bank Account Number *</label>
                <input 
                  id="bankAccountNumber-preview"
                  type="text" 
                  className={getInputStyleClass('bankAccountNumber')}
                  value={formData.bankAccountNumber || ''}
                  onChange={(e) => handleFieldChange('bankAccountNumber', e.target.value)}
                  onBlur={(e) => handleFieldBlur('bankAccountNumber', e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.85rem' }}
                />
                {renderValidationLabel('bankAccountNumber')}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="ifscCode-preview" style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>IFSC Code *</label>
                <input 
                  id="ifscCode-preview"
                  type="text" 
                  className={getInputStyleClass('ifscCode')}
                  value={formData.ifscCode || ''}
                  onChange={(e) => handleFieldChange('ifscCode', e.target.value)}
                  onBlur={(e) => handleFieldBlur('ifscCode', e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.85rem' }}
                />
                {renderValidationLabel('ifscCode')}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="nicCode-preview" style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>NIC Activity Code *</label>
                <input 
                  id="nicCode-preview"
                  type="text" 
                  className={getInputStyleClass('nicCode')}
                  value={formData.nicCode || ''}
                  onChange={(e) => handleFieldChange('nicCode', e.target.value)}
                  onBlur={(e) => handleFieldBlur('nicCode', e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.85rem' }}
                />
                {renderValidationLabel('nicCode')}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="investment-preview" style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Investment (INR) *</label>
                <input 
                  id="investment-preview"
                  type="text" 
                  className={getInputStyleClass('investment')}
                  value={formData.investment || ''}
                  onChange={(e) => handleFieldChange('investment', e.target.value)}
                  onBlur={(e) => handleFieldBlur('investment', e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.85rem' }}
                />
                {renderValidationLabel('investment')}
              </div>

              <div className="form-group-span-2" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="turnover-preview" style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Turnover (INR) *</label>
                <input 
                  id="turnover-preview"
                  type="text" 
                  className={getInputStyleClass('turnover')}
                  value={formData.turnover || ''}
                  onChange={(e) => handleFieldChange('turnover', e.target.value)}
                  onBlur={(e) => handleFieldBlur('turnover', e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.85rem' }}
                />
                {renderValidationLabel('turnover')}
              </div>
            </div>
          </div>
        </form>

        {/* Navigation Step Actions */}
        <div className="nav-action-bar">
          <button 
            type="button"
            className="nav-btn nav-btn-secondary"
            onClick={() => router.push(`/checklist?session=${sessionId}`)}
          >
            &larr; Back to Checklist
          </button>
          
          <button 
            type="button"
            className={`nav-btn nav-btn-primary ${hasErrors ? 'nav-btn-disabled' : ''}`}
            disabled={hasErrors}
            onClick={() => router.push(`/submit?session=${sessionId}`)}
          >
            Continue to Submission &rarr;
          </button>
        </div>
      </div>
    </main>
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <span className="spinner"></span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Loading registration form...</span>
        </div>
      </div>
    }>
      <PreviewContent />
    </Suspense>
  );
}
