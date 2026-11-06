import { describe, it, expect } from 'vitest';
import { VLMSService } from '../src/lib/services/vlms-service';

describe('Registration System Uniqueness Constraints', () => {
  it('prevents duplicate staff registration with the same Staff / Employee ID', async () => {
    const uniqueEmpId = `EMP-UNIQ-${Date.now()}`;
    const email1 = `user1-${Date.now()}@testcorp.com`;
    const plate1 = `PLT-${Math.floor(1000 + Math.random() * 9000)}-AA`;

    // First registration with uniqueEmpId succeeds
    await VLMSService.submitRegistration({
      fullName: 'Primary Staff',
      employeeId: uniqueEmpId,
      email: email1,
      phoneNumber: '+234 801 111 2222',
      plateNumber: plate1,
      carName: 'Toyota Corolla',
      carModel: 'Corolla LE',
      carYear: 2023,
      tomCardNumber: '111222',
      officeId: '11111111-1111-1111-1111-111111111111',
      password: 'SecurePassword123!',
      requestedRole: 'staff',
    });

    // Attempting registration with identical Employee ID must be rejected
    const email2 = `user2-${Date.now()}@testcorp.com`;
    const plate2 = `PLT-${Math.floor(1000 + Math.random() * 9000)}-BB`;

    await expect(
      VLMSService.submitRegistration({
        fullName: 'Secondary Staff',
        employeeId: uniqueEmpId, // Duplicate Staff ID
        email: email2,
        phoneNumber: '+234 802 333 4444',
        plateNumber: plate2,
        carName: 'Honda Civic',
        carModel: 'Civic EX',
        carYear: 2024,
        tomCardNumber: '333444',
        officeId: '11111111-1111-1111-1111-111111111111',
        password: 'SecurePassword123!',
        requestedRole: 'staff',
      })
    ).rejects.toThrow(/already registered to another user account/i);
  });

  it('prevents duplicate registration with the same Vehicle Plate Number', async () => {
    const sharedPlate = `DUP-${Math.floor(1000 + Math.random() * 9000)}-LG`;
    const empId1 = `EMP-A-${Date.now()}`;
    const email1 = `driver-a-${Date.now()}@testcorp.com`;

    // First registration with sharedPlate succeeds
    await VLMSService.submitRegistration({
      fullName: 'Driver Alpha',
      employeeId: empId1,
      email: email1,
      phoneNumber: '+234 803 555 6666',
      plateNumber: sharedPlate,
      carName: 'Toyota Camry',
      carModel: 'Camry SE',
      carYear: 2022,
      tomCardNumber: '555666',
      officeId: '11111111-1111-1111-1111-111111111111',
      password: 'SecurePassword123!',
      requestedRole: 'staff',
    });

    // Attempting registration with identical Vehicle Number must be rejected
    const empId2 = `EMP-B-${Date.now()}`;
    const email2 = `driver-b-${Date.now()}@testcorp.com`;

    await expect(
      VLMSService.submitRegistration({
        fullName: 'Driver Beta',
        employeeId: empId2,
        email: email2,
        phoneNumber: '+234 804 777 8888',
        plateNumber: sharedPlate, // Duplicate Plate
        carName: 'Toyota Camry',
        carModel: 'Camry SE',
        carYear: 2022,
        tomCardNumber: '777888',
        officeId: '11111111-1111-1111-1111-111111111111',
        password: 'SecurePassword123!',
        requestedRole: 'staff',
      })
    ).rejects.toThrow(/already exists in the database/i);
  });

  it('prevents duplicate admin account registration with an existing Staff ID', async () => {
    const adminEmpId = `ADM-UNIQ-${Date.now()}`;
    const adminEmail1 = `admin1-${Date.now()}@testcorp.com`;

    // First admin account
    await VLMSService.registerAdminAccount({
      fullName: 'Admin One',
      employeeId: adminEmpId,
      email: adminEmail1,
      phoneNumber: '+234 805 123 4567',
      role: 'administrator',
      password: 'AdminPassword123!',
    });

    // Second admin attempt with duplicate Staff ID
    const adminEmail2 = `admin2-${Date.now()}@testcorp.com`;
    await expect(
      VLMSService.registerAdminAccount({
        fullName: 'Admin Two',
        employeeId: adminEmpId,
        email: adminEmail2,
        phoneNumber: '+234 806 987 6543',
        role: 'administrator',
        password: 'AdminPassword123!',
      })
    ).rejects.toThrow(/already registered to another user account/i);
  });

  it('prevents duplicate admin registration with the same corporate Email address', async () => {
    const sharedAdminEmail = `corp-admin-${Date.now()}@testcorp.com`;
    const empId1 = `ADM-A-${Date.now()}`;

    // First admin registration succeeds
    await VLMSService.registerAdminAccount({
      fullName: 'Primary Admin',
      employeeId: empId1,
      email: sharedAdminEmail,
      phoneNumber: '+234 810 111 2222',
      role: 'administrator',
      password: 'AdminPassword123!',
    });

    // Second admin registration with same email must be rejected
    const empId2 = `ADM-B-${Date.now()}`;
    await expect(
      VLMSService.registerAdminAccount({
        fullName: 'Duplicate Admin',
        employeeId: empId2,
        email: sharedAdminEmail,
        phoneNumber: '+234 810 333 4444',
        role: 'administrator',
        password: 'AdminPassword123!',
      })
    ).rejects.toThrow(/already registered to another user account/i);
  });

  it('prevents duplicate staff registration with the same Email address', async () => {
    const sharedStaffEmail = `driver-${Date.now()}@testcorp.com`;
    const empId1 = `EMP-M-${Date.now()}`;
    const plate1 = `PLT-${Math.floor(1000 + Math.random() * 9000)}-M1`;

    await VLMSService.submitRegistration({
      fullName: 'First Staff Driver',
      employeeId: empId1,
      email: sharedStaffEmail,
      phoneNumber: '+234 811 111 2222',
      plateNumber: plate1,
      carName: 'Toyota Corolla',
      carModel: 'Corolla LE',
      carYear: 2023,
      password: 'SecurePassword123!',
      requestedRole: 'staff',
    });

    const empId2 = `EMP-N-${Date.now()}`;
    const plate2 = `PLT-${Math.floor(1000 + Math.random() * 9000)}-N2`;

    await expect(
      VLMSService.submitRegistration({
        fullName: 'Second Staff Driver',
        employeeId: empId2,
        email: sharedStaffEmail, // Duplicate Email
        phoneNumber: '+234 811 333 4444',
        plateNumber: plate2,
        carName: 'Honda Civic',
        carModel: 'Civic EX',
        carYear: 2024,
        password: 'SecurePassword123!',
        requestedRole: 'staff',
      })
    ).rejects.toThrow(/already registered to another user account/i);
  });

  it('prevents vehicle registration assignment when staff member is already assigned to an active vehicle', async () => {
    const staffEmpId = `EMP-ASSIGN-${Date.now()}`;
    const staffEmail = `assigned-staff-${Date.now()}@testcorp.com`;
    const plateInitial = `INIT-${Math.floor(1000 + Math.random() * 9000)}-AB`;

    // Register initial staff with their initial assigned vehicle
    const reg = await VLMSService.submitRegistration({
      fullName: 'Staff With Active Vehicle',
      employeeId: staffEmpId,
      email: staffEmail,
      phoneNumber: '+234 807 333 9999',
      plateNumber: plateInitial,
      carName: 'Ford Ranger',
      carModel: 'Ranger XLT',
      carYear: 2023,
      tomCardNumber: '888999',
      officeId: '11111111-1111-1111-1111-111111111111',
      password: 'SecurePassword123!',
      requestedRole: 'staff',
    });

    const staffUserId = reg.user_id;

    // Attempting to register another vehicle and assign it to the same active staff member
    const newPlate = `FLEET-${Math.floor(1000 + Math.random() * 9000)}-XY`;

    await expect(
      VLMSService.registerVehicle({
        plateNumber: newPlate,
        make: 'Toyota',
        model: 'HiAce',
        year: 2024,
        status: 'active',
        assignedUserId: staffUserId, // Already assigned to plateInitial!
      })
    ).rejects.toThrow(/already assigned to active vehicle/i);
  });
});
