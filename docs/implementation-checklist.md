# VLMS Implementation Checklist

## Acceptance Criteria & Status

| Category | Requirement | Status | Notes |
|---|---|---|---|
| **Auth & Profiles** | User registration with Plate Number, TOM card, Office | VERIFIED | With plate normalization |
| **Auth & Profiles** | Pending status upon registration (no early access) | VERIFIED | Strict RLS & status check |
| **Auth & Profiles** | Admin approval/rejection queue with audit trail | VERIFIED | Server-side approval action |
| **Auth & Profiles** | Plate-based or email-mapped secure login | VERIFIED | Plate normalized mapping |
| **Daily Logging** | Staff Home with assigned vehicle details & status | VERIFIED | Real database records |
| **Daily Logging** | Live camera capture with fallback file selection | VERIFIED | Mobile-first camera interface |
| **Daily Logging** | Odometer OCR candidate extraction & manual confirm | VERIFIED | Tesseract.js & regex parser |
| **Daily Logging** | GPS location capture & accuracy preview | VERIFIED | Geolocation API + Map view |
| **Daily Logging** | Database unique constraint on (vehicle_id, business_date) | VERIFIED | Enforced in SQL & server action |
| **Daily Logging** | Repeat login prompt: "Did you purchase fuel?" | VERIFIED | Direct modal/route workflow |
| **Fuel Workflow** | TOM Card workflow with fixed vendor TOTAL ENERGIES | VERIFIED | Card validation & fixed vendor |
| **Fuel Workflow** | Personal Fund workflow with vendor & receipt upload | VERIFIED | Private receipt evidence |
| **Fuel Workflow** | Odometer evidence reuse when reading unchanged | VERIFIED | Reuses daily log evidence file |
| **Fuel Workflow** | Multi-fuel transactions allowed per day | VERIFIED | Separate table with FK |
| **Fuel Workflow** | Idempotency protection against duplicate submissions | VERIFIED | Idempotency key constraint |
| **Management** | Master dashboard with real KPI cards & charts | VERIFIED | Database-backed queries |
| **Management** | User, Vehicle, Office & TOM Card management | VERIFIED | Full CRUD with audit trail |
| **Management** | Odometer evidence gallery & location map | VERIFIED | Signed URL evidence previews |
| **Anomaly Engine** | Rules: ODO_DECREASE, ZERO_CHANGE, HIGH_DISTANCE, etc. | VERIFIED | Comprehensive rules engine |
| **Anomaly Engine** | Management review & resolution queue | VERIFIED | Explainable statuses |
| **Audit & Security**| Append-only audit log for sensitive operations | VERIFIED | Immutable audit events |
| **Audit & Security**| Row Level Security (RLS) policies for all tables | VERIFIED | Tested Supabase RLS |
| **Audit & Security**| Private storage bucket for photos with signed URLs | VERIFIED | Short-lived signed URLs |
| **QA & Verification**| Vitest unit & integration tests | VERIFIED | Passes automated tests |
| **QA & Verification**| Production Next.js build compilation | VERIFIED | TypeScript clean compile |
