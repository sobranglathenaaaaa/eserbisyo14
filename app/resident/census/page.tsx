'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { PageGuide } from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { formatDateTime } from '@/lib/formatters';
import { upsertCensus } from '@/lib/frontend-data/store';
import { useAppState } from '@/lib/frontend-data/use-app-state';
import { copyText } from '@/features/resident/model/copy';
import { ResidentSection } from '@/features/resident/view/resident-primitives';
import { ResidentShell } from '@/features/resident/view/resident-shell';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';

type OwnershipStatus = 'owned' | 'rented';
type ResidencyClassification =
  | 'owner'
  | 'permanent_resident'
  | 'informal_settler'
  | 'tenant_renter'
  | 'boarder_lodger'
  | 'temporary_resident';

const RESIDENCY_BY_OWNERSHIP: Record<OwnershipStatus, ResidencyClassification[]> = {
  owned: ['owner', 'permanent_resident', 'informal_settler'],
  rented: ['tenant_renter', 'boarder_lodger', 'temporary_resident'],
};

function defaultResidencyForOwnership(ownershipStatus: OwnershipStatus): ResidencyClassification {
  return ownershipStatus === 'owned' ? 'owner' : 'tenant_renter';
}

function residencyLabel(locale: 'en' | 'fil', value: ResidencyClassification) {
  if (value === 'owner') return copyText(locale, 'Owner', 'May-ari');
  if (value === 'permanent_resident') return copyText(locale, 'Permanent Resident (6 months)', 'Permanent Resident (6 buwan)');
  if (value === 'informal_settler') return copyText(locale, 'Informal Settler', 'Impormal na Naninirahan');
  if (value === 'tenant_renter') return copyText(locale, 'Tenant/Renter', 'Nangungupahan');
  if (value === 'boarder_lodger') return copyText(locale, 'Boarder/Lodger', 'Boarder/Lodger');
  return copyText(locale, 'Temporary Resident (3 months)', 'Temporary Resident (3 buwan)');
}

function normalizeOwnership(value?: string): OwnershipStatus {
  return value === 'rented' || value === 'shared' ? 'rented' : 'owned';
}

function normalizeResidency(ownershipStatus: OwnershipStatus, value?: string): ResidencyClassification {
  if (value && RESIDENCY_BY_OWNERSHIP[ownershipStatus].includes(value as ResidencyClassification)) {
    return value as ResidencyClassification;
  }
  return defaultResidencyForOwnership(ownershipStatus);
}

