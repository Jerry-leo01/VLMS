-- Migration: 20261107000001_restore_baseline_accounts.sql
-- Description: Restore canonical system administrator, fleet manager, staff drivers, and vehicle fleet

-- 1. Ensure Offices exist
INSERT INTO public.offices (id, name, address, is_active)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Head Office', 'Corporate Headquarters, Victoria Island, Lagos State, Nigeria', true),
    ('22222222-2222-2222-2222-222222222222', 'Lagos Branch', 'Ikeja Commercial District, Lagos State, Nigeria', true),
    ('33333333-3333-3333-3333-333333333333', 'South West Branch', 'Ibadan Zonal Office, Oyo State, Nigeria', true),
    ('44444444-4444-4444-4444-444444444444', 'South South Branch', 'Trans Amadi Industrial Layout, Port Harcourt, Rivers State, Nigeria', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address;

-- 2. Restore Profiles
INSERT INTO public.profiles (id, full_name, email, phone_number, employee_id, office_id, status, password_hash)
VALUES
    ('p-admin-01', 'Babajide Adeleke', 'admin@vlms.ng', '+234 803 123 4567', 'EMP-ADM-01', '11111111-1111-1111-1111-111111111111', 'active', 'vlmsseed01:b78162719a4179f6ede62badeed795270860c6e0a6b6cfb255b77fad50d53e3b'),
    ('p-fleet-02', 'Oluwaseun Adeleke', 'fleet@vlms.ng', '+234 802 987 6543', 'EMP-MGT-02', '11111111-1111-1111-1111-111111111111', 'active', 'vlmsseed01:dcc49d5f78d2c56f718ae6f7df114ba7995b042931cea06bf4e777402ef60a26'),
    ('p-staff-01', 'Chukwuma Eze', 'chukwuma@vlms.ng', '+234 805 555 1212', 'EMP-DRV-042', '11111111-1111-1111-1111-111111111111', 'active', 'vlmsseed01:b161e6acc2b83bc9a12ac0140c570dd2b3ede8515038a7bde849fd397b503898'),
    ('p-staff-02', 'Chinedu Okeke', 'chinedu@vlms.ng', '+234 807 444 3322', 'EMP-DRV-043', '22222222-2222-2222-2222-222222222222', 'active', 'vlmsseed01:b161e6acc2b83bc9a12ac0140c570dd2b3ede8515038a7bde849fd397b503898')
ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    status = EXCLUDED.status;

-- 3. Restore User Roles
INSERT INTO public.user_roles (user_id, role)
VALUES
    ('p-admin-01', 'administrator'),
    ('p-fleet-02', 'fleet_manager'),
    ('p-staff-01', 'staff'),
    ('p-staff-02', 'staff')
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Restore Vehicles
INSERT INTO public.vehicles (id, plate_number, make, model, year, status, car_name)
VALUES
    ('v-toyota-hilux', 'KJA-842XA', 'Toyota', 'Hilux 4x4 Double Cabin', 2022, 'active', 'Toyota Hilux 4x4'),
    ('v-toyota-corolla', 'ABJ-194LK', 'Toyota', 'Corolla 1.8L', 2021, 'active', 'Toyota Corolla'),
    ('v-ford-ranger', 'PHC-552XY', 'Ford', 'Ranger XLT', 2023, 'active', 'Ford Ranger XLT'),
    ('v-toyota-hiace', 'EKY-772TN', 'Toyota', 'HiAce Commuter Bus', 2020, 'active', 'Toyota HiAce Bus'),
    ('v-nissan-navara', 'APP-902BG', 'Nissan', 'Navara PRO-4X', 2022, 'maintenance', 'Nissan Navara PRO-4X')
ON CONFLICT (plate_number) DO UPDATE SET status = EXCLUDED.status;

-- 5. Restore Vehicle Assignments
INSERT INTO public.vehicle_assignments (id, user_id, vehicle_id, starts_at, ends_at, assigned_by)
VALUES
    ('asg-01', 'p-staff-01', 'v-toyota-hilux', '2026-01-01T08:00:00Z', NULL, 'p-admin-01'),
    ('asg-02', 'p-staff-02', 'v-toyota-corolla', '2026-01-01T08:00:00Z', NULL, 'p-admin-01')
ON CONFLICT (id) DO NOTHING;

-- 6. Restore TOM Cards
INSERT INTO public.tom_cards (id, card_reference, masked_card_number, vehicle_id, user_id, status)
VALUES
    ('tc-01', '804689', '7004 **** **** 1024', 'v-toyota-hilux', 'p-staff-01', 'active'),
    ('tc-02', '700438', '7004 **** **** 3819', 'v-toyota-corolla', 'p-staff-02', 'active')
ON CONFLICT (card_reference) DO NOTHING;
