'use client';

import React, { useState, useEffect } from 'react';
import en from '@/lib/locales/en.json';
import hi from '@/lib/locales/hi.json';

interface ChecklistItem {
  field: string;
  required: boolean;
  status: 'present' | 'missing' | 'unclear' | 'not_applicable';
  extractedValue: string | null;
  source: 'extractable' | 'manual_only';
}

interface ChecklistProps {
  sessionId: string;
  refreshTrigger: number;
}

export default function Checklist({ sessionId, refreshTrigger }: ChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Language state & Persistence
  const [lang, setLang] = useState<'en' | 'hi'>('en');

  // States for manual settings
  const [businessType, setBusinessType] = useState('Proprietorship');
  const [gstRegistered, setGstRegistered] = useState('yes');

  // Input states for manual_only fields
  const [manualFields, setManualFields] = useState<Record<string, string>>({
    mobileNumber: '',
    nicCode: '',
    investment: '',
    turnover: ''
  });

  // Track expanded explanations
  const [openExplanations, setOpenExplanations] = useState<Record<string, boolean>>({});

  // Choose the active translation dictionary
  const t = lang === 'en' ? en : hi;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('sarkarsaathi_language') as 'en' | 'hi' | null;
      if (savedLang) {
        setLang(savedLang);
      }
    }
  }, []);

  const handleLanguageChange = (selectedLang: 'en' | 'hi') => {
    setLang(selectedLang);
    localStorage.setItem('sarkarsaathi_language', selectedLang);
  };

  const fetchChecklist = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/checklist/${sessionId}`);
      if (!res.ok) {
        throw new Error('Failed to load checklist status.');
      }
      const data: ChecklistItem[] = await res.json();
      setItems(data);

      // Extract the manual field values from checklist data to initialize input states
      const newManuals: Record<string, string> = {
        mobileNumber: '',
        nicCode: '',
        investment: '',
        turnover: ''
      };
      
      data.forEach(item => {
        if (item.source === 'manual_only' && item.extractedValue) {
          newManuals[item.field] = item.extractedValue;
        }
      });
      setManualFields(newManuals);

      // Check if businessType and gstRegistered values are in checklist response
      const bizTypeItem = data.find(i => i.field === 'businessType');
      if (bizTypeItem && bizTypeItem.extractedValue) {
        setBusinessType(bizTypeItem.extractedValue);
      }

      const gstinItem = data.find(i => i.field === 'gstin');
      if (gstinItem && gstinItem.status === 'not_applicable') {
        setGstRegistered('no');
      } else if (gstinItem && gstinItem.status !== 'not_applicable') {
        setGstRegistered('yes');
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while fetching checklist.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklist();
  }, [sessionId, refreshTrigger]);

  const saveManualEntry = async (field: string, value: string) => {
    try {
      const res = await fetch('/api/manual-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, field, value })
      });
      if (!res.ok) {
        throw new Error('Failed to save input.');
      }
      // Re-fetch checklist to recalculate applicability rules dynamically
      fetchChecklist();
    } catch (err) {
      console.error('Error saving manual input:', err);
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

  const toggleExplanation = (field: string) => {
    setOpenExplanations(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const getFriendlyFieldName = (field: string) => {
    // Read name from translation file if it exists, otherwise fall back to friendly string
    const translatedField = (t.fields as any)[field];
    if (translatedField && translatedField.label) {
      return translatedField.label;
    }

    switch (field) {
      case 'aadhaarNumber': return 'Aadhaar Number';
      case 'panNumber': return 'Individual PAN';
      case 'name': return 'Entrepreneur Name';
      case 'businessName': return 'Enterprise Name';
      case 'businessAddress': return 'Business Address';
      case 'businessType': return 'Organization Type';
      case 'panOfBusiness': return 'Business PAN';
      case 'gstin': return 'GSTIN';
      case 'bankAccountNumber': return 'Bank Account Number';
      case 'ifscCode': return 'IFSC Code';
      case 'mobileNumber': return 'Aadhaar-Linked Mobile';
      case 'nicCode': return 'NIC Activity Code';
      case 'investment': return 'Investment Figure (INR)';
      case 'turnover': return 'Turnover Figure (INR)';
      default:
        return field;
    }
  };

  const getStatusLabel = (status: ChecklistItem['status']) => {
    switch (status) {
      case 'present': return t.statusReady;
      case 'unclear': return t.statusUnclear;
      case 'missing': return t.statusMissing;
      case 'not_applicable': return t.statusNa;
    }
  };

  const getStatusBadgeClass = (status: ChecklistItem['status']) => {
    switch (status) {
      case 'present': return 'badge-high';
      case 'unclear': return 'badge-low';
      case 'missing': return 'badge-not_found';
      case 'not_applicable': return 'badge-na';
    }
  };

  const getFieldItemClass = (status: ChecklistItem['status']) => {
    switch (status) {
      case 'present': return 'conf-high';
      case 'unclear': return 'conf-low';
      case 'missing': return 'conf-not_found';
      case 'not_applicable': return ''; // neutral
    }
  };

  return (
    <div className="checklist-container" id="udyam-checklist-card" style={{ marginTop: '24px' }}>
      {/* Card Header with Lang Toggle */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderBottom: '1px solid var(--border)', 
          paddingBottom: '12px',
          marginBottom: '16px' 
        }}
      >
        <h2 className="section-title" style={{ margin: 0 }}>
          {t.title}
        </h2>
        
        {/* Bilingual Control Toggle Buttons */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => handleLanguageChange('en')}
            style={{
              padding: '4px 12px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              borderRadius: '4px',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              backgroundColor: lang === 'en' ? 'var(--primary)' : '#fff',
              color: lang === 'en' ? '#fff' : 'var(--text-primary)'
            }}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => handleLanguageChange('hi')}
            style={{
              padding: '4px 12px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              borderRadius: '4px',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              backgroundColor: lang === 'hi' ? 'var(--primary)' : '#fff',
              color: lang === 'hi' ? '#fff' : 'var(--text-primary)'
            }}
          >
            हिंदी
          </button>
        </div>
      </div>

      <p className="lead" style={{ fontSize: '0.85rem', marginBottom: '20px' }}>
        {t.subtitle}
      </p>

      {/* Dynamic Checklist Configurations */}
      <div 
        className="form-grid"
        style={{ 
          backgroundColor: '#f8fafc', 
          border: '1px solid var(--border)', 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '20px' 
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
            {t.entityTypeLabel}
          </label>
          <select 
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
          <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
            {t.gstRegisteredLabel}
          </label>
          <select 
            value={gstRegistered} 
            onChange={(e) => handleSettingChange('gstRegistered', e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.85rem', backgroundColor: '#fff' }}
          >
            <option value="yes">{t.gstYes}</option>
            <option value="no">{t.gstNo}</option>
          </select>
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 0' }}>
          <span className="spinner"></span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.refreshing}</span>
        </div>
      )}

      {error && (
        <div className="status-banner error-banner" style={{ margin: '12px 0' }}>
          <span>⚠️</span> {error}
        </div>
      )}

      {items.length > 0 && (
        <ul className="extracted-fields-list" style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', padding: 0 }}>
          {items.map((item) => {
            const fieldTranslation = (t.fields as any)[item.field] || {};
            const explanation = fieldTranslation.explanation || 'This detail is required to complete Udyam Registration.';
            const labelText = fieldTranslation.label || getFriendlyFieldName(item.field);
            
            const isExpanded = !!openExplanations[item.field];
            const isManualField = item.source === 'manual_only';
            const isNa = item.status === 'not_applicable';

            return (
              <li 
                key={item.field} 
                className={`extracted-field-item ${getFieldItemClass(item.status)}`}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '6px', 
                  backgroundColor: isNa ? '#f1f5f9' : 'var(--bg-base)', 
                  border: isNa ? '1px dashed var(--border)' : '1px solid var(--border)', 
                  padding: '12px 14px', 
                  borderRadius: '6px',
                  opacity: isNa ? 0.7 : 1
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: isNa ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                    {labelText}
                    {item.required && !isNa && <span style={{ color: 'red', marginLeft: '4px' }}>*</span>}
                    <span style={{ fontSize: '0.65rem', fontWeight: 'normal', color: 'var(--text-secondary)', marginLeft: '8px', textTransform: 'uppercase' }}>
                      ({item.source === 'manual_only' ? (lang === 'en' ? 'manual' : 'मैन्युअल') : (lang === 'en' ? 'document' : 'दस्तावेज़')})
                    </span>
                  </span>
                  
                  <span 
                    className={`confidence-badge ${getStatusBadgeClass(item.status)}`}
                    style={{ 
                      fontSize: '0.7rem', 
                      padding: '2px 8px', 
                      borderRadius: '9999px', 
                      fontWeight: '600', 
                      textTransform: 'capitalize',
                      backgroundColor: isNa ? '#cbd5e1' : undefined,
                      color: isNa ? '#475569' : undefined
                    }}
                  >
                    {getStatusLabel(item.status)}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: '4px' }}>
                  
                  {isNa ? (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      {t.notApplicableText}
                    </span>
                  ) : isManualField ? (
                    /* Manual field Input Form Control */
                    <input 
                      type="text"
                      placeholder={t.placeholderText.replace('{fieldName}', labelText)}
                      value={manualFields[item.field] || ''}
                      onChange={(e) => handleManualFieldChange(item.field, e.target.value)}
                      onBlur={(e) => saveManualEntry(item.field, e.target.value)}
                      style={{ 
                        flex: 1,
                        maxWidth: '300px',
                        padding: '6px 10px', 
                        border: '1px solid var(--border)', 
                        borderRadius: '4px', 
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    />
                  ) : (
                    /* Extractable field Display */
                    <span style={{ fontSize: '0.85rem', color: item.extractedValue ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {item.extractedValue || t.notUploadedYet}
                    </span>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => toggleExplanation(item.field)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: isNa ? 'var(--text-muted)' : 'var(--color-primary-light)',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline'
                    }}
                  >
                    {isExpanded ? t.hideInfo : t.whyNeeded}
                  </button>
                </div>

                {isExpanded && (
                  <div 
                    style={{ 
                      fontSize: '0.75rem', 
                      color: 'var(--text-secondary)', 
                      backgroundColor: '#f1f5f9', 
                      padding: '8px 10px', 
                      borderRadius: '4px', 
                      marginTop: '6px',
                      borderLeft: '3px solid var(--color-primary)' 
                    }}
                  >
                    {explanation}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
