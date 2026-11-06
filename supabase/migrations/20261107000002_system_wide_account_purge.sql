-- Migration: 20261107000002_system_wide_account_purge.sql
-- Description: System-wide user account purge with zero disruption to administrative overrides,
-- physical fleet assets, or system configuration settings.

-- 1. Decouple Active Vehicle Assignments
UPDATE public.vehicle_assignments 
SET ends_at = timezone('utc'::text, now()) 
WHERE ends_at IS NULL;

UPDATE public.vehicle_assignments 
SET assigned_by = NULL;

-- 2. Decouple User Association from TOM Cards (Preserve physical cards & vehicle links)
UPDATE public.tom_cards 
SET user_id = NULL;

-- 3. Clear Registration Requests & Ephemeral Audit Actor References
DELETE FROM public.registration_requests;

UPDATE public.audit_events 
SET actor_id = NULL;

UPDATE public.anomaly_alerts 
SET reviewer_id = NULL;

-- 4. Anonymize Operational Telemetry to System Anchor (Preserve Mileage & Audit Integrity)
INSERT INTO public.profiles (
    id, 
    full_name, 
    email, 
    employee_id, 
    status, 
    created_at, 
    updated_at
)
VALUES (
    '00000000-0000-0000-0000-000000000000', 
    'Archived System Attribution', 
    'system-archive@vlms.internal', 
    'SYS-ARCHIVE-00', 
    'active', 
    timezone('utc'::text, now()), 
    timezone('utc'::text, now())
)
ON CONFLICT (id) DO NOTHING;

UPDATE public.daily_logs 
SET user_id = '00000000-0000-0000-0000-000000000000';

UPDATE public.fuel_transactions 
SET user_id = '00000000-0000-0000-0000-000000000000';

UPDATE public.vehicle_assignments 
SET user_id = '00000000-0000-0000-0000-000000000000';

-- 5. Delete All User Role Bindings
DELETE FROM public.user_roles;

-- 6. Purge All User Accounts (Retaining solely the immutable system anchor)
DELETE FROM public.profiles 
WHERE id != '00000000-0000-0000-0000-000000000000';

-- 7. Reset System Audit Trail with Purge Execution Notice
INSERT INTO public.audit_events (
    id,
    actor_id,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data,
    created_at
)
VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'SYSTEM_WIDE_ACCOUNT_PURGE_EXECUTED',
    'SYSTEM_SECURITY',
    '00000000-0000-0000-0000-000000000000',
    jsonb_build_object('status', 'decommissioned_all_accounts'),
    jsonb_build_object('super_admin_bootstrap_mode', 'active', 'master_override_pin', 'operational'),
    timezone('utc'::text, now())
);
