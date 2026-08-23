'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import StepTracker from '@/components/StepTracker';
import { jsPDF } from 'jspdf';

function SubmitContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session') || '';
  const [downloading, setDownloading] = useState(false);

  const handleDownloadSummary = async () => {
    if (!sessionId) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/checklist/${sessionId}`);
      if (!res.ok) throw new Error('Failed to fetch checklist report.');
      const items = await res.json();

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Colors matching the authoritative Government blues and neutral greys theme
      const primaryColor = [11, 60, 93];     // #0b3c5d
      const secondaryColor = [98, 114, 129]; // #627281
      const lightBg = [244, 246, 248];       // #f4f6f8
      const darkText = [28, 40, 51];         // #1c2833
      const borderCol = [204, 214, 221];     // #ccd6dd

      doc.setFont('helvetica', 'normal');

      // Top Header Banner
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 35, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('CIVICFORM AUDIT REPORT', 20, 20);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('AUDITED GOVERNMENT PAPERWORK COMPLIANCE', 20, 26);

      // Section 1: Session Details
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Audit Details', 20, 48);

      doc.setDrawColor(borderCol[0], borderCol[1], borderCol[2]);
      doc.setLineWidth(0.5);
      doc.line(20, 50, 190, 50);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('Session ID:', 20, 58);
      doc.text('Audited Program:', 20, 64);
      doc.text('Execution Date:', 20, 70);

      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(sessionId, 60, 58);
      doc.text('Udyam Registration Audit', 60, 64);
      doc.text(new Date().toLocaleString(), 60, 70);

      // Section 2: Form Profile Table
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Audited Registration Profile Data', 20, 84);
      doc.line(20, 86, 190, 86);

      let y = 96;
      doc.setFontSize(9);
      
      // Header row
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.rect(20, y - 6, 170, 8, 'F');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('Data Indicator / Requirement Field', 24, y - 1);
      doc.text('Status', 110, y - 1);
      doc.text('Audited Input Value', 145, y - 1);
      doc.line(20, y + 2, 190, y + 2);
      y += 10;

      items.forEach((item: any) => {
        // Handle page overflow safely
        if (y > 270) {
          doc.addPage();
          y = 30;
          doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
          doc.rect(20, y - 6, 170, 8, 'F');
          doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.setFont('helvetica', 'bold');
          doc.text('Data Indicator / Requirement Field', 24, y - 1);
          doc.text('Status', 110, y - 1);
          doc.text('Audited Input Value', 145, y - 1);
          doc.line(20, y + 2, 190, y + 2);
          y += 10;
        }

        // Draw Row values
        doc.setTextColor(darkText[0], darkText[1], darkText[2]);
        doc.setFont('helvetica', 'normal');
        
        // Map keys to readable text labels
        const fieldLabels: Record<string, string> = {
          aadhaarNumber: 'Aadhaar Number',
          name: 'Entrepreneur Name',
          mobileNumber: 'Aadhaar Mobile',
          panNumber: 'Individual PAN',
          panOfBusiness: 'Business PAN',
          gstin: 'GSTIN (GST Number)',
          businessName: 'Enterprise Name',
          businessAddress: 'Business Address',
          bankAccountNumber: 'Bank Account Number',
          ifscCode: 'IFSC Code',
          nicCode: 'NIC Activity Code',
          investment: 'Investment (INR)',
          turnover: 'Turnover (INR)',
        };
        const label = fieldLabels[item.field] || item.field;
        doc.text(label, 24, y);

        // Status Text values
        const statusText = {
          present: '✓ Present',
          missing: '✗ Missing',
          unclear: '⚠ Low Confidence',
          not_applicable: 'N/A (Exempt)',
        }[item.status as string] || item.status;

        // Apply status colors based on compliance rules
        if (item.status === 'present') {
          doc.setTextColor(25, 111, 61); // Green
        } else if (item.status === 'unclear') {
          doc.setTextColor(180, 115, 9); // Amber
        } else if (item.status === 'missing' && item.required) {
          doc.setTextColor(180, 40, 40); // Red
        } else {
          doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        }
        doc.setFont('helvetica', 'bold');
        doc.text(statusText, 110, y);

        // Render audited value
        doc.setTextColor(darkText[0], darkText[1], darkText[2]);
        doc.setFont('helvetica', 'normal');
        const val = item.extractedValue ? String(item.extractedValue) : 'Not Provided';
        
        if (label === 'Business Address' && val.length > 25) {
          doc.text(val.substring(0, 22) + '...', 145, y);
        } else {
          doc.text(val, 145, y);
        }

        // Row Separator Line
        doc.setDrawColor(borderCol[0], borderCol[1], borderCol[2]);
        doc.setLineWidth(0.2);
        doc.line(20, y + 2, 190, y + 2);
        y += 10;
      });

      // Bottom Footer note
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('This is an automated compliance report generated by Sarkar Saathi. Please verify all details prior to government registration submission.', 20, 285);
      doc.text(`Session: ${sessionId}`, 160, 285);

      doc.save(`udyam-audit-summary-${sessionId}.pdf`);
    } catch (err: any) {
      console.error('PDF generation error:', err);
      alert('Failed to generate PDF summary. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main className="main-content container">
      <div className="bg-glow"></div>
      
      <div className="card" id="submit-scaffold-card" style={{ maxWidth: '650px' }}>
        <StepTracker />
        
        <div className="status-badge" id="scaffold-status">
          <span className="status-dot"></span>
          Step 4: Submission & Verification
        </div>

        <h1>Udyam Portal Submission</h1>
        <p className="lead" style={{ marginBottom: '24px' }}>
          Your registration inputs are fully verified and formatted. You are now ready to file on the official government portal.
        </p>

        {/* Portal Information Note */}
        <div style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: '#f8fafc', marginBottom: '24px' }}>
          <h4 style={{ fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>⚠️ Official Submission Notice</h4>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            The official government Udyam Registration portal **does not accept document uploads**. 
            Instead, it queries live central databases using your Aadhaar (via OTP validation), PAN card, and GSTIN. 
            Sarkar Saathi's role ends at auditing and providing you with accurate, correctly formatted registration fields so your application is approved first-time without bureaucratic delay.
          </p>
        </div>

        {/* Main CTA Button to Udyam Registration */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', marginBottom: '24px' }}>
          <a
            href="https://udyamregistration.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-btn nav-btn-primary"
            style={{ 
              width: '100%', 
              padding: '14px', 
              fontSize: '1rem', 
              textAlign: 'center', 
              boxShadow: 'var(--shadow-md)',
              backgroundColor: 'var(--primary)',
              border: 'none',
              borderRadius: '6px'
            }}
          >
            Continue to Udyam Portal &rarr;
          </a>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Opens the official government registration portal in a new tab
          </span>
        </div>

        {/* Navigation Step Actions */}
        <div className="nav-action-bar">
          <button 
            type="button"
            className="nav-btn nav-btn-secondary"
            onClick={() => router.push(`/preview?session=${sessionId}`)}
          >
            &larr; Back to Preview
          </button>
          
          <button 
            type="button"
            className="nav-btn nav-btn-primary"
            onClick={handleDownloadSummary}
            disabled={downloading}
          >
            {downloading ? 'Generating PDF...' : 'Download Summary (PDF)'}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function SubmitPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <span className="spinner"></span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Loading submit stage...</span>
        </div>
      </div>
    }>
      <SubmitContent />
    </Suspense>
  );
}
