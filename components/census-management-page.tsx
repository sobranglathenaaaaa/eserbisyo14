'use client';

import { useMemo, useState } from 'react';
import { Home, Users, UserRound } from 'lucide-react';
import PortalShell from '@/components/portal-shell';
import { DashboardSection, DashboardSummaryCard, EmptyState } from '@/components/portal-ui';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/formatters';
import type { Census, UserRole } from '@/lib/types/models';
import { useAppState } from '@/lib/frontend-data/use-app-state';

type CensusManagementRole = Extract<UserRole, 'admin' | 'staff'>;

const classificationLabels: Record<Census['residencyClassification'], string> = {
  owner: 'Owner',
  permanent_resident: 'Permanent resident',
  informal_settler: 'Informal settler',
  tenant_renter: 'Tenant / renter',
  boarder_lodger: 'Boarder / lodger',
  temporary_resident: 'Temporary resident',
};

function formatResidence(census: Census) {
  const years = census.yearsOfResidenceYears ?? 0;
  const months = census.yearsOfResidenceMonths ?? 0;
  const parts: string[] = [];
  if (years) parts.push(`${years}y`);
  if (months) parts.push(`${months}m`);
  return parts.length ? parts.join(' ') : '-';
}

export function CensusManagementPage({ role }: { role: CensusManagementRole }) {
  const { state, locale } = useAppState();
  const [search, setSearch] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | Census['ownershipStatus']>('all');
  const [classificationFilter, setClassificationFilter] = useState<'all' | Census['residencyClassification']>('all');

  const residentMap = useMemo(() => new Map(state.users.map((user) => [user.id, user])), [state.users]);
  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return state.censusRecords
      .map((census) => ({ census, resident: residentMap.get(census.residentId) }))
      .filter(({ census, resident }) => {
        const searchable = `${resident?.fullName ?? ''} ${resident?.email ?? ''}`.toLowerCase();
        return (
          (!query || searchable.includes(query)) &&
          (ownershipFilter === 'all' || census.ownershipStatus === ownershipFilter) &&
          (classificationFilter === 'all' || census.residencyClassification === classificationFilter)
        );
      })
      .sort((a, b) => new Date(b.census.updatedAt).getTime() - new Date(a.census.updatedAt).getTime());
  }, [classificationFilter, ownershipFilter, residentMap, search, state.censusRecords]);

  const totalHouseholdMembers = state.censusRecords.reduce((sum, item) => sum + item.householdSize, 0);
  const totalMinors = state.censusRecords.reduce((sum, item) => sum + item.minorsCount, 0);
  const title = locale === 'fil' ? 'Census ng mga Residente' : 'Resident Census';
  const description =
    locale === 'fil'
      ? 'Tingnan ang pinakabagong household information na isinumite ng mga residente.'
      : 'Review the latest household information submitted by residents.';

  return (
    <PortalShell
      role={role}
      title={{ en: title, fil: title }}
      description={{ en: description, fil: description }}
    >
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <DashboardSummaryCard label={locale === 'fil' ? 'May census record' : 'Census records'} value={state.censusRecords.length} icon={<Users size={18} />} />
          <DashboardSummaryCard label={locale === 'fil' ? 'Kabuuang miyembro' : 'Household members'} value={totalHouseholdMembers} icon={<Home size={18} />} />
          <DashboardSummaryCard label={locale === 'fil' ? 'Mga menor de edad' : 'Minors recorded'} value={totalMinors} icon={<UserRound size={18} />} />
        </div>

        <DashboardSection
          title={title}
          description={description}
        >
          <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_220px]">
            <div className="relative">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={locale === 'fil' ? 'Hanapin ang residente...' : 'Search resident...'}
                aria-label={locale === 'fil' ? 'Hanapin ang residente' : 'Search resident'}
              />
            </div>
            <Select value={ownershipFilter} onChange={(event) => setOwnershipFilter(event.target.value as typeof ownershipFilter)} aria-label={locale === 'fil' ? 'Salain ayon sa pagmamay-ari' : 'Filter by ownership'}>
              <option value="all">{locale === 'fil' ? 'Lahat ng tirahan' : 'All ownership'}</option>
              <option value="owned">{locale === 'fil' ? 'Pag-aari' : 'Owned'}</option>
              <option value="rented">{locale === 'fil' ? 'Inuupahan' : 'Rented'}</option>
            </Select>
            <Select value={classificationFilter} onChange={(event) => setClassificationFilter(event.target.value as typeof classificationFilter)} aria-label={locale === 'fil' ? 'Salain ayon sa klasipikasyon' : 'Filter by classification'}>
              <option value="all">{locale === 'fil' ? 'Lahat ng klasipikasyon' : 'All classifications'}</option>
              {Object.entries(classificationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </div>

          {!rows.length ? (
            <EmptyState
              title={locale === 'fil' ? 'Walang census record' : 'No census records found'}
              description={locale === 'fil' ? 'Walang tumugma sa iyong search o filter.' : 'No records match your current search or filters.'}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{locale === 'fil' ? 'Residente' : 'Resident'}</TableHead>
                    <TableHead>{locale === 'fil' ? 'Sambahayan' : 'Household'}</TableHead>
                    <TableHead>{locale === 'fil' ? 'Tirahan' : 'Residence'}</TableHead>
                    <TableHead>{locale === 'fil' ? 'Tagal' :'Year/s of Residence'}</TableHead>
                    <TableHead>{locale === 'fil' ? 'Huling update' : 'Last updated'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ census, resident }) => (
                    <TableRow key={census.residentId}>
                      <TableCell className="min-w-[190px]">
                        <p className="font-medium text-[color:var(--portal-ink-900)]">{resident?.fullName ?? 'Resident'}</p>
                        {resident?.email ? <p className="text-xs text-[color:var(--portal-ink-500)]">{resident.email}</p> : null}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <p>{census.householdSize} {locale === 'fil' ? 'miyembro' : census.householdSize === 1 ? 'member' : 'members'}</p>
                        <p className="text-xs text-[color:var(--portal-ink-500)]">{census.minorsCount} {locale === 'fil' ? 'menor' : 'minors'}</p>
                      </TableCell>
                      <TableCell className="min-w-[180px]">
                        <p className="capitalize">{census.ownershipStatus}</p>
                        <p className="text-xs text-[color:var(--portal-ink-500)]">{classificationLabels[census.residencyClassification]}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatResidence(census)}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-[color:var(--portal-ink-600)]">{formatDateTime(census.updatedAt, locale)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DashboardSection>
      </div>
    </PortalShell>
  );
}