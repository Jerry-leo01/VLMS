import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { verifyPassword } from '@/lib/security/password';
import { normalizePlateNumber, matchPlateNumbers } from '@/lib/utils';
import { getServerStore } from '@/lib/services/server-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Identifier and password are required.' },
        { status: 400, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const trimmed = identifier.trim();
    const isEmail = trimmed.includes('@');
    const supabase = getSupabaseAdmin();

    // ==========================================
    // 1. SUPABASE DATABASE BRANCH (PRIMARY)
    // ==========================================
    if (supabase) {
      let profile: any = null;
      let matchedRole = 'administrator';
      let assignedVehicle: any = null;

      let hasSchemaCacheError = false;

      if (isEmail) {
        const normalizedEmail = trimmed.toLowerCase();
        const { data: p, error: pErr } = await supabase
          .from('profiles')
          .select('id, full_name, email, employee_id, password_hash, status')
          .ilike('email', normalizedEmail)
          .maybeSingle();

        if (
          pErr &&
          (pErr.code === 'PGRST204' ||
            pErr.message?.includes('schema cache') ||
            pErr.message?.includes("column of 'profiles'"))
        ) {
          hasSchemaCacheError = true;
        } else {
          profile = p;
        }
      } else {
        // Try finding profile by employee_id first
        const { data: pByEmp, error: empErr } = await supabase
          .from('profiles')
          .select('id, full_name, email, employee_id, password_hash, status')
          .ilike('employee_id', trimmed)
          .maybeSingle();

        if (
          empErr &&
          (empErr.code === 'PGRST204' ||
            empErr.message?.includes('schema cache') ||
            empErr.message?.includes("column of 'profiles'"))
        ) {
          hasSchemaCacheError = true;
        } else if (pByEmp) {
          profile = pByEmp;
        }
      }

      // If not found by email or employee_id, check vehicles by plate number
      if (!profile && !hasSchemaCacheError) {
        const normalizedPlate = normalizePlateNumber(trimmed);
        const { data: v } = await supabase
          .from('vehicles')
          .select('id, plate_number, status')
          .ilike('plate_number', normalizedPlate)
          .maybeSingle();

        if (v) {
          assignedVehicle = v;
          const { data: assignment } = await supabase
            .from('vehicle_assignments')
            .select('id, user_id, vehicle_id')
            .eq('vehicle_id', v.id)
            .is('ends_at', null)
            .maybeSingle();

          if (!assignment) {
            return NextResponse.json(
              { error: 'No active staff assignment found for this vehicle. Contact fleet management.' },
              { status: 403, headers: { 'Cache-Control': 'no-store, max-age=0' } }
            );
          }

          const { data: p } = await supabase
            .from('profiles')
            .select('id, full_name, email, employee_id, password_hash, status')
            .eq('id', assignment.user_id)
            .maybeSingle();

          profile = p;
        }
      }

      if (!profile) {
        if (!hasSchemaCacheError) {
          return NextResponse.json(
            { error: 'Account not found. Please verify your email or complete registration.' },
            { status: 401, headers: { 'Cache-Control': 'no-store, max-age=0' } }
          );
        }
        // If hasSchemaCacheError is true, fall through to server store fallback
      } else {
        const isValid = await verifyPassword(password, profile.password_hash);
        if (!isValid) {
          return NextResponse.json(
            { error: 'Invalid password. Please check your credentials or reset your password.' },
            { status: 401, headers: { 'Cache-Control': 'no-store, max-age=0' } }
          );
        }

        const { data: roleRow } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.id)
          .maybeSingle();

        matchedRole = roleRow?.role || 'administrator';

        if (matchedRole === 'staff' && !assignedVehicle) {
          const { data: asg } = await supabase
            .from('vehicle_assignments')
            .select('vehicle_id')
            .eq('user_id', profile.id)
            .is('ends_at', null)
            .maybeSingle();

          if (asg?.vehicle_id) {
            const { data: veh } = await supabase
              .from('vehicles')
              .select('id, plate_number')
              .eq('id', asg.vehicle_id)
              .maybeSingle();
            assignedVehicle = veh;
          }
        }

        return NextResponse.json(
          {
            success: true,
            user: {
              userId: profile.id,
              role: matchedRole,
              fullName: profile.full_name,
              email: profile.email,
              employeeId: profile.employee_id,
              plateNumber: assignedVehicle?.plate_number || undefined,
              vehicleId: assignedVehicle?.id || undefined,
            },
          },
          { headers: { 'Cache-Control': 'no-store, max-age=0' } }
        );
      }
    }

    // ==========================================
    // 2. SERVER RESILIENT STORE FALLBACK (VERCEL / DEV / TEST RUNNERS)
    // ==========================================
    const local = getServerStore();
    if (!local) {
      return NextResponse.json(
        { error: 'Data store unavailable.' },
        { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    let profile: any = null;
    let assignedVehicle: any = null;

    if (isEmail) {
      const normalizedEmail = trimmed.toLowerCase();
      profile = local.profiles?.find(
        (p: any) => p.email && p.email.trim().toLowerCase() === normalizedEmail
      );
    } else {
      // Check employee_id
      profile = local.profiles?.find(
        (p: any) => p.employee_id && p.employee_id.trim().toUpperCase() === trimmed.toUpperCase()
      );
    }

    // If not found by email or employee_id, check vehicles by plate number
    if (!profile) {
      const vehicle = local.vehicles?.find((v: any) => matchPlateNumbers(v.plate_number, trimmed));
      if (vehicle) {
        assignedVehicle = vehicle;
        const assignment = local.assignments?.find(
          (a: any) => a.vehicle_id === vehicle.id && a.ends_at === null
        );

        if (!assignment) {
          return NextResponse.json(
            { error: 'No active staff assignment found for this vehicle. Contact fleet management.' },
            { status: 403, headers: { 'Cache-Control': 'no-store, max-age=0' } }
          );
        }

        profile = local.profiles?.find((p: any) => p.id === assignment.user_id);
      }
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Account not found. Please verify your email or complete registration.' },
        { status: 401, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const isValid = await verifyPassword(password, profile.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid password. Please check your credentials or reset your password.' },
        { status: 401, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const userRole = local.userRoles?.find((r: any) => r.userId === profile.id);
    const role = userRole?.role || (assignedVehicle ? 'staff' : 'administrator');

    if (role === 'staff' && !assignedVehicle) {
      const asg = local.assignments?.find(
        (a: any) => a.user_id === profile.id && a.ends_at === null
      );
      if (asg) {
        assignedVehicle = local.vehicles?.find((v: any) => v.id === asg.vehicle_id);
      }
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          userId: profile.id,
          role,
          fullName: profile.full_name,
          email: profile.email,
          employeeId: profile.employee_id,
          plateNumber: assignedVehicle?.plate_number || undefined,
          vehicleId: assignedVehicle?.id || undefined,
        },
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (err: unknown) {
    const errorObj = err as Error;
    return NextResponse.json(
      { error: errorObj.message || 'Authentication failed' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }
}
