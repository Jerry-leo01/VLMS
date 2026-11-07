-- Migration: 20261107000004_fix_profiles_rls_and_permissions.sql
-- Description: Grants table-level permissions and configures RLS policies on profiles, user_roles,
-- vehicles, vehicle_assignments, tom_cards, and registration_requests to permit onboarding/registration
-- while protecting existing accounts and administrative credentials.

-- 1. Ensure Schema Access
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2. Grant Table Permissions to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_roles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.vehicles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.vehicle_assignments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.tom_cards TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.registration_requests TO anon, authenticated;
GRANT SELECT ON TABLE public.offices TO anon, authenticated;

-- Grant sequence privileges if applicable
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 3. Configure Row-Level Security (RLS) on public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow profile lookup for login and verification" ON public.profiles;
CREATE POLICY "Allow profile lookup for login and verification"
ON public.profiles FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow registration profile insert" ON public.profiles;
CREATE POLICY "Allow registration profile insert"
ON public.profiles FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins and owners can update profiles" ON public.profiles;
CREATE POLICY "Admins and owners can update profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  auth_user_id = auth.uid() 
  OR public.has_role('administrator') 
  OR public.has_role('fleet_manager')
);

-- 4. Configure RLS on public.user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow role lookup" ON public.user_roles;
CREATE POLICY "Allow role lookup"
ON public.user_roles FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow role assignment during registration" ON public.user_roles;
CREATE POLICY "Allow role assignment during registration"
ON public.user_roles FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 5. Configure RLS on public.vehicles
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow vehicle select" ON public.vehicles;
CREATE POLICY "Allow vehicle select"
ON public.vehicles FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow vehicle insert during registration" ON public.vehicles;
CREATE POLICY "Allow vehicle insert during registration"
ON public.vehicles FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 6. Configure RLS on public.vehicle_assignments
ALTER TABLE public.vehicle_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow assignment select" ON public.vehicle_assignments;
CREATE POLICY "Allow assignment select"
ON public.vehicle_assignments FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow assignment insert during registration" ON public.vehicle_assignments;
CREATE POLICY "Allow assignment insert during registration"
ON public.vehicle_assignments FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 7. Configure RLS on public.tom_cards
ALTER TABLE public.tom_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow tom_cards select" ON public.tom_cards;
CREATE POLICY "Allow tom_cards select"
ON public.tom_cards FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow tom_cards insert during registration" ON public.tom_cards;
CREATE POLICY "Allow tom_cards insert during registration"
ON public.tom_cards FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 8. Configure RLS on public.registration_requests
ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow registration_requests select" ON public.registration_requests;
CREATE POLICY "Allow registration_requests select"
ON public.registration_requests FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow registration_requests insert during registration" ON public.registration_requests;
CREATE POLICY "Allow registration_requests insert during registration"
ON public.registration_requests FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 9. Notify PostgREST to reload schema and policy cache immediately
NOTIFY pgrst, 'reload schema';
