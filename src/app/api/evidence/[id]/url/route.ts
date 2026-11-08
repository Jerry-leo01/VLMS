import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getServerStore } from '@/lib/services/server-store';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Evidence ID is required.' },
        { status: 400, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const supabase = getSupabaseAdmin();
    let storagePath: string | null = null;
    let storageBucket = 'vlms-evidence';

    if (supabase) {
      try {
        const { data: dbEvidence, error: dbError } = await supabase
          .from('evidence_files')
          .select('id, storage_bucket, storage_path')
          .eq('id', id)
          .maybeSingle();

        if (dbEvidence && !dbError) {
          storagePath = dbEvidence.storage_path;
          storageBucket = dbEvidence.storage_bucket || 'vlms-evidence';
        }
      } catch (dbEx) {
        console.warn('Failed to query evidence_files table for ID:', id, dbEx);
      }
    }

    // Check server store as fallback
    const localStore = getServerStore();
    const localEvidence = Array.isArray(localStore?.evidenceFiles)
      ? localStore.evidenceFiles.find((e: any) => e.id === id)
      : null;

    if (!storagePath && localEvidence?.storage_path) {
      storagePath = localEvidence.storage_path;
      storageBucket = localEvidence.storage_bucket || 'vlms-evidence';
    }

    // 1. Try generating ephemeral signed URL from Supabase Storage
    if (supabase && storagePath) {
      try {
        const { data, error } = await supabase.storage
          .from(storageBucket)
          .createSignedUrl(storagePath, 900); // 15-minute TTL

        if (!error && data?.signedUrl) {
          return NextResponse.json(
            {
              success: true,
              evidenceId: id,
              signedUrl: data.signedUrl,
              expiresIn: 900,
            },
            {
              headers: {
                'Cache-Control': 'private, max-age=600',
              },
            }
          );
        }
      } catch (storageEx) {
        console.warn('Failed to create signed URL from Supabase Storage:', storageEx);
      }
    }

    // 2. Return local data URL fallback if available
    if (localEvidence?.data_url) {
      return NextResponse.json(
        {
          success: true,
          evidenceId: id,
          signedUrl: localEvidence.data_url,
          isLocalFallback: true,
        },
        {
          headers: {
            'Cache-Control': 'private, max-age=60',
          },
        }
      );
    }

    return NextResponse.json(
      { error: 'Evidence photograph not found or could not be generated.' },
      { status: 404, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error: any) {
    console.error('Evidence URL generation error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate signed URL.' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }
}