export default function ResidentCensusPage() {
  const { state, user, locale } = useAppState();
  const current = useMemo(() => state.censusRecords.find((item) => item.residentId === user?.id), [state.censusRecords, user?.id]);
  const pageCopy = getRolePageCopy('resident/census');

  const [householdSize, setHouseholdSize] = useState(1);
  const [minorsCount, setMinorsCount] = useState(0);
  const [ownershipStatus, setOwnershipStatus] = useState<OwnershipStatus>('owned');
  const [residencyClassification, setResidencyClassification] = useState<ResidencyClassification>('owner');
  const [residenceYears, setResidenceYears] = useState('');
  const [residenceMonths, setResidenceMonths] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const ownership = normalizeOwnership(current?.ownershipStatus);
    setHouseholdSize(current?.householdSize ?? 1);
    setMinorsCount(current?.minorsCount ?? 0);
    setOwnershipStatus(ownership);
    setResidencyClassification(normalizeResidency(ownership, current?.residencyClassification));
    setResidenceYears(current?.yearsOfResidenceYears ? String(current.yearsOfResidenceYears) : '');
    setResidenceMonths(
      typeof current?.yearsOfResidenceMonths === 'number' && current.yearsOfResidenceMonths >= 0
        ? String(current.yearsOfResidenceMonths)
        : ''
    );
  }, [current]);

  useEffect(() => {
    if (!RESIDENCY_BY_OWNERSHIP[ownershipStatus].includes(residencyClassification)) {
      setResidencyClassification(defaultResidencyForOwnership(ownershipStatus));
    }
  }, [ownershipStatus, residencyClassification]);

  const residencyOptions = RESIDENCY_BY_OWNERSHIP[ownershipStatus];

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const yearsValue = residenceYears.trim();
    const monthsValue = residenceMonths.trim();
    const parsedYears = Number(yearsValue);
    const parsedMonths = Number(monthsValue);
    if (!Number.isInteger(parsedYears) || parsedYears < 0) {
      setErrorMessage(copyText(locale, 'Enter a valid number of years.', 'Maglagay ng tamang bilang ng taon.'));
      return;
    }
    if (!Number.isInteger(parsedMonths) || parsedMonths < 0 || parsedMonths > 11) {
      setErrorMessage(copyText(locale, 'Enter months from 0 to 11 only.', 'Maglagay ng buwan mula 0 hanggang 11 lang.'));
      return;
    }
    if (parsedYears === 0 && parsedMonths === 0) {
      setErrorMessage(copyText(locale, 'Enter your years or months of residence.', 'Ilagay ang taon o buwan ng paninirahan.'));
      return;
    }

    await upsertCensus({
      householdSize,
      minorsCount,
      ownershipStatus,
      residencyClassification,
      yearsOfResidenceYears: parsedYears,
      yearsOfResidenceMonths: parsedMonths,
    });
  };

  return (
    <ResidentShell title={pageCopy.title} description={pageCopy.description} showHero={false}>
      {pageCopy.guide ? (
        <PageGuide
          tone="resident"
          title={resolveRoleCopy(locale, pageCopy.guide.title)}
          summary={resolveRoleCopy(locale, pageCopy.guide.summary)}
          steps={resolveSteps(locale, pageCopy.guide.steps)}
          cta={{ label: resolveRoleCopy(locale, pageCopy.guide.cta.label), href: pageCopy.guide.cta.href }}
        />
      ) : null}
      <ResidentSection
        title={copyText(locale, 'Household and Census Information', 'Impormasyon ng Sambahayan at Census')}
        description={copyText(locale, 'Update household details used for barangay planning and resident support.', 'I-update ang detalye ng sambahayan para sa barangay planning at resident support.')}
      >
        <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[color:#123726]">{copyText(locale, 'Household size', 'Dami ng kasapi sa bahay')}</span>
            <Input type="number" min={1} value={householdSize} onChange={(event) => setHouseholdSize(Number(event.target.value))} required />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[color:#123726]">{copyText(locale, 'Number of minors', 'Bilang ng menor de edad')}</span>
            <Input type="number" min={0} value={minorsCount} onChange={(event) => setMinorsCount(Number(event.target.value))} required />
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[color:#123726]">{copyText(locale, 'Ownership status', 'Kalagayan ng tirahan')}</span>
            <Select value={ownershipStatus} onChange={(event) => setOwnershipStatus(event.target.value as OwnershipStatus)}>
              <option value="owned">{copyText(locale, 'Owned (sariling bahay)', 'Pag-aari (sariling bahay)')}</option>
              <option value="rented">{copyText(locale, 'Rented (nangungupahan)', 'Inuupahan (nangungupahan)')}</option>
            </Select>
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[color:#123726]">{copyText(locale, 'Residency classification', 'Klasipikasyon ng paninirahan')}</span>
            <Select
              value={residencyClassification}
              onChange={(event) => setResidencyClassification(event.target.value as ResidencyClassification)}
              required
            >
              {residencyOptions.map((option) => (
                <option key={option} value={option}>
                  {residencyLabel(locale, option)}
                </option>
              ))}
            </Select>
          </label>

          <div className="md:col-span-2 grid gap-2 rounded-xl border border-[color:#d3e5d8] bg-[color:#f7fbf8] p-3">
            <span className="text-sm font-medium text-[color:#123726]">{copyText(locale, 'Year/s of Residence', 'Year/s of Residence')}</span>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="text-[color:#456453]">{copyText(locale, '___ year', '___ taon')}</span>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={residenceYears}
                  onChange={(event) => setResidenceYears(event.target.value)}
                  placeholder={copyText(locale, 'Year', 'Taon')}
                  required
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-[color:#456453]">{copyText(locale, '__ months', '__ buwan')}</span>
                <Input
                  type="number"
                  min={0}
                  max={11}
                  step={1}
                  inputMode="numeric"
                  value={residenceMonths}
                  onChange={(event) => setResidenceMonths(event.target.value)}
                  placeholder={copyText(locale, 'Months (0-11)', 'Buwan (0-11)')}
                  required
                />
              </label>
            </div>
          </div>

          <div className="md:col-span-2 flex justify-end">
            {errorMessage ? <p className="mr-auto text-sm text-[color:#b42318]">{errorMessage}</p> : null}
            <Button type="submit" variant="resident">
              {copyText(locale, 'Save Profile Data', 'I-save ang Profile Data')}
            </Button>
          </div>
        </form>

        {current ? (
          <p className="mt-4 text-sm text-[color:#456453]">
            {copyText(locale, 'Last updated', 'Huling update')}: {formatDateTime(current.updatedAt, locale)}
          </p>
        ) : null}
      </ResidentSection>
    </ResidentShell>
  );
}
