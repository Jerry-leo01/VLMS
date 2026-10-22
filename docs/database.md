# VLMS Database Documentation

## Tables and Schema

### 1. `offices`
- `id`: UUID (PK)
- `name`: TEXT (Unique)
- `address`: TEXT
- `is_active`: BOOLEAN DEFAULT true
- `created_at`: TIMESTAMPTZ

### 2. `profiles`
- `id`: UUID (PK)
- `auth_user_id`: UUID (FK to auth.users, Unique)
- `full_name`: TEXT
- `employee_id`: TEXT (Unique, nullable)
- `office_id`: UUID (FK to offices)
- `status`: TEXT ('pending', 'active', 'rejected', 'suspended', 'deactivated')
- `created_at`: TIMESTAMPTZ
- `updated_at`: TIMESTAMPTZ

### 3. `user_roles`
- `user_id`: UUID (FK to profiles)
- `role`: TEXT ('staff', 'department_head', 'fleet_manager', 'auditor', 'administrator')
- Primary Key: `(user_id, role)`

### 4. `vehicles`
- `id`: UUID (PK)
- `plate_number`: TEXT (Unique, normalized uppercase)
- `make`: TEXT
- `model`: TEXT
- `year`: INTEGER
- `status`: TEXT ('active', 'inactive', 'maintenance', 'retired')
- `created_at`: TIMESTAMPTZ
- `updated_at`: TIMESTAMPTZ

### 5. `vehicle_assignments`
- `id`: UUID (PK)
- `user_id`: UUID (FK to profiles)
- `vehicle_id`: UUID (FK to vehicles)
- `starts_at`: TIMESTAMPTZ
- `ends_at`: TIMESTAMPTZ (NULL if currently active)
- `assigned_by`: UUID (FK to profiles)
- `created_at`: TIMESTAMPTZ

### 6. `tom_cards`
- `id`: UUID (PK)
- `card_reference`: TEXT (Unique)
- `masked_card_number`: TEXT (e.g., `7004 **** **** 1024`)
- `encrypted_card_number`: TEXT (nullable)
- `vehicle_id`: UUID (FK to vehicles, nullable)
- `user_id`: UUID (FK to profiles, nullable)
- `status`: TEXT ('active', 'inactive', 'blocked')
- `created_at`: TIMESTAMPTZ

### 7. `registration_requests`
- `id`: UUID (PK)
- `user_id`: UUID (FK to profiles)
- `requested_plate_number`: TEXT
- `requested_tom_card`: TEXT
- `requested_office_id`: UUID (FK to offices)
- `status`: TEXT ('pending', 'approved', 'rejected')
- `reviewer_id`: UUID (FK to profiles)
- `reviewed_at`: TIMESTAMPTZ
- `rejection_reason`: TEXT
- `created_at`: TIMESTAMPTZ

### 8. `evidence_files`
- `id`: UUID (PK)
- `storage_bucket`: TEXT DEFAULT 'vlms-evidence'
- `storage_path`: TEXT (Unique)
- `evidence_type`: TEXT ('daily_odometer', 'fuel_odometer', 'fuel_receipt', 'other')
- `sha256_hash`: TEXT (Indexed)
- `captured_at`: TIMESTAMPTZ
- `uploaded_at`: TIMESTAMPTZ
- `mime_type`: TEXT
- `file_size_bytes`: BIGINT
- `metadata`: JSONB
- `verification_status`: TEXT ('unverified', 'verified', 'flagged', 'rejected')

### 9. `daily_logs`
- `id`: UUID (PK)
- `vehicle_id`: UUID (FK to vehicles)
- `user_id`: UUID (FK to profiles)
- `business_date`: DATE NOT NULL
- `odometer_km`: NUMERIC(10, 2) NOT NULL CHECK (odometer_km >= 0)
- `ocr_reading_km`: NUMERIC(10, 2)
- `ocr_confidence`: NUMERIC(5, 2)
- `evidence_id`: UUID (FK to evidence_files)
- `comment`: TEXT
- `latitude`: NUMERIC(10, 7) CHECK (latitude BETWEEN -90 AND 90)
- `longitude`: NUMERIC(11, 7) CHECK (longitude BETWEEN -180 AND 180)
- `gps_accuracy_m`: NUMERIC(10, 2)
- `status`: TEXT ('submitted', 'flagged', 'verified', 'amended')
- `submitted_at`: TIMESTAMPTZ
- `created_at`: TIMESTAMPTZ
- **Constraint**: `UNIQUE (vehicle_id, business_date)`

### 10. `fuel_transactions`
- `id`: UUID (PK)
- `vehicle_id`: UUID (FK to vehicles)
- `user_id`: UUID (FK to profiles)
- `daily_log_id`: UUID (FK to daily_logs, nullable)
- `payment_method`: TEXT ('tom_card', 'personal_fund')
- `tom_card_id`: UUID (FK to tom_cards, nullable)
- `vendor_name`: TEXT NOT NULL
- `odometer_km`: NUMERIC(10, 2) NOT NULL CHECK (odometer_km >= 0)
- `odometer_evidence_id`: UUID (FK to evidence_files)
- `receipt_evidence_id`: UUID (FK to evidence_files)
- `amount`: NUMERIC(12, 2) CHECK (amount > 0)
- `currency`: TEXT DEFAULT 'NGN'
- `quantity_litres`: NUMERIC(10, 2) CHECK (quantity_litres > 0)
- `purchased_at`: TIMESTAMPTZ
- `submitted_at`: TIMESTAMPTZ
- `status`: TEXT ('submitted', 'verified', 'flagged', 'rejected')
- `idempotency_key`: TEXT UNIQUE NOT NULL

### 11. `odometer_readings`
- `id`: UUID (PK)
- `vehicle_id`: UUID (FK to vehicles)
- `daily_log_id`: UUID (FK to daily_logs, nullable)
- `fuel_transaction_id`: UUID (FK to fuel_transactions, nullable)
- `odometer_km`: NUMERIC(10, 2)
- `source_evidence_id`: UUID (FK to evidence_files)
- `reading_type`: TEXT ('daily_log', 'fuel_purchase', 'manual_adjustment')
- `recorded_at`: TIMESTAMPTZ
- `metadata`: JSONB

### 12. `anomaly_alerts`
- `id`: UUID (PK)
- `vehicle_id`: UUID (FK to vehicles)
- `daily_log_id`: UUID (FK to daily_logs, nullable)
- `fuel_transaction_id`: UUID (FK to fuel_transactions, nullable)
- `rule_code`: TEXT NOT NULL
- `severity`: TEXT ('low', 'medium', 'high', 'critical')
- `status`: TEXT ('open', 'investigating', 'resolved', 'dismissed')
- `details`: JSONB
- `reviewer_id`: UUID (FK to profiles, nullable)
- `resolution_note`: TEXT
- `created_at`: TIMESTAMPTZ
- `resolved_at`: TIMESTAMPTZ

### 13. `audit_events`
- `id`: UUID (PK)
- `actor_id`: UUID (FK to profiles, nullable)
- `action`: TEXT NOT NULL
- `entity_type`: TEXT NOT NULL
- `entity_id`: UUID NOT NULL
- `before_data`: JSONB
- `after_data`: JSONB
- `created_at`: TIMESTAMPTZ DEFAULT now()
- **Rule**: Append-only; no UPDATE or DELETE allowed.
