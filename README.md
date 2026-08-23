# Sarkar Saathi (CivicForm) — AI Paperwork Audit Assistant

Sarkar Saathi is an AI-powered paperwork audit assistant built to solve the high rejection rates and bureaucratic delays faced by micro, small, and medium enterprises (MSMEs) when applying for government registration programs. Due to complex form rules, cryptic error handling on government portals, and minor data discrepancies across ID credentials, applicants frequently submit mismatched or incorrectly formatted numbers. Sarkar Saathi acts as a pre-registration auditing layer—extracting, validating, and formatting ID credentials automatically to ensure a first-time-right portal application.

---

> [!IMPORTANT]
> **NOTICE REGARDING OFFICIAL UDYAM PORTAL FILING**
> The official Udyam Registration portal **requires no document uploads**. It verifies PAN, Aadhaar, and GSTIN live against central government databases via self-declaration and OTP authentication. This tool's document upload, OCR, and extraction features act purely as an optional convenience layer to reduce manual data-entry formatting errors. It is not a substitute for, endorsement of, or requirement of the official government filing process.

---

## 🚀 Features Actually Implemented

### 1. Document Extraction & OCR
* **Support for 4 Core Document Types**:
  * **Aadhaar Card**: Extracts Aadhaar number and full name.
  * **PAN Card**: Extracts PAN card number and full name.
  * **GST Certificate**: Extracts 15-character GSTIN, trade name, legal business name, and physical address.
  * **Bank Proof**: Extracts bank account number and 11-digit IFSC code from bank statements/cancelled checks.
* Powered by client-side OCR text extraction (`tesseract.js`) with regular expression parsing fallbacks.

### 2. Built-in Error Auditing & Warning Prompts
* **Wrong Document Mismatches**: Detects and alerts the user if they mistakenly upload a PAN card into the Aadhaar dropzone, or a GST certificate into the Bank Proof dropzone.
* **Blurry Scan Warning**: Flags and rejects blurry, empty, or low-resolution images with action-oriented warnings (e.g. asking the user to upload a digital PDF copy instead).
* **Identity Name Mismatch Verification**: Compares extracted names token-by-token across Aadhaar and PAN documents. Rejecting the upload if they belong to different individuals (e.g. comparing "Amit Sharma" vs "Amit Kumar Sharma" passes, but "Amit Sharma" vs "Rajesh Verma" fails).

### 3. Dynamic Bilingual Audit Checklist
* Evaluates 13 required fields dynamically to determine their compliance status (`✓ Present`, `✗ Missing`, `⚠ Low Confidence`, or `N/A (Exempt)`).
* Supports **Bilingual Toggle (English / Hindi)**. Switch language instantly updates checklist headers, field labels, error messages, and descriptions.
* Persists the language choice in local storage so the selection is retained on navigation and page refreshes.

### 4. Interactive Form Preview & Corrections
* Auto-fills Udyam Registration input schemas using extracted data.
* Highlights missing values in **red** and low-confidence extractions in **yellow**.
* Allows the user to correct or input fields inline. Updates and validates fields on-blur.
* **Format Validation Rules**:
  * **Aadhaar**: Exactly 12 digits or in safe masked format (`XXXX XXXX 1234`).
  * **PAN**: 10 characters matching standard format (`AAAAA9999A`).
  * **GSTIN**: 15 characters matching government format (state code, PAN, entity indicator, default "Z", checksum).
  * **IFSC**: 11 characters matching standard bank rules (4 letters, "0", 6 alphanumeric chars).
  * **Business Name**: Prevents empty submission.
* If any validation error exists, navigation to the final step is locked out.

### 5. Shared StepTracker Navigation Timeline
* Renders a timeline connector (`Upload` -> `Checklist` -> `Review` -> `Submit`) across all 4 stages.
* Dynamically highlights the active stage, marks preceding routes as completed, and lets the user click back to completed steps while carrying the session ID parameter.

### 6. PDF Summary Exporter & Redirect
* **Download Summary**: Generates a clean A4 PDF of the audited profile, session metadata, execution timestamp, and compliance checklists using standard government navy branding.
* **Portal Redirect**: Guides users to the official government portal with a redirect button pointing to `https://udyamregistration.gov.in/` in a new tab.

---

## 🛠️ Technology Stack
* **Framework**: Next.js 16 (App Router)
* **Language**: TypeScript
* **Database & Storage**: Supabase (Postgres Database & Storage buckets)
* **OCR Library**: Tesseract.js (Client-side)
* **PDF Exporter**: jsPDF (Client-side)
* **Styles**: Custom Vanilla CSS (designed for high-contrast WCAG AA accessibility, mobile-responsive layout grids, and keyboard focus states)

---

## ⚙️ Setup & Local Installation

### 1. Prerequisites
Ensure you have [Node.js (v18+)](https://nodejs.org/) installed.

### 2. Install Dependencies
Run the install command in the project root:
```bash
npm install
```

### 3. Set Up Database Schema
Run the SQL definitions file [schema.sql](file:///home/arya/Projects/PrasunethonMVP/schema.sql) in your Postgres database or Supabase SQL Editor. This sets up:
* `extractions` table: Stores document extraction results and confidence flags.
* `manual_entries` table: Stores configuration overrides, manual form fields, and inline corrections.

### 4. Configure Environment Variables
Create a file named `.env.local` in the project root:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 5. Run the Local Dev Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to view the application.

---

## 🔒 Data Handling & Privacy
* **Temporary Processing**: Document buffers are uploaded to your Supabase private bucket to execute OCR. They are stored securely and are not shared with any third-party APIs.
* **Sensitive Data Masking**: Aadhaar card numbers and bank account numbers are masked inside the database and screen displays (e.g. `XXXX XXXX 1234`) to respect user privacy constraints.

---

## 🏗️ Architecture & Scalability

Sarkar Saathi separates core checklist mechanics from scheme-specific content metadata. All Udyam Registration definitions (such as target fields, source categories, validators, language labels, and extraction rules) live in a single scheme configuration module:
* [lib/schemes/udyam.ts](file:///home/arya/Projects/PrasunethonMVP/lib/schemes/udyam.ts)

The checklist renderer, validation parser, and preview forms read from this config dynamically based on an active selector constant:
* [lib/schemes/index.ts](file:///home/arya/Projects/PrasunethonMVP/lib/schemes/index.ts) (`ACTIVE_SCHEME = "udyam"`)

This design choice ensures that supporting a second government paperwork scheme later (e.g., PM Vishwakarma, Startup India Recognition) simply means adding a new scheme configuration file under `lib/schemes/`, without rewrite of the core pages or layout structures.

---

## 🚫 Out of Scope for this Prototype
The following features are out of scope for the current MVP build:
* **Live Government Submission**: Sending data directly to the official government databases or simulating Aadhaar OTP verification.
* **Forms beyond Udyam**: The prototype only configures the Udyam Registration scheme (PM Vishwakarma and others are currently mock options).
* **Real Authentication**: User logins or persistent user account profiles.
* **OCR for Handwritten Documents**: Text extraction is optimized for digital PDFs and clear printed document photos.
