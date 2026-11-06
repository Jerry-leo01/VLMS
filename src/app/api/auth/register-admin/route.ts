import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { hashPassword } from '@/lib/security/password';
import { getBaselineStore, DEFAULT_OFFICES } from '@/lib/services/baseline-store';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'vlms_store.json');

const DEFAULT_OFFICE_ID = '11111111-1111-1111-1111-111111111111';

function getLocalStore() {
  const baseline = getBaselineStore();
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) return baseline;
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      ...baseline,
      ...parsed,
      profiles: Array.from(new Map([...baseline.profiles, ...(parsed.profiles || [])].map((p) => [p.id, p])).values()),
      userRoles: Array.from(new Map([...baseline.userRoles, ...(parsed.userRoles || [])].map((r) => [r.userId, r])).values()),
      vehicles: Array.from(new Map([...baseline.vehicles, ...(parsed.vehicles || [])].map((v) => [v.id, v])).values()),
      assignments: Array.from(new Map([...baseline.assignments, ...(parsed.assignments || [])].map((a) => [a.id, a])).values()),
      tomCards: Array.from(new Map([...baseline.tomCards, ...(parsed.tomCards || [])].map((t) => [t.id, t])).values()),
      registrationRequests: Array.from(new Map([...baseline.registrationRequests, ...(parsed.registrationRequests || [])].map((r) => [r.id, r])).values()),
    };
  } catch {
    return baseline;
  }
}

function saveLocalStore(data: Record<string, unknown>) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const baseline = getBaselineStore();
    const full = {
      ...baseline,
      ...data,
      profiles: Array.from(new Map([...baseline.profiles, ...((data.profiles as any[]) || [])].map((p) => [p.id, p])).values()),
      userRoles: Array.from(new Map([...baseline.userRoles, ...((data.userRoles as any[]) || [])].map((r) => [r.userId, r])).values()),
      vehicles: Array.from(new Map([...baseline.vehicles, ...((data.vehicles as any[]) || [])].map((v) => [v.id, v])).values()),
      assignments: Array.from(new Map([...baseline.assignments, ...((data.assignments as any[]) || [])].map((a) => [a.id, a])).values()),
    };
    const tmp = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(full, null, 2), 'utf-8');
    fs.renameSync(tmp, DATA_FILE);
  } catch {
    // Ignore in read-only environments
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, employeeId, email, phoneNumber, officeId, role, password } = body;

    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return NextResponse.json(
        { error: 'A valid corporate email address is required for administrator access.' },
        { status: 400 }
      );
    }

    const cleanEmpId = employeeId ? employeeId.trim().toUpperCase() : null;
    const now = new Date().toISOString();
    const assignedRole = role || 'administrator';
    const supabase = getSupabaseAdmin();

    // ==========================================
    // 1. SUPABASE DATABASE BRANCH (PRIMARY)
    // ==========================================
    if (supabase) {
      // Existence Check: Email
      const { data: existingEmail } = await supabase
        .from('profiles')
        .select('id, email')
        .ilike('email', normalizedEmail)
        .maybeSingle();

      if (existingEmail) {
        return NextResponse.json(
          { error: 'Email is already registered to another user account.' },
          { status: 409 }
        );
      }

      // Existence Check: Staff / Employee ID
      if (cleanEmpId) {
        const { data: existingEmp } = await supabase
          .from('profiles')
          .select('id, employee_id')
          .ilike('employee_id', cleanEmpId)
          .maybeSingle();

        if (existingEmp) {
          return NextResponse.json(
            { error: `Staff ID "${cleanEmpId}" is already registered to another user account.` },
            { status: 409 }
          );
        }
      }

      const passwordHash = password ? await hashPassword(password) : null;
      const userId = crypto.randomUUID();

      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: fullName.trim(),
          email: normalizedEmail,
          phone_number: phoneNumber?.trim() || null,
          employee_id: cleanEmpId || `ADM-${Date.now().toString().slice(-4)}`,
          office_id: officeId || DEFAULT_OFFICE_ID,
          status: 'active',
          password_hash: passwordHash,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (profileErr) {
        return NextResponse.json({ error: profileErr.message }, { status: 500 });
      }

      await supabase.from('user_roles').insert({
        user_id: userId,
        role: assignedRole,
        created_at: now,
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            profile,
            role: assignedRole,
          },
        },
        { status: 201 }
      );
    }

    // ==========================================
    // 2. FILE/MEMORY FALLBACK (DEV / TEST RUNNERS)
    // ==========================================
    const local = getLocalStore() || { profiles: [], userRoles: [] };

    const existingEmail = local.profiles.find(
      (p: any) => p.email && p.email.trim().toLowerCase() === normalizedEmail
    );
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email is already registered to another user account.' },
        { status: 409 }
      );
    }

    if (cleanEmpId) {
      const existingEmp = local.profiles.find(
        (p: any) => p.employee_id && p.employee_id.trim().toUpperCase() === cleanEmpId
      );
      if (existingEmp) {
        return NextResponse.json(
          { error: `Staff ID "${cleanEmpId}" is already registered to another user account.` },
          { status: 409 }
        );
      }
    }

    const passwordHash = password ? await hashPassword(password) : null;
    const userId = `p-adm-${Date.now()}`;

    const profile = {
      id: userId,
      auth_user_id: `auth-${Date.now()}`,
      full_name: fullName.trim(),
      email: normalizedEmail,
      phone_number: phoneNumber?.trim() || null,
      employee_id: cleanEmpId || `ADM-${Date.now().toString().slice(-4)}`,
      office_id: officeId || DEFAULT_OFFICE_ID,
      status: 'active',
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
    };

    local.profiles.push(profile);
    local.userRoles.push({ userId, role: assignedRole });
    saveLocalStore(local);

    return NextResponse.json(
      {
        success: true,
        data: {
          profile,
          role: assignedRole,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorObj = err as Error;
    return NextResponse.json(
      { error: errorObj.message || 'Internal admin registration failure' },
      { status: 500 }
    );
  }
}
