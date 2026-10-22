# Vehicle Log Management System (VLMS)

[![CI/CD Tests](https://img.shields.io/badge/Vitest-21%20Passed-emerald.svg)](tests/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Mode-blue.svg)](tsconfig.json)
[![Next.js](https://img.shields.io/badge/Next.js-15%20App%20Router-black.svg)](package.json)
[![Database](https://img.shields.io/badge/PostgreSQL-Supabase%20RLS-3ecf8e.svg)](supabase/migrations/)

VLMS is an enterprise-grade, mobile-first fleet operations and vehicle log management platform designed to track vehicle daily odometer readings, verify mileage through in-browser OCR and photographic evidence, manage fuel expenditures (TOM Cards and Personal Funds), and monitor fleet anomalies in real time.

---

## Key Features

1. **Daily Odometer Logging & In-Browser OCR**:
   - Mobile-first camera capture with custom odometer framing guides and upload fallback.
   - Client-side OCR via `Tesseract.js` proposing candidate readings with confidence scoring.
   - User confirmation with instant supervisory mismatch flagging.
   - Single-point HTML5 GPS location and accuracy stamp.
   - **Database unique constraint**: Exactly one official daily log per vehicle per business date (`Africa/Lagos` timezone).

2. **Repeat Login & Fuel Purchase Workflows**:
   - Repeat login prompt: *"Today's vehicle log has already been submitted. Did you purchase fuel?"*
   - **TOM Card Workflow**: Enforces active vehicle card assignment and fixed non-editable vendor (`TOTAL ENERGIES FILLING STATION`). Smart evidence reuse avoids duplicate photos when the odometer is unchanged.
   - **Personal-Fund Workflow**: Captures vendor name and mandatory fuel receipt photograph stored in private storage.
   - Multiple legitimate fuel transactions permitted per day with idempotency key protection.

3. **Explainable Rules-Based Anomaly Engine**:
   - Evaluates submissions synchronously against historical sequences.
   - Rules: `ODO_DECREASE`, `ODO_ZERO_CHANGE`, `ODO_HIGH_DAILY_DISTANCE`, `OCR_LOW_CONFIDENCE`, `OCR_MANUAL_MISMATCH`, `DUPLICATE_EVIDENCE`, `MISSING_RECEIPT`, and `LOCATION_OUTLIER`.
   - Management review queue with explainable statuses (`Open`, `Investigating`, `Resolved`, `Dismissed`) and mandatory resolution notes.

4. **Comprehensive Management Portal**:
   - Master operations dashboard with real database-backed KPI cards.
   - Driver registration queue with administrative approval/rejection.
   - Fleet vehicles directory, TOM card assignments, and interactive GPS map.
   - Photographic evidence gallery with SHA-256 integrity hashes.
   - Immutable append-only audit trail.
   - CSV export for daily logs and fuel transactions.

---

## Tech Stack

- **Framework**: Next.js 15 (App Router, Server Actions)
- **Language**: TypeScript (Strict typing enabled)
- **Styling**: Tailwind CSS & Lucide Icons
- **Database & Auth**: PostgreSQL 15+ / Supabase (with full Row-Level Security)
- **Testing**: Vitest & React Testing Library
- **OCR Engine**: Tesseract.js & Heuristic Odometer Regex Parser

---

## Getting Started

### Prerequisites
- Node.js v20+ or v24+
- npm v10+

### Installation
```bash
# Clone the repository
git clone https://github.com/JerryLeo-24/VLMS.git
cd VLMS

# Install dependencies
npm install
```

### Environment Configuration
Copy `.env.example` to `.env.local` and populate credentials:
```bash
cp .env.example .env.local
```

### Database Setup (Supabase)
Execute migrations in the Supabase SQL Editor:
1. `supabase/migrations/20261022000001_initial_schema.sql`
2. `supabase/migrations/20261022000002_rls_policies.sql`
3. (Optional demo seed data): `supabase/migrations/20261022000003_seed_dev_data.sql`

Create a private storage bucket named `vlms-evidence` in your Supabase project.

### Running Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Testing & Quality Assurance

Run the automated test suite:
```bash
# Run all unit and integration tests
npm test

# Run tests in watch mode
npm run test:watch
```

Run TypeScript build compilation:
```bash
npm run build
```

---

## Documentation
- [System Architecture](docs/architecture.md)
- [Database Schema & Migrations](docs/database.md)
- [Business Rules & Workflows](docs/business-rules.md)
- [Security & Authorization](docs/security.md)
- [Testing Guide](docs/testing.md)
- [Deployment Guide](docs/deployment.md)
- [Implementation Checklist](docs/implementation-checklist.md)

---

## License
Proprietary & Confidential - Fleet Operations Internal Use.
