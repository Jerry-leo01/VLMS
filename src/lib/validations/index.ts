import { z } from 'zod';
import { normalizePlateNumber } from '../utils';

export const RegistrationSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  employeeId: z.string().optional(),
  plateNumber: z
    .string()
    .min(3, 'Plate number must be at least 3 characters')
    .transform(normalizePlateNumber),
  tomCardNumber: z.string().optional(),
  officeId: z.string().uuid('Please select a valid office location'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  privacyAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must acknowledge and accept the privacy policy',
  }),
});

export const LoginSchema = z.object({
  identifier: z
    .string()
    .min(3, 'Please enter your vehicle plate number or email')
    .transform((val) => val.trim()),
  password: z.string().min(1, 'Password is required'),
});

export const DailyLogSchema = z.object({
  vehicleId: z.string().uuid(),
  businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid business date format'),
  odometerKm: z.number().min(0, 'Odometer reading cannot be negative'),
  ocrReadingKm: z.number().min(0).nullable().optional(),
  ocrConfidence: z.number().min(0).max(100).nullable().optional(),
  evidenceId: z.string().uuid(),
  comment: z.string().max(500).optional().nullable(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  gpsAccuracyM: z.number().min(0).nullable().optional(),
});

export const TomCardFuelSchema = z.object({
  vehicleId: z.string().uuid(),
  tomCardId: z.string().uuid(),
  dailyLogId: z.string().uuid().nullable().optional(),
  vendorName: z.string().refine(
    (val) => val.trim().toUpperCase() === 'TOTAL ENERGIES FILLING STATION',
    { message: 'TOM Card vendor must be TOTAL ENERGIES FILLING STATION' }
  ),
  odometerKm: z.number().min(0, 'Odometer reading cannot be negative'),
  odometerEvidenceId: z.string().uuid(),
  amount: z.number().positive('Purchase amount must be greater than zero'),
  currency: z.string().default('NGN'),
  quantityLitres: z.number().positive('Fuel quantity must be greater than zero'),
  purchasedAt: z.string().datetime({ message: 'Invalid purchase timestamp' }),
  idempotencyKey: z.string().min(8, 'Valid idempotency key is required'),
});

export const PersonalFundFuelSchema = z.object({
  vehicleId: z.string().uuid(),
  dailyLogId: z.string().uuid().nullable().optional(),
  vendorName: z.string().min(2, 'Vendor/filling station name is required'),
  odometerKm: z.number().min(0, 'Odometer reading cannot be negative'),
  odometerEvidenceId: z.string().uuid(),
  receiptEvidenceId: z.string().uuid('Receipt evidence is required for personal funds'),
  amount: z.number().positive('Purchase amount must be greater than zero'),
  currency: z.string().default('NGN'),
  quantityLitres: z.number().positive('Fuel quantity must be greater than zero'),
  purchasedAt: z.string().datetime({ message: 'Invalid purchase timestamp' }),
  idempotencyKey: z.string().min(8, 'Valid idempotency key is required'),
});

export const AnomalyResolutionSchema = z.object({
  alertId: z.string().uuid(),
  status: z.enum(['investigating', 'resolved', 'dismissed']),
  resolutionNote: z.string().min(5, 'Resolution note must provide clear reasoning (min 5 characters)'),
});
