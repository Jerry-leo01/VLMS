import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { verifyPassword } from '@/lib/security/password';
import { normalizePlateNumber } from '@/lib/utils';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'vlms_store.json');

function getLocalStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) return null;
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Identifier and password are required.' },
        { status: 400 }
      );
    }

    const trimmed = identifier.trim();
    const isEmail = trimmed.includes('@');
    const supabase = getSupabaseAdmin();

    // ==========================================
    // 1. SUPABASE DATABASE BRANCH (PRIMARY)
    // ==========================================
    if (supabase) {
      if (isEmail) {
        const normalizedEmail = trimmed.toLowerCase();
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, email, employee_id, password_hash, status')
          .ilike('email', normalizedEmail)
          .maybeSingle();

        if (!profile) {
          return NextResponse.json(
            { error: 'Account not found. Please verify your email or complete registration.' },
            { status: 401 }
          );
        }

        const isValid = await verifyPassword(password, profile.password_hash);
        if (!isValid) {
          return NextResponse.json(
            { error: 'Invalid password. Please check your credentials or reset your password.' },
            { status: 401 }
          );
        }

        const { data: roleRow } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.id)
          .maybeSingle();

        const role = roleRow?.role || 'administrator';

        return NextResponse.json({
          success: true,
          user: {
            userId: profile.id,
            role,
            fullName: profile.full_name,
            email: profile.email,
            employeeId: profile.employee_id,
          },
        });
      }

      // Plate Number Login
      const normalizedPlate = normalizePlateNumber(trimmed);
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('id, plate_number, status')
        .ilike('plate_number', normalizedPlate)
        .maybeSingle();

      if (!vehicle) {
        return NextResponse.json(
          { error: 'Vehicle plate number not registered. Please submit a company car registration request first.' },
          { status: 404 }
        );
      }

      const { data: assignment } = await supabase
        .from('vehicle_assignments')
        .select('id, user_id, vehicle_id')
        .eq('vehicle_id', vehicle.id)
        .is('ends_at', null)
        .maybeSingle();

      if (!assignment) {
        return NextResponse.json(
          { error: 'No active staff assignment found for this vehicle. Contact fleet management.' },
          { status: 403 }
        );
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, employee_id, password_hash, status')
        .eq('id', assignment.user_id)
        .maybeSingle();

      if (!profile) {
        return NextResponse.json(
          { error: 'Staff profile associated with this vehicle could not be found.' },
          { status: 404 }
        );
      }

      const isValid = await verifyPassword(password, profile.password_hash);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid password. Please verify the assigned driver passcode.' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          userId: profile.id,
          role: 'staff',
          fullName: profile.full_name,
          email: profile.email,
          plateNumber: vehicle.plate_number,
          vehicleId: vehicle.id,
          employeeId: profile.employee_id,
        },
      });
    }

    // ==========================================
    // 2. FILE/MEMORY FALLBACK (DEV / TEST RUNNERS)
    // ==========================================
    const local = getLocalStore();
    if (!local) {
      return NextResponse.json(
        { error: 'Data store unavailable.' },
        { status: 503 }
      );
    }

    if (isEmail) {
      const normalizedEmail = trimmed.toLowerCase();
      const profile = local.profiles?.find(
        (p: any) => p.email && p.email.trim().toLowerCase() === normalizedEmail
      );

      if (!profile) {
        return NextResponse.json(
          { error: 'Account not found. Please verify your email or complete registration.' },
          { status: 401 }
        );
      }

      const isValid = await verifyPassword(password, profile.password_hash);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid password. Please check your credentials or reset your password.' },
          { status: 401 }
        );
      }

      const userRole = local.userRoles?.find((r: any) => r.userId === profile.id);
      const role = userRole?.role || 'administrator';

      return NextResponse.json({
        success: true,
        user: {
          userId: profile.id,
          role,
          fullName: profile.full_name,
          email: profile.email,
          employeeId: profile.employee_id,
        },
      });
    }

    // Plate number fallback
    const normalizedPlate = normalizePlateNumber(trimmed);
    const vehicle = local.vehicles?.find(
      (v: any) => normalizePlateNumber(v.plate_number) === normalizedPlate
    );

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle plate number not registered. Please submit a company car registration request first.' },
        { status: 404 }
      );
    }

    const assignment = local.assignments?.find(
      (a: any) => a.vehicle_id === vehicle.id && a.ends_at === null
    );

    if (!assignment) {
      return NextResponse.json(
        { error: 'No active staff assignment found for this vehicle. Contact fleet management.' },
        { status: 403 }
      );
    }

    const profile = local.profiles?.find((p: any) => p.id === assignment.user_id);
    if (!profile) {
      return NextResponse.json(
        { error: 'Staff profile associated with this vehicle could not be found.' },
        { status: 404 }
      );
    }

    const isValid = await verifyPassword(password, profile.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid password. Please verify the assigned driver passcode.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        userId: profile.id,
        role: 'staff',
        fullName: profile.full_name,
        email: profile.email,
        plateNumber: vehicle.plate_number,
        vehicleId: vehicle.id,
        employeeId: profile.employee_id,
      },
    });
  } catch (err: unknown) {
    const errorObj = err as Error;
    return NextResponse.json(
      { error: errorObj.message || 'Authentication failed' },
      { status: 500 }
    );
  }
}
