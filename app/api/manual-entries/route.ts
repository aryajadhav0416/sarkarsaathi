import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, field, value } = await request.json();

    if (!sessionId || !field) {
      return NextResponse.json(
        { error: 'sessionId and field parameters are required.' },
        { status: 400 }
      );
    }

    const hasCredentials = 
      process.env.SUPABASE_SERVICE_ROLE_KEY && 
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder');

    if (hasCredentials) {
      const { error } = await supabaseAdmin
        .from('manual_entries')
        .upsert(
          { 
            session_id: sessionId, 
            field: field, 
            value: value !== null ? String(value) : null,
            created_at: new Date().toISOString()
          },
          { onConflict: 'session_id,field' }
        );

      if (error) {
        console.error('Supabase upsert error on manual_entries:', error);
        return NextResponse.json(
          { error: `Database save failed: ${error.message}` },
          { status: 500 }
        );
      }
    } else {
      console.warn('Supabase credentials missing or placeholder. Simulating manual entry save.');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Server error saving manual entry:', error);
    return NextResponse.json(
      { error: error?.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
