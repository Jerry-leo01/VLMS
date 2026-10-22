# VLMS Business Rules

## 1. Daily Log Uniqueness
- **Constraint**: Exactly one official daily vehicle log per vehicle per business date.
- **Enforcement**: Database unique constraint `CONSTRAINT unique_vehicle_business_date UNIQUE (vehicle_id, business_date)`.
- **Timezone**: The business date is computed on the server using the configured timezone (`Africa/Lagos`), never trusted from client clock.
- **Repeat Login Handling**: If a user logs into the staff portal and a log already exists for their assigned vehicle for today, the system displays the existing log details and asks:
  > "Today's vehicle log has already been submitted. Did you purchase fuel?"

## 2. Fuel Purchase Rules
- **Multiple Entries**: Multiple legitimate fuel transactions can be submitted per vehicle per business day.
- **Payment Methods**:
  1. **TOM Card**:
     - Requires active TOM card assignment to the vehicle/user.
     - Vendor name is strictly enforced to `TOTAL ENERGIES FILLING STATION` (non-editable).
     - Must link to current odometer reading. If the reading has not changed since today's daily log, existing evidence can be referenced. If changed, new live photo and OCR confirmation are required.
  2. **Personal Fund**:
     - User enters the vendor/filling station name.
     - Mandatory fuel receipt photograph upload into private storage.
     - Current odometer reading with comparison against latest known valid reading.
- **Idempotency**: All fuel transaction submissions require an idempotency key to protect against double charges or accidental multiple clicks.

## 3. Odometer Evidence Reuse
- If odometer KM equals the linked daily log reading:
  - System avoids duplicate file uploads.
  - References the existing `evidence_files` record directly.
- If odometer KM has advanced:
  - System mandates capturing a new live dashboard photo and OCR confirmation.

## 4. Anomaly Rules & Triggers
The anomaly engine executes synchronously upon submission of daily logs or fuel purchases:
- `ODO_DECREASE` (Severity: High): New odometer reading is lower than previous recorded reading.
- `ODO_ZERO_CHANGE` (Severity: Low): Reading is identical to previous reading; flagged for contextual review.
- `ODO_HIGH_DAILY_DISTANCE` (Severity: Medium): Distance traveled in a single day exceeds configurable threshold (default: 800 km).
- `OCR_LOW_CONFIDENCE` (Severity: Low): OCR confidence score is below 60%.
- `OCR_MANUAL_MISMATCH` (Severity: Medium): User manually corrected reading by more than 10 km from OCR proposal.
- `FUEL_KM_MISMATCH` (Severity: High): Fuel odometer reading conflicts with sequential history.
- `DUPLICATE_EVIDENCE` (Severity: High): SHA-256 hash of evidence photo matches an unrelated prior submission.
- `MISSING_RECEIPT` (Severity: High): Personal-fund transaction submitted without receipt file.
- `LOCATION_OUTLIER` (Severity: Low): Coordinates are outside standard operating bounds or missing accuracy metrics.

## 5. Account Registration and Approval
- User registration requires: Full Name, Employee ID, Vehicle Plate Number, TOM Card Number (if assigned), Office Location, and Password.
- Plate numbers are normalized (uppercase, spaces trimmed).
- New accounts enter `pending` state immediately.
- Pending users are blocked from submitting daily logs, fuel transactions, or viewing fleet data.
- Only an Administrator can approve or reject registration requests.
