import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { hashPassword } from '@/lib/security/password';
import { DEFAULT_OFFICES } from '@/lib/services/baseline-store';
import { getServerStore, saveServerStore } from '@/lib/services/server-store';

const DEFAULT_OFFICE_ID = '11111111-1111-1111-1111-111111111111';

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
    const local = getServerStore() || { profiles: [], userRoles: [] };

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
    saveServerStore(local);

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
