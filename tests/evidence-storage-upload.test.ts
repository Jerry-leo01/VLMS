import { describe, it, expect, beforeEach } from 'vitest';
import { POST as uploadEvidence } from '@/app/api/evidence/upload/route';
import { GET as getEvidenceUrl } from '@/app/api/evidence/[id]/url/route';
import { POST as getBatchUrls } from '@/app/api/evidence/batch-urls/route';
import { getServerStore, saveServerStore } from '@/lib/services/server-store';
import crypto from 'crypto';

describe('Photographic Evidence Cloud Storage & Viewing Architecture', () => {
  beforeEach(() => {
    // Reset server store
    const store = getServerStore();
    if (store) {
      store.evidenceFiles = [];
      saveServerStore(store);
    }
  });

  it('rejects evidence upload when file is missing', async () => {
    const request = new Request('http://localhost:3000/api/evidence/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evidenceType: 'daily_odometer' }),
    });

    const response = await uploadEvidence(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.error).toContain('File is required');
  });

  it('rejects evidence upload with invalid MIME type', async () => {
    const request = new Request('http://localhost:3000/api/evidence/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evidenceType: 'daily_odometer',
        dataUrl: 'data:text/plain;base64,aGVsbG8=',
      }),
    });

    const response = await uploadEvidence(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.error).toContain('Unsupported image format');
  });

  it('accepts valid JPEG evidence upload and computes SHA-256 digest', async () => {
    const mockImageBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const expectedHash = crypto.createHash('sha256').update(mockImageBytes).digest('hex');
    const targetUuid = '550e8400-e29b-41d4-a716-446655440000';
    const dataUrl = `data:image/jpeg;base64,${mockImageBytes.toString('base64')}`;

    const request = new Request('http://localhost:3000/api/evidence/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: targetUuid,
        evidenceType: 'daily_odometer',
        dataUrl,
        metadata: { reading: 92717, ocrProposal: 92717 },
      }),
    });

    const response = await uploadEvidence(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.evidence.id).toBe(targetUuid);
    expect(json.evidence.sha256_hash).toBe(expectedHash);
    expect(json.evidence.storage_path).toContain('evidence/daily_odometer/');

    // Verify stored in resilient server store
    const store = getServerStore();
    const storedEvidence = store.evidenceFiles.find((e: any) => e.id === targetUuid);
    expect(storedEvidence).toBeDefined();
    expect(storedEvidence.sha256_hash).toBe(expectedHash);
    expect(storedEvidence.data_url).toContain('data:image/jpeg;base64,');
  });

  it('retrieves evidence URL for an existing evidence record', async () => {
    const targetUuid = '550e8400-e29b-41d4-a716-446655440001';
    const store = getServerStore();
    store.evidenceFiles = [
      {
        id: targetUuid,
        storage_bucket: 'vlms-evidence',
        storage_path: `evidence/fuel_receipt/${targetUuid}.jpg`,
        evidence_type: 'fuel_receipt',
        sha256_hash: 'abc123mockhash',
        captured_at: new Date().toISOString(),
        uploaded_at: new Date().toISOString(),
        mime_type: 'image/jpeg',
        file_size_bytes: 12000,
        data_url: 'data:image/jpeg;base64,mockBase64String',
        is_verified: true,
      },
    ];
    saveServerStore(store);

    const request = new Request(`http://localhost:3000/api/evidence/${targetUuid}/url`, {
      method: 'GET',
    });

    const response = await getEvidenceUrl(request, {
      params: Promise.resolve({ id: targetUuid }),
    });

    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.evidenceId).toBe(targetUuid);
    expect(json.signedUrl).toBeDefined();
  });

  it('returns 404 for a non-existent evidence ID', async () => {
    const missingUuid = '550e8400-e29b-41d4-a716-446655449999';
    const request = new Request(`http://localhost:3000/api/evidence/${missingUuid}/url`, {
      method: 'GET',
    });

    const response = await getEvidenceUrl(request, {
      params: Promise.resolve({ id: missingUuid }),
    });

    expect(response.status).toBe(404);
  });

  it('batch resolves multiple evidence URLs in a single roundtrip', async () => {
    const id1 = '550e8400-e29b-41d4-a716-446655440002';
    const id2 = '550e8400-e29b-41d4-a716-446655440003';

    const store = getServerStore();
    store.evidenceFiles = [
      {
        id: id1,
        storage_bucket: 'vlms-evidence',
        storage_path: `evidence/daily_odometer/${id1}.jpg`,
        data_url: 'data:image/jpeg;base64,image1',
      },
      {
        id: id2,
        storage_bucket: 'vlms-evidence',
        storage_path: `evidence/fuel_receipt/${id2}.jpg`,
        data_url: 'data:image/jpeg;base64,image2',
      },
    ];
    saveServerStore(store);

    const request = new Request('http://localhost:3000/api/evidence/batch-urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id1, id2] }),
    });

    const response = await getBatchUrls(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.urls[id1]).toBe('data:image/jpeg;base64,image1');
    expect(json.urls[id2]).toBe('data:image/jpeg;base64,image2');
  });
});
