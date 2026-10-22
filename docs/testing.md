# VLMS Testing Guide

## Automated Test Suites

### 1. Unit & Engine Tests
- **Anomaly Detection Engine** (`tests/anomaly-engine.test.ts`):
  - Validates detection of `ODO_DECREASE`, `ODO_ZERO_CHANGE`, `ODO_HIGH_DAILY_DISTANCE`, `OCR_LOW_CONFIDENCE`, `OCR_MANUAL_MISMATCH`, and `DUPLICATE_EVIDENCE`.
- **Validation Schemas** (`tests/validation-schemas.test.ts`):
  - Validates registration normalization, plate formatting, daily log coordinates validation, and fuel transaction rules.
- **Business Date Calculation** (`tests/business-rules.test.ts`):
  - Validates server business date calculations using Africa/Lagos timezone offset.

### 2. Integration Tests
- Daily log duplicate prevention (`tests/daily-log.test.ts`).
- TOM Card vendor enforcement & odometer evidence reuse (`tests/fuel-workflow.test.ts`).
- Role-based authorization & permission checks (`tests/auth-roles.test.ts`).

## Running Tests
```bash
# Run all unit and integration tests
npm test

# Run tests in watch mode
npm run test:watch
```
