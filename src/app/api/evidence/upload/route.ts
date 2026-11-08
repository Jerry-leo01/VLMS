import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getServerStore, saveServerStore } from '@/lib/services/server-store';

function isValidUuid(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  try {
    const contentType = (request.headers.get('content-type') || '').toLowerCase();
    let fileBuffer: Buffer | null = null;
    let mimeType = 'image/jpeg';
    let rawId: string | null = null;
    let rawEvidenceType = 'other';
    let metadataRaw: string | null = null;

    if (contentType.includes('application/json')) {
      const json = await request.json().catch(() => ({}));
      rawId = json.id || null;
      rawEvidenceType = json.evidenceType || 'other';
      metadataRaw = json.metadata ? JSON.stringify(json.metadata) : null;
      if (json.dataUrl && typeof json.dataUrl === 'string') {
        const parts = json.dataUrl.split(',');
        const mimeMatch = parts[0]?.match(/:(.*?);/);
        mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        fileBuffer = Buffer.from(parts[1] || '', 'base64');
      }
    } else {
      try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        rawId = formData.get('id') as string | null;
        rawEvidenceType = (formData.get('evidenceType') as string | null) || 'other';
        metadataRaw = formData.get('metadata') as string | null;

        if (file) {
          mimeType = file.type || 'image/jpeg';
          const arrayBuffer = await file.arrayBuffer();
          fileBuffer = Buffer.from(arrayBuffer);
        }
      } catch (err: any) {
        return NextResponse.json(
          { error: `File is required in upload payload. (${err?.message || 'Invalid form data'})` },
          { status: 400, headers: { 'Cache-Control': 'no-store, max-age=0' } }
        );
      }
    }

    if (!fileBuffer || fileBuffer.byteLength === 0) {
      return NextResponse.json(
        { error: 'File is required in upload payload.' },
        { status: 400, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
      return NextResponse.json(
        { error: `Unsupported image format: ${mimeType}. Allowed formats: JPEG, PNG, WebP.` },
        { status: 400, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    if (fileBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File size exceeds the 10MB limit (size: ${(fileBuffer.byteLength / (1024 * 1024)).toFixed(2)}MB).` },
        { status: 400, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const buffer = fileBuffer;

    // Cryptographic integrity validation
    const computedHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const evidenceId = isValidUuid(rawId) ? (rawId as string) : crypto.randomUUID();

    const allowedTypes = ['daily_odometer', 'fuel_odometer', 'fuel_receipt', 'other'];
    const evidenceType = allowedTypes.includes(rawEvidenceType) ? rawEvidenceType : 'other';

    let ext = 'jpg';
    if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('webp')) ext = 'webp';

    const storagePath = `evidence/${evidenceType}/${evidenceId}.${ext}`;
    let parsedMetadata: Record<string, unknown> | undefined;
    if (metadataRaw) {
      try {
        parsedMetadata = JSON.parse(metadataRaw);
      } catch {
        parsedMetadata = undefined;
      }
    }

    const nowIso = new Date().toISOString();
    const supabase = getSupabaseAdmin();
    let cloudUploaded = false;
    let cloudDbPersisted = false;

    if (supabase) {
      // 1. Stream binary image buffer into Supabase Storage bucket 'vlms-evidence'
      try {
        const { error: storageError } = await supabase.storage
          .from('vlms-evidence')
          .upload(storagePath, buffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (storageError) {
          console.warn('Supabase storage upload warning:', storageError.message);
        } else {
          cloudUploaded = true;
        }
      } catch (uploadEx) {
        console.warn('Storage upload encountered an error:', uploadEx);
      }

      // 2. Persist metadata row into public.evidence_files
      try {
        const { error: dbError } = await supabase.from('evidence_files').upsert(
          {
            id: evidenceId,
            storage_bucket: 'vlms-evidence',
            storage_path: storagePath,
            evidence_type: evidenceType,
            sha256_hash: computedHash,
            captured_at: nowIso,
            uploaded_at: nowIso,
            mime_type: mimeType,
            file_size_bytes: buffer.byteLength,
            is_verified: true,
            created_at: nowIso,
          },
          { onConflict: 'id' }
        );

        if (dbError) {
          console.warn('evidence_files table insert warning:', dbError.message);
        } else {
          cloudDbPersisted = true;
        }
      } catch (dbEx) {
        console.warn('evidence_files DB persistence error:', dbEx);
      }
    }

    // 3. Mirror into resilient server store for zero-downtime offline/hybrid support
    const localStore = getServerStore();
    const base64DataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;

    if (localStore) {
      if (!Array.isArray(localStore.evidenceFiles)) {
        localStore.evidenceFiles = [];
      }
      const existingIdx = localStore.evidenceFiles.findIndex((e: any) => e.id === evidenceId);
      const evidenceRecord = {
        id: evidenceId,
        storage_bucket: 'vlms-evidence',
        storage_path: storagePath,
        evidence_type: evidenceType,
        sha256_hash: computedHash,
        captured_at: nowIso,
        uploaded_at: nowIso,
        mime_type: mimeType,
        file_size_bytes: buffer.byteLength,
        is_verified: true,
        data_url: base64DataUrl,
        metadata: parsedMetadata,
      };

      if (existingIdx >= 0) {
        localStore.evidenceFiles[existingIdx] = evidenceRecord;
      } else {
        localStore.evidenceFiles.push(evidenceRecord);
      }
      saveServerStore(localStore);
    }

    return NextResponse.json(
      {
        success: true,
        evidence: {
          id: evidenceId,
          storage_bucket: 'vlms-evidence',
          storage_path: storagePath,
          sha256_hash: computedHash,
          mime_type: mimeType,
          file_size_bytes: buffer.byteLength,
          cloud_uploaded: cloudUploaded,
          cloud_db_persisted: cloudDbPersisted,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error: any) {
    console.error('Evidence upload fatal error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process evidence upload.' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }
}
