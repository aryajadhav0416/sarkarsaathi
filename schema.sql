-- Table: extractions
-- Stores metadata and OCR-extracted fields for uploaded application documents.
CREATE TABLE IF NOT EXISTS extractions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  original_name TEXT NOT NULL,
  extracted_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index to quickly lookup data associated with a user's session
CREATE INDEX IF NOT EXISTS idx_extractions_session_id ON extractions(session_id);

-- Table: manual_entries
-- Stores user-inputted values and checkbox configuration settings.
CREATE TABLE IF NOT EXISTS manual_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  field TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (session_id, field)
);

CREATE INDEX IF NOT EXISTS idx_manual_entries_session_id ON manual_entries(session_id);
