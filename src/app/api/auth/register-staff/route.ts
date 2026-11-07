import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { hashPassword } from '@/lib/security/password';
import { normalizePlateNumber } from '@/lib/utils';
import { DEFAULT_OFFICES } from '@/lib/services/baseline-store';
import { getServerStore, saveServerStore } from '@/lib/services/server-store';

const DEFAULT_OFFICE_ID = '11111111-1111-1111-1111-111111111111';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      fullName,
      employeeId,
      email,
      phoneNumber,
      plateNumber,
      password,
      officeId,
      carName,
      carModel,
      carYear,
      tomCardNumber,
    } = body;

    if (!fullName || !plateNumber) {
      return NextResponse.json(
        { error: 'Full name and vehicle plate number are required.' },
        { status: 400 }
      );
    }

    const normalizedPlate = normalizePlateNumber(plateNumber);
    const cleanEmpId = employeeId ? employeeId.trim().toUpperCase() : null;
    const cleanEmail = email ? email.trim().toLowerCase() : null;
    const now = new Date().toISOString();
    const supabase = getSupabaseAdmin();

    // ==========================================
    // 1. SUPABASE DATABASE BRANCH (PRIMARY)
    // ==========================================
    if (supabase) {
      // Existence Check: Plate Number
      const { data: existingPlate } = await supabase
        .from('vehicles')
        .select('id, plate_number')
        .ilike('plate_number', normalizedPlate)
        .maybeSingle();

      if (existingPlate) {
        return NextResponse.json(
          { error: 'Plate number already exists in the database. Kindly sign in.' },
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
            { error: `Staff ID "${cleanEmpId}" is already registered to another user account. Kindly sign in.` },
            { status: 409 }
          );
        }
      }

      // Existence Check: Email
      if (cleanEmail) {
        const { data: existingEmail, error: emailCheckErr } = await supabase
          .from('profiles')
          .select('id, email')
          .ilike('email', cleanEmail)
          .maybeSingle();

        const isSchemaOrPermissionError =
          emailCheckErr?.code === 'PGRST204' ||
          emailCheckErr?.code === '42501' ||
          emailCheckErr?.message?.includes('permission denied') ||
          emailCheckErr?.message?.includes('schema cache') ||
          emailCheckErr?.message?.includes("column of 'profiles'");

        if (existingEmail && !isSchemaOrPermissionError) {
          return NextResponse.json(
            { error: 'Email is already registered to another user account. Kindly sign in.' },
            { status: 409 }
          );
        }
      }

      const passwordHash = password ? await hashPassword(password) : null;
      const userId = crypto.randomUUID();

      // 1. Create Profile
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: fullName.trim(),
          email: cleanEmail,
          phone_number: phoneNumber?.trim() || null,
          employee_id: cleanEmpId || `DRV-${Date.now().toString().slice(-4)}`,
          office_id: officeId || DEFAULT_OFFICE_ID,
          status: 'active',
          password_hash: passwordHash,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (profileErr) {
        const isInsertDbAccessError =
          profileErr.code === 'PGRST204' ||
          profileErr.code === '42501' ||
          profileErr.message?.includes('permission denied') ||
          profileErr.message?.includes('schema cache') ||
          profileErr.message?.includes("column of 'profiles'");

        if (!isInsertDbAccessError) {
          return NextResponse.json({ error: profileErr.message }, { status: 500 });
        }
        // Schema cache or permission error; fall through to resilient server store
      } else {
        // 2. Assign Staff Role
        await supabase.from('user_roles').insert({
          user_id: userId,
          role: 'staff',
          created_at: now,
        });

        // 3. Create Vehicle
        const vehicleId = crypto.randomUUID();
        const vehicleMake = carName?.trim() || 'Company Vehicle';
        const vehicleModel = carModel?.trim() || 'Standard Fleet';

        const { data: vehicle, error: vehicleErr } = await supabase
          .from('vehicles')
          .insert({
            id: vehicleId,
            plate_number: normalizedPlate,
            make: vehicleMake,
            model: vehicleModel,
            car_name: carName?.trim() || `${vehicleMake} ${vehicleModel}`,
            year: parseInt(carYear, 10) || new Date().getFullYear(),
            status: 'active',
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();

        if (vehicleErr) {
          return NextResponse.json({ error: vehicleErr.message }, { status: 500 });
        }

        // 4. Create Active Assignment
        const { data: assignment } = await supabase
          .from('vehicle_assignments')
          .insert({
            id: crypto.randomUUID(),
            user_id: userId,
            vehicle_id: vehicleId,
            starts_at: now,
            ends_at: null,
            assigned_by: null,
            created_at: now,
          })
          .select()
          .single();

        // 5. Create TOM Card (if provided)
        let tomCard = null;
        if (tomCardNumber && tomCardNumber.trim()) {
          const { data: tc } = await supabase
            .from('tom_cards')
            .insert({
              id: crypto.randomUUID(),
              card_reference: tomCardNumber.trim(),
              masked_card_number: tomCardNumber.trim(),
              vehicle_id: vehicleId,
              user_id: userId,
              status: 'active',
              created_at: now,
              updated_at: now,
            })
            .select()
            .single();
          tomCard = tc;
        }

        return NextResponse.json(
          {
            success: true,
            data: {
              profile,
              vehicle,
              assignment,
              tomCard,
            },
          },
          { status: 201 }
        );
      }
    }

    // ==========================================
    // 2. FILE/MEMORY FALLBACK (DEV / TEST RUNNERS)
    // ==========================================
    const local = getServerStore() || {
      profiles: [],
      userRoles: [],
      vehicles: [],
      assignments: [],
      tomCards: [],
      registrationRequests: [],
      auditEvents: [],
    };

    // Pre-insert existence checks
    const existingPlate = local.vehicles.find(
      (v: any) => normalizePlateNumber(v.plate_number) === normalizedPlate
    );
    if (existingPlate) {
      return NextResponse.json(
        { error: 'Plate number already exists in the database. Kindly sign in.' },
        { status: 409 }
      );
    }

    if (cleanEmpId) {
      const existingEmp = local.profiles.find(
        (p: any) => p.employee_id && p.employee_id.trim().toUpperCase() === cleanEmpId
      );
      if (existingEmp) {
        return NextResponse.json(
          { error: `Staff ID "${cleanEmpId}" is already registered to another user account. Kindly sign in.` },
          { status: 409 }
        );
      }
    }

    if (cleanEmail) {
      const existingEmail = local.profiles.find(
        (p: any) => p.email && p.email.trim().toLowerCase() === cleanEmail
      );
      if (existingEmail) {
        return NextResponse.json(
          { error: 'Email is already registered to another user account. Kindly sign in.' },
          { status: 409 }
        );
      }
    }

    const passwordHash = password ? await hashPassword(password) : null;
    const userId = `p-user-${Date.now()}`;
    const vehicleId = `v-${Date.now()}`;

    const profile = {
      id: userId,
      auth_user_id: `auth-${Date.now()}`,
      full_name: fullName.trim(),
      email: cleanEmail,
      phone_number: phoneNumber?.trim() || null,
      employee_id: cleanEmpId || `DRV-${Date.now().toString().slice(-4)}`,
      office_id: officeId || DEFAULT_OFFICE_ID,
      status: 'active',
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
    };

    const vehicle = {
      id: vehicleId,
      plate_number: normalizedPlate,
      make: carName?.trim() || 'Company Vehicle',
      model: carModel?.trim() || 'Standard Fleet',
      car_name: carName?.trim() || 'Company Vehicle',
      year: parseInt(carYear, 10) || new Date().getFullYear(),
      current_odometer_km: 0,
      status: 'active',
      created_at: now,
      updated_at: now,
    };

    const assignment = {
      id: `asg-${Date.now()}`,
      user_id: userId,
      vehicle_id: vehicleId,
      starts_at: now,
      ends_at: null,
      assigned_by: 'SYSTEM_AUTO',
      created_at: now,
    };

    local.profiles.push(profile);
    local.userRoles.push({ userId, role: 'staff' });
    local.vehicles.push(vehicle);
    local.assignments.push(assignment);

    if (tomCardNumber && tomCardNumber.trim()) {
      local.tomCards.push({
        id: `tc-${Date.now()}`,
        card_reference: tomCardNumber.trim(),
        masked_card_number: tomCardNumber.trim(),
        vehicle_id: vehicleId,
        user_id: userId,
        status: 'active',
        created_at: now,
        updated_at: now,
      });
    }

    saveServerStore(local);

    return NextResponse.json(
      {
        success: true,
        data: {
          profile,
          vehicle,
          assignment,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorObj = err as Error;
    return NextResponse.json(
      { error: errorObj.message || 'Internal registration failure' },
      { status: 500 }
    );
  }
}
