import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { activeSchemeConfig } from '@/lib/schemes';

export const runtime = 'nodejs';

// Define the structure of a checklist item
interface ChecklistItem {
  field: string;
  required: boolean;
  status: 'present' | 'missing' | 'unclear' | 'not_applicable';
  extractedValue: string | null;
  source: 'extractable' | 'manual_only';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required.' },
        { status: 400 }
      );
    }

    const hasCredentials = 
      process.env.SUPABASE_SERVICE_ROLE_KEY && 
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder');

    let extractions: any[] = [];
    let manualEntries: any[] = [];

    // 1. Query Supabase tables if credentials are set
    if (hasCredentials) {
      // Fetch extractions
      const { data: extData, error: extError } = await supabaseAdmin
        .from('extractions')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (extError) {
        console.error('Database query error on extractions fetch:', extError);
        return NextResponse.json(
          { error: `Database error (extractions): ${extError.message}` },
          { status: 500 }
        );
      }
      extractions = extData || [];

      // Fetch manual entries
      const { data: manData, error: manError } = await supabaseAdmin
        .from('manual_entries')
        .select('*')
        .eq('session_id', sessionId);

      if (manError) {
        console.error('Database query error on manual_entries fetch:', manError);
        return NextResponse.json(
          { error: `Database error (manual_entries): ${manError.message}` },
          { status: 500 }
        );
      }
      manualEntries = manData || [];
    } else {
      console.warn('Supabase credentials missing. Returning simulated checklist.');
    }

    // 2. Map manual entries to key-value pairs
    const manualMap: Record<string, string | null> = {};
    manualEntries.forEach((row) => {
      manualMap[row.field] = row.value;
    });

    // 3. Aggregate all extracted values and confidence levels from processed documents dynamically
    const aggregatedValues: Record<string, string | null> = {};
    const aggregatedConfidence: Record<string, 'high' | 'low' | 'not_found'> = {};

    // Initialize all configured fields
    activeSchemeConfig.fields.forEach((f: any) => {
      aggregatedValues[f.field] = null;
      aggregatedConfidence[f.field] = 'not_found';
    });

    extractions.forEach((row) => {
      const docType = row.doc_type;
      const extracted = row.extracted_data || {};
      const fields = extracted.fields || {};
      const confidence = extracted.confidence || {};

      const mapping = activeSchemeConfig.docTypeMappings[docType];
      if (mapping) {
        Object.entries(mapping).forEach(([extractedKey, fieldKey]: [string, any]) => {
          if (fields[extractedKey]) {
            // Fallback: entrepreneur name should prioritize Aadhaar over PAN
            if (fieldKey === 'name' && docType === 'pan' && aggregatedValues.name) {
              return;
            }
            aggregatedValues[fieldKey] = fields[extractedKey];
            aggregatedConfidence[fieldKey] = confidence[extractedKey] || 'high';
          }
        });
      }
    });

    // Run custom scheme post-process hook if exists (e.g. business type inference)
    if (activeSchemeConfig.postProcess) {
      activeSchemeConfig.postProcess(aggregatedValues, aggregatedConfidence);
    }

    // Settings map for checking dynamic applicability rules
    const settings: Record<string, string> = {};
    activeSchemeConfig.fields.forEach((f: any) => {
      settings[f.field] = manualMap[f.field] || aggregatedValues[f.field] || '';
    });
    // Add explicitly setting flags (like gstRegistered, businessType) from manualMap
    Object.assign(settings, manualMap);
    if (!settings.businessType && aggregatedValues.businessType) {
      settings.businessType = aggregatedValues.businessType;
    }

    // 4. Map aggregated data and manual entries to build dynamic checklist
    const checklist: ChecklistItem[] = activeSchemeConfig.fields.map((ref: any) => {
      let value: string | null = null;
      let confidence: 'high' | 'low' | 'not_found' = 'not_found';
      let status: 'present' | 'missing' | 'unclear' | 'not_applicable' = 'missing';

      // Check dynamic applicability
      const isApplicable = ref.isApplicable ? ref.isApplicable(settings) : true;

      if (!isApplicable) {
        status = 'not_applicable';
      } else {
        if (ref.source === 'extractable') {
          value = aggregatedValues[ref.field];
          confidence = aggregatedConfidence[ref.field];

          // Fallback check if the value was saved in manual_entries (manual form correction)
          if (value === null && manualMap[ref.field]) {
            value = manualMap[ref.field];
            confidence = 'high'; // Manually corrected is treated as high confidence
          }
        } else {
          // Manual Only fields read directly from manualMap
          value = manualMap[ref.field] || null;
          confidence = value ? 'high' : 'not_found';
        }

        // Compute status code
        if (value !== null && value.trim() !== '') {
          if (confidence === 'high') {
            status = 'present';
          } else if (confidence === 'low') {
            status = 'unclear';
          }
        }
      }

      // Dynamically compute required status (if not applicable, required is false)
      const required = isApplicable ? ref.required : false;

      return {
        field: ref.field,
        required,
        status,
        extractedValue: value,
        source: ref.source
      };
    });

    return NextResponse.json(checklist);

  } catch (error: any) {
    console.error('Checklist calculation API error:', error);
    return NextResponse.json(
      { error: error?.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
