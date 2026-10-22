# VLMS Security and Authorization Architecture

## Security Principles

1. **Defense in Depth**:
   - Client-side form validation (React Hook Form & Zod).
   - Server-side validation on every Route Handler and Server Action.
   - Database-level Row-Level Security (RLS) policies on every table.
   - PostgreSQL constraints (nonnegative numbers, coordinates range, unique indexes).

2. **Role-Based Access Control (RBAC)**:
   - `staff`: Access to self-submitted daily logs, fuel transactions, assigned vehicle info.
   - `department_head`: Read-only access to staff and vehicles within their designated office/department.
   - `fleet_manager`: Fleet-wide read access, vehicle assignment management, anomaly investigation & resolution.
   - `auditor`: Fleet-wide read-only access to all evidence, transactions, and immutable audit logs.
   - `administrator`: Full administrative access, registration request approval/rejection, user roles and system settings.

3. **Private Evidence Storage**:
   - Evidence photos (odometer readings, receipts) are stored in private Supabase storage buckets (`vlms-evidence`).
   - Permanent public URLs are strictly forbidden.
   - Access to images is only granted through short-lived signed URLs (default: 15-minute expiration) generated on the server after verifying the user's role and permission.

4. **Audit Logging**:
   - All critical state transitions (Registration approval/rejection, daily log submission, fuel transaction submission, anomaly alert resolution, role change) generate append-only entries in `audit_events`.
   - Client cannot spoof actor IDs or timestamps.

5. **Secrets & Keys**:
   - `SUPABASE_SERVICE_ROLE_KEY` is exclusively used on the server in protected route handlers. It is never exposed to browser bundles.
