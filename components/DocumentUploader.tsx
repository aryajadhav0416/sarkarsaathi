'use client';

import React, { useState, useEffect } from 'react';

interface ExtractedData {
  fields: Record<string, string | null>;
  confidence: Record<string, 'high' | 'low' | 'not_found'>;
}

interface UploadResult {
  fileId: string;
  docType: string;
  originalName: string;
  status: string;
  extracted?: ExtractedData;
}

interface DocumentUploaderProps {
  onUploadComplete?: () => void;
  sessionId?: string;
}

export default function DocumentUploader({ onUploadComplete, sessionId: propSessionId }: DocumentUploaderProps) {
  const [docType, setDocType] = useState('aadhaar');
  const [file, setFile] = useState<File | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extractionFailed, setExtractionFailed] = useState<string | null>(null);

  // Retrieve or generate a persistent session ID for scoping uploads
  useEffect(() => {
    if (propSessionId) {
      setSessionId(propSessionId);
    } else if (typeof window !== 'undefined') {
      let sid = localStorage.getItem('civicform_session_id');
      if (!sid) {
        sid = 'session_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('civicform_session_id', sid);
      }
      setSessionId(sid);
    }
  }, [propSessionId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setExtractionFailed(null);
      setResult(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setLoading(true);
    setError(null);
    setExtractionFailed(null);
    setResult(null);

    const formData = new FormData();
    formData.append('document', file);
    formData.append('docType', docType);
    formData.append('sessionId', sessionId);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.status === 'extraction_failed') {
          setExtractionFailed(data.error || "The document could not be read. Please make sure the upload is clear and not password-protected.");
        } else {
          setError(data.error || 'An unexpected error occurred during upload. Please verify your file and try uploading again.');
        }
      } else {
        setResult(data);
        setFile(null); // clear selection
        const fileInput = document.getElementById('document-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        if (onUploadComplete) onUploadComplete();
      }
    } catch (err) {
      setError('Connection error. We could not reach the upload server. Please check your internet connection and try uploading again.');
    } finally {
      setLoading(false);
    }
  };

  // Convert CamelCase to readable Title Case (e.g. aadhaarNumber -> Aadhaar Number)
  const formatFieldLabel = (key: string) => {
    const spaced = key.replace(/([A-Z])/g, ' $1');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  };

  return (
    <div className="uploader-container" id="document-uploader-root">
      <h2 className="section-title" style={{ marginTop: '0px', fontSize: '0.9rem' }}>
        Upload Support Documentation
      </h2>
      
      <form onSubmit={handleUpload} className="upload-form">
        <div className="form-group">
          <label htmlFor="docType-select" className="form-label">
            Select Document Type
          </label>
          <select
            id="docType-select"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="form-select"
            disabled={loading}
          >
            <option value="aadhaar">Aadhaar Card (Identity Proof)</option>
            <option value="pan">PAN Card (Tax Registration)</option>
            <option value="gstCertificate">GST Certificate</option>
            <option value="bankProof">Bank Proof (Statement/Passbook)</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Document File</label>
          <div className={`upload-zone ${file ? 'has-file' : ''}`}>
            <input
              type="file"
              id="document-file-input"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              disabled={loading}
              className="file-input-hidden"
            />
            <label htmlFor="document-file-input" className="file-input-label">
              <span className="upload-icon">📤</span>
              {file ? (
                <span className="file-info-text">
                  <strong>Selected:</strong> {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </span>
              ) : (
                <span className="file-placeholder-text">
                  Choose a PDF, PNG, or JPG file...
                </span>
              )}
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !file}
          id="btn-submit-upload"
          style={{ marginTop: '16px' }}
        >
          {loading ? (
            <span className="loading-state" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span className="spinner"></span> Extracting Text...
            </span>
          ) : (
            'Submit File'
          )}
        </button>
      </form>

      {error && (
        <div className="status-banner error-banner" id="upload-error-display">
          <span className="banner-icon">⚠️</span>
          <div className="banner-content">
            <span className="banner-title">Upload Rejected</span>
            <p>{error}</p>
          </div>
        </div>
      )}

      {extractionFailed && (
        <div className="status-banner error-banner" id="extraction-failed-display">
          <span className="banner-icon">🔍</span>
          <div className="banner-content">
            <span className="banner-title">Extraction Failed</span>
            <p>{extractionFailed}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="status-banner success-banner" id="upload-success-display">
          <span className="banner-icon">✅</span>
          <div className="banner-content" style={{ width: '100%' }}>
            <span className="banner-title">Document Received</span>
            <ul className="result-details">
              <li>
                <span>Status:</span> <strong>{result.status}</strong>
              </li>
              <li>
                <span>File Name:</span> <span>{result.originalName}</span>
              </li>
              <li>
                <span>File ID:</span> <span className="mono-value">{result.fileId}</span>
              </li>
            </ul>

            {result.extracted && (
              <div className="extracted-fields-section" style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <span className="banner-title" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '10px' }}>
                  Extracted Fields (OCR)
                </span>
                
                <ul className="extracted-fields-list" style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {Object.entries(result.extracted.fields).map(([key, value]) => {
                    const confidence = result.extracted?.confidence[key] || 'not_found';
                    return (
                      <li key={key} className={`extracted-field-item conf-${confidence}`} style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: 'var(--bg-base)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                          {formatFieldLabel(key)}
                        </span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '500', color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {value || 'Not Found'}
                          </span>
                          <span className={`confidence-badge badge-${confidence}`} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '9999px', fontWeight: '600', textTransform: 'capitalize' }}>
                            {confidence === 'not_found' ? 'Missing' : `${confidence} confidence`}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {Object.values(result.extracted.confidence).includes('low') && (
                  <div className="low-confidence-warning" style={{ marginTop: '12px', fontSize: '0.75rem', color: '#b45309', display: 'flex', gap: '6px', alignItems: 'center', backgroundColor: '#fef3c7', padding: '8px 12px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                    <span>⚠️</span>
                    <span>Some fields were extracted with low confidence. Please verify their spelling/accuracy.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unstyled Debug/Proof Results Screen */}
      {result && result.extracted && (
        <div id="debug-results-screen" style={{ marginTop: '24px', padding: '16px', border: '2px solid #000', background: '#fff', color: '#000', fontFamily: 'monospace', fontSize: '14px', textAlign: 'left' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '6px' }}>
            DEBUG PROOF: Extracted Object
          </h3>
          <ul style={{ paddingLeft: '20px', margin: '0 0 16px 0', listStyleType: 'disc' }}>
            {Object.entries(result.extracted.fields).map(([field, value]) => {
              const confidence = result.extracted?.confidence[field] || 'not_found';
              return (
                <li key={field} style={{ marginBottom: '6px' }}>
                  Field: "{field}" | Value: "{value || 'null'}" | Confidence: "{confidence}"
                </li>
              );
            })}
          </ul>
          <div>
            <strong>Raw Extracted JSON:</strong>
            <pre style={{ margin: '8px 0 0 0', background: '#f0f0f0', border: '1px solid #ccc', padding: '8px', overflowX: 'auto', fontSize: '12px' }}>
              {JSON.stringify(result.extracted, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
