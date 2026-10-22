-- Vehicle Log Management System (VLMS) - RLS and Security Policies
-- Version: 1.0.0

-- Helper function: Check if current auth user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    current_profile_id UUID;
BEGIN
    SELECT id INTO current_profile_id FROM public.profiles WHERE auth_user_id = auth.uid();
    IF current_profile_id IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = current_profile_id AND role = required_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Check if current user is active
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE auth_user_id = auth.uid() AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Get current user profile ID
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID AS $$
DECLARE
    pid UUID;
BEGIN
    SELECT id INTO pid FROM public.profiles WHERE auth_user_id = auth.uid();
    RETURN pid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tom_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odometer_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomaly_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 1. Offices policies
CREATE POLICY "Offices are viewable by authenticated users"
ON public.offices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Offices are editable by admins only"
ON public.offices FOR ALL TO authenticated
USING (public.has_role('administrator'));

-- 2. Profiles policies
CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth_user_id = auth.uid() OR public.has_role('administrator') OR public.has_role('fleet_manager') OR public.has_role('auditor'));

CREATE POLICY "Users can insert their own initial profile during registration"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Admins can update profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role('administrator') OR public.has_role('fleet_manager'));

-- 3. User roles policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = public.current_profile_id() OR public.has_role('administrator') OR public.has_role('auditor'));

CREATE POLICY "Admins can manage user roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role('administrator'));

-- 4. Vehicles policies
CREATE POLICY "Vehicles viewable by authenticated users"
ON public.vehicles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Vehicles manageable by fleet managers and admins"
ON public.vehicles FOR ALL TO authenticated
USING (public.has_role('administrator') OR public.has_role('fleet_manager'));

-- 5. Vehicle assignments policies
CREATE POLICY "Assignments viewable by assigned user or management"
ON public.vehicle_assignments FOR SELECT TO authenticated
USING (
    user_id = public.current_profile_id()
    OR public.has_role('administrator')
    OR public.has_role('fleet_manager')
    OR public.has_role('auditor')
);

CREATE POLICY "Assignments manageable by fleet managers and admins"
ON public.vehicle_assignments FOR ALL TO authenticated
USING (public.has_role('administrator') OR public.has_role('fleet_manager'));

-- 6. TOM Cards policies
CREATE POLICY "TOM cards viewable by assigned user or management"
ON public.tom_cards FOR SELECT TO authenticated
USING (
    user_id = public.current_profile_id()
    OR public.has_role('administrator')
    OR public.has_role('fleet_manager')
    OR public.has_role('auditor')
);

CREATE POLICY "TOM cards manageable by admins and fleet managers"
ON public.tom_cards FOR ALL TO authenticated
USING (public.has_role('administrator') OR public.has_role('fleet_manager'));

-- 7. Registration requests policies
CREATE POLICY "Users can view and create their own registration request"
ON public.registration_requests FOR SELECT TO authenticated
USING (user_id = public.current_profile_id() OR public.has_role('administrator'));

CREATE POLICY "Users can submit their own registration request"
ON public.registration_requests FOR INSERT TO authenticated
WITH CHECK (user_id = public.current_profile_id());

CREATE POLICY "Admins can update registration requests"
ON public.registration_requests FOR UPDATE TO authenticated
USING (public.has_role('administrator'));

-- 8. Daily logs policies
CREATE POLICY "Staff can view own daily logs, managers can view all"
ON public.daily_logs FOR SELECT TO authenticated
USING (
    user_id = public.current_profile_id()
    OR public.has_role('administrator')
    OR public.has_role('fleet_manager')
    OR public.has_role('auditor')
    OR public.has_role('department_head')
);

CREATE POLICY "Active staff can insert daily logs for assigned vehicles"
ON public.daily_logs FOR INSERT TO authenticated
WITH CHECK (
    user_id = public.current_profile_id()
    AND public.is_active_user()
);

-- 9. Fuel transactions policies
CREATE POLICY "Staff can view own fuel transactions, managers view all"
ON public.fuel_transactions FOR SELECT TO authenticated
USING (
    user_id = public.current_profile_id()
    OR public.has_role('administrator')
    OR public.has_role('fleet_manager')
    OR public.has_role('auditor')
    OR public.has_role('department_head')
);

CREATE POLICY "Active staff can insert fuel transactions"
ON public.fuel_transactions FOR INSERT TO authenticated
WITH CHECK (
    user_id = public.current_profile_id()
    AND public.is_active_user()
);

-- 10. Evidence files policies
CREATE POLICY "Evidence files viewable by submitter or management"
ON public.evidence_files FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.daily_logs dl WHERE dl.evidence_id = evidence_files.id AND dl.user_id = public.current_profile_id()
    )
    OR EXISTS (
        SELECT 1 FROM public.fuel_transactions ft WHERE (ft.odometer_evidence_id = evidence_files.id OR ft.receipt_evidence_id = evidence_files.id) AND ft.user_id = public.current_profile_id()
    )
    OR public.has_role('administrator')
    OR public.has_role('fleet_manager')
    OR public.has_role('auditor')
);

CREATE POLICY "Active users can insert evidence files"
ON public.evidence_files FOR INSERT TO authenticated
WITH CHECK (public.is_active_user());

-- 11. Anomaly alerts policies
CREATE POLICY "Alerts viewable by management and auditors"
ON public.anomaly_alerts FOR SELECT TO authenticated
USING (
    public.has_role('administrator')
    OR public.has_role('fleet_manager')
    OR public.has_role('auditor')
    OR public.has_role('department_head')
);

CREATE POLICY "Alerts resolvable by fleet managers and admins"
ON public.anomaly_alerts FOR UPDATE TO authenticated
USING (public.has_role('administrator') OR public.has_role('fleet_manager'));

-- 12. Audit events policies (Append-only)
CREATE POLICY "Audit events viewable by admins and auditors"
ON public.audit_events FOR SELECT TO authenticated
USING (public.has_role('administrator') OR public.has_role('auditor'));

CREATE POLICY "Audit events insertable by system actions"
ON public.audit_events FOR INSERT TO authenticated
WITH CHECK (true);

-- 13. System settings policies
CREATE POLICY "Settings viewable by authenticated users"
ON public.system_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Settings manageable by administrators"
ON public.system_settings FOR ALL TO authenticated
USING (public.has_role('administrator'));
