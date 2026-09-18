import { test, expect } from '@playwright/test';
import { createAuthedApiContext } from '../../_shared/automated/auth';
import { expectFailCode, expectOkJson } from '../../_shared/automated/contracts';

test.describe('Resident: Census', () => {
  test('RES-CENSUS-001 should enforce ownership and residency validation rules', async ({ request }) => {
    const { api } = await createAuthedApiContext(request, 'resident');

    const validOwned = await api.post('/api/v1/census', {
      data: {
        householdSize: 4,
        minorsCount: 1,
        ownershipStatus: 'owned',
        residencyClassification: 'owner',
      },
    });
    const validOwnedPayload = await expectOkJson<Record<string, unknown>>(validOwned);
    expect(validOwnedPayload.data).toBeTruthy();

    const invalidMismatch = await api.post('/api/v1/census', {
      data: {
        householdSize: 4,
        minorsCount: 1,
        ownershipStatus: 'owned',
        residencyClassification: 'tenant_renter',
      },
    });
    await expectFailCode(invalidMismatch, 'VALIDATION_ERROR');

    const missingYears = await api.post('/api/v1/census', {
      data: {
        householdSize: 4,
        minorsCount: 1,
        ownershipStatus: 'owned',
        residencyClassification: 'permanent_resident',
      },
    });
    await expectFailCode(missingYears, 'VALIDATION_ERROR');

    const validPermanentResident = await api.post('/api/v1/census', {
      data: {
        householdSize: 5,
        minorsCount: 2,
        ownershipStatus: 'owned',
        residencyClassification: 'permanent_resident',
        permanentResidentYears: 8,
      },
    });
    const validPermanentResidentPayload = await expectOkJson<Record<string, unknown>>(validPermanentResident);
    expect(validPermanentResidentPayload.data).toBeTruthy();
  });
});
