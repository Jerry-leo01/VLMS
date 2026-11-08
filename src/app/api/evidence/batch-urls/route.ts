import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getServerStore } from '@/lib/services/server-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];

    if (!ids || ids.length === 0) {
      return NextResponse.json({ success: true, urls: {} });
    }

    // Limit batch size to 100 to prevent payload exhaustion
    const targetIds = ids.slice(0, 100);
    const resolvedUrls: Record<string, string> = {};

    const supabase = getSupabaseAdmin();
    const pathToIdMap = new Map<string, string>();
    const storagePaths: string[] = [];

    if (supabase) {
      try {
        const { data: dbRows, error } = await supabase
          .from('evidence_files')
          .select('id, storage_bucket, storage_path')
          .in('id', targetIds);

        if (!error && Array.isArray(dbRows)) {
          for (const row of dbRows) {
            if (row.storage_path) {
              storagePaths.push(row.storage_path);
              pathToIdMap.set(row.storage_path, row.id);
            }
          }

          if (storagePaths.length > 0) {
            const { data: signedData, error: signedError } = await supabase.storage
              .from('vlms-evidence')
              .createSignedUrls(storagePaths, 900); // 15 mins

            if (!signedError && Array.isArray(signedData)) {
              for (const item of signedData) {
                if (item.signedUrl && item.path) {
                  const evId = pathToIdMap.get(item.path);
                  if (evId) {
                    resolvedUrls[evId] = item.signedUrl;
                  }
                }
              }
            }
          }
        }
      } catch (dbEx) {
        console.warn('Batch DB lookup error:', dbEx);
      }
    }

    // Check local store for any missing IDs
    const localStore = getServerStore();
    if (localStore?.evidenceFiles) {
      for (const id of targetIds) {
        if (!resolvedUrls[id]) {
          const match = localStore.evidenceFiles.find((e: any) => e.id === id);
          if (match?.data_url) {
            resolvedUrls[id] = match.data_url;
          }
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        urls: resolvedUrls,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=600',
        },
      }
    );
  } catch (error: any) {
    console.error('Batch evidence URL error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate batch signed URLs.' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }
}
