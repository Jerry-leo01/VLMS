-- Vehicle Log Management System (VLMS) - Development Seed Data
-- Provides standard offices, vehicle fleet, and demo configuration

-- 1. Offices
INSERT INTO public.offices (id, name, address, is_active)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Lagos Corporate HQ', 'Plot 12, Victoria Island, Lagos State, Nigeria', true),
    ('22222222-2222-2222-2222-222222222222', 'Abuja Regional Branch', 'Plot 402, Central Business District, Abuja FCT, Nigeria', true),
    ('33333333-3333-3333-3333-333333333333', 'Port Harcourt Hub', 'Trans Amadi Industrial Layout, Port Harcourt, Rivers State, Nigeria', true)
ON CONFLICT (name) DO UPDATE SET address = EXCLUDED.address;

-- 2. Vehicles
INSERT INTO public.vehicles (id, plate_number, make, model, year, status)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'KJA-842XA', 'Toyota', 'Hilux 4x4 Double Cabin', 2022, 'active'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ABJ-194LK', 'Toyota', 'Corolla 1.8L', 2021, 'active'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'PHC-552XY', 'Ford', 'Ranger XLT', 2023, 'active'),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'EKY-319TN', 'Toyota', 'HiAce Commuter Bus', 2020, 'active'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'APP-902BG', 'Nissan', 'Navara PRO-4X', 2022, 'maintenance')
ON CONFLICT (plate_number) DO UPDATE SET status = EXCLUDED.status;

-- 3. TOM Cards
INSERT INTO public.tom_cards (id, card_reference, masked_card_number, vehicle_id, status)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'TOM-LAG-001', '7004 **** **** 1024', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'active'),
    ('10000000-0000-0000-0000-000000000002', 'TOM-ABJ-002', '7004 **** **** 3819', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'active'),
    ('10000000-0000-0000-0000-000000000003', 'TOM-PHC-003', '7004 **** **** 8842', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'active'),
    ('10000000-0000-0000-0000-000000000004', 'TOM-GEN-004', '7004 **** **** 9103', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'active')
ON CONFLICT (card_reference) DO UPDATE SET masked_card_number = EXCLUDED.masked_card_number;
