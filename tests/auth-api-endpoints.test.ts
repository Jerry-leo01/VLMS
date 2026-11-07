import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { POST as registerStaffHandler } from '../src/app/api/auth/register-staff/route';
import { POST as registerAdminHandler } from '../src/app/api/auth/register-admin/route';
import { POST as loginHandler } from '../src/app/api/auth/login/route';
import { getBaselineStore } from '../src/lib/services/baseline-store';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'vlms_store.json');

let originalStore: string | null = null;

describe('Centralized Auth API Route Handlers & Account Recovery', () => {
  beforeAll(() => {
    if (fs.existsSync(DATA_FILE)) {
      originalStore = fs.readFileSync(DATA_FILE, 'utf-8');
    }
  });

  afterAll(() => {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (originalStore) {
      fs.writeFileSync(DATA_FILE, originalStore, 'utf-8');
    } else {
      fs.writeFileSync(DATA_FILE, JSON.stringify(getBaselineStore(), null, 2), 'utf-8');
    }
  });

  it('confirms canonical accounts are purged (returns 401 on legacy logins)', async () => {
    const loginReq = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin@vlms.ng',
        password: 'AdminPassword123!',
      }),
    });

    const loginRes = await loginHandler(loginReq);
    expect(loginRes.status).toBe(401);
    const loginJson = await loginRes.json();
    expect(loginJson.error).toBeDefined();
  });

  it('rejects legacy driver plate login when account is purged', async () => {
    const loginReq = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'KJA-842XA',
        password: 'DriverPassword123!',
      }),
    });

    const loginRes = await loginHandler(loginReq);
    expect([401, 403]).toContain(loginRes.status);
    const loginJson = await loginRes.json();
    expect(loginJson.error).toBeDefined();
  });

  it('registers staff and rejects duplicate plate, employeeId, or email with 409 Conflict', async () => {
    const testPlate = `API-${Math.floor(1000 + Math.random() * 9000)}-ST`;
    const testEmpId = `EMP-API-${Date.now()}`;
    const testEmail = `staff-api-${Date.now()}@testcorp.com`;
    const password = 'TestPassword123!';

    // 1. Initial valid registration
    const initialReq = new Request('http://localhost:3000/api/auth/register-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'API Staff Member',
        employeeId: testEmpId,
        email: testEmail,
        phoneNumber: '+234 809 111 2222',
        plateNumber: testPlate,
        password,
        carName: 'Toyota Corolla',
        carModel: 'Corolla Hybrid',
        carYear: 2024,
      }),
    });

    const res1 = await registerStaffHandler(initialReq);
    expect(res1.status).toBe(201);
    const data1 = await res1.json();
    expect(data1.success).toBe(true);
    expect(data1.data.profile.full_name).toBe('API Staff Member');

    // 2. Reject duplicate Plate Number with 409
    const dupPlateReq = new Request('http://localhost:3000/api/auth/register-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Another Staff',
        employeeId: `EMP-DIFF-${Date.now()}`,
        email: `diff-${Date.now()}@testcorp.com`,
        plateNumber: testPlate, // Duplicate Plate
        password,
      }),
    });

    const res2 = await registerStaffHandler(dupPlateReq);
    expect(res2.status).toBe(409);
    const data2 = await res2.json();
    expect(data2.error).toMatch(/already exists in the database/i);

    // 3. Reject duplicate Staff ID with 409
    const dupEmpReq = new Request('http://localhost:3000/api/auth/register-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Yet Another Staff',
        employeeId: testEmpId, // Duplicate Staff ID
        email: `another-${Date.now()}@testcorp.com`,
        plateNumber: `NEW-${Math.floor(1000 + Math.random() * 9000)}-XX`,
        password,
      }),
    });

    const res3 = await registerStaffHandler(dupEmpReq);
    expect(res3.status).toBe(409);
    const data3 = await res3.json();
    expect(data3.error).toMatch(/already registered to another user account/i);

    // 4. Authenticate via login route using plate number
    const loginReq = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testPlate,
        password,
      }),
    });

    const loginRes = await loginHandler(loginReq);
    expect(loginRes.status).toBe(200);
    const loginJson = await loginRes.json();
    expect(loginJson.success).toBe(true);
    expect(loginJson.user.fullName).toBe('API Staff Member');

    // 5. Authenticate via login route using staff email
    const loginEmailReq = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testEmail,
        password,
      }),
    });
    const loginEmailRes = await loginHandler(loginEmailReq);
    expect(loginEmailRes.status).toBe(200);
    const loginEmailJson = await loginEmailRes.json();
    expect(loginEmailJson.success).toBe(true);
    expect(loginEmailJson.user.fullName).toBe('API Staff Member');
    expect(loginEmailJson.user.plateNumber).toBe(testPlate);

    // 6. Authenticate via login route using Employee ID
    const loginEmpIdReq = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testEmpId,
        password,
      }),
    });
    const loginEmpIdRes = await loginHandler(loginEmpIdReq);
    expect(loginEmpIdRes.status).toBe(200);
    const loginEmpIdJson = await loginEmpIdRes.json();
    expect(loginEmpIdJson.success).toBe(true);
    expect(loginEmpIdJson.user.fullName).toBe('API Staff Member');

    // 7. Authenticate via login route using loose plate format (spaces instead of hyphens)
    const loosePlate = testPlate.replace(/-/g, ' ');
    const loginLoosePlateReq = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: loosePlate,
        password,
      }),
    });
    const loginLooseRes = await loginHandler(loginLoosePlateReq);
    expect(loginLooseRes.status).toBe(200);
    const loginLooseJson = await loginLooseRes.json();
    expect(loginLooseJson.success).toBe(true);
  });

  it('registers admin and rejects duplicate email with 409 Conflict', async () => {
    const adminEmail = `admin-endpoint-${Date.now()}@testcorp.com`;
    const adminEmpId = `ADM-EP-${Date.now()}`;
    const password = 'AdminPassword123!';

    const initialReq = new Request('http://localhost:3000/api/auth/register-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Corporate Super Admin',
        employeeId: adminEmpId,
        email: adminEmail,
        phoneNumber: '+234 815 123 4567',
        role: 'administrator',
        password,
      }),
    });

    const res1 = await registerAdminHandler(initialReq);
    expect(res1.status).toBe(201);
    const data1 = await res1.json();
    expect(data1.success).toBe(true);
    expect(data1.data.profile.email).toBe(adminEmail);

    // Duplicate Admin Email rejected with 409
    const dupEmailReq = new Request('http://localhost:3000/api/auth/register-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Imposter Admin',
        employeeId: `ADM-NEW-${Date.now()}`,
        email: adminEmail, // Duplicate Email
        role: 'administrator',
        password,
      }),
    });

    const res2 = await registerAdminHandler(dupEmailReq);
    expect(res2.status).toBe(409);
    const data2 = await res2.json();
    expect(data2.error).toMatch(/already registered to another user account/i);

    // Authenticate Admin via Email (mixed case)
    const adminLoginReq = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: adminEmail.toUpperCase(),
        password,
      }),
    });
    const adminLoginRes = await loginHandler(adminLoginReq);
    expect(adminLoginRes.status).toBe(200);
    const adminLoginJson = await adminLoginRes.json();
    expect(adminLoginJson.success).toBe(true);
    expect(adminLoginJson.user.fullName).toBe('Corporate Super Admin');
    expect(adminLoginJson.user.role).toBe('administrator');

    // Authenticate Admin via Employee ID
    const adminEmpLoginReq = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: adminEmpId,
        password,
      }),
    });
    const adminEmpLoginRes = await loginHandler(adminEmpLoginReq);
    expect(adminEmpLoginRes.status).toBe(200);
    const adminEmpLoginJson = await adminEmpLoginRes.json();
    expect(adminEmpLoginJson.success).toBe(true);
    expect(adminEmpLoginJson.user.fullName).toBe('Corporate Super Admin');
  });
});
