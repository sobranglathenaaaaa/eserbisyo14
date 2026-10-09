import {
  BARANGAY_CERTIFICATE_TEMPLATE_KEY,
  BUSINESS_PERMIT_TEMPLATE_KEY,
  CONSTRUCTION_PERMIT_TEMPLATE_KEY,
  INDIGENCY_TEMPLATE_KEY,
  LUPON_SUMMONS_TEMPLATE_KEY,
} from '@/lib/ocr/templates';

export type RequestTemplateFieldSource = {
  residentName: string;
  address?: string | null;
  addressLine?: string | null;
  province?: string | null;
  city?: string | null;
  barangay?: string | null;
  category?: string | null;
  documentType?: string | null;
  selectedTypeLabel?: string | null;
  purpose?: string | null;
  issuedDate: string;
};

function clean(value: string | null | undefined) {
  return value?.trim() ?? '';
}

export function extractAdditionalDetails(purpose: string | null | undefined) {
  const details: {
    businessName?: string;
    businessAddress?: string;
    addWhere?: string;
    projectLocation?: string;
    respondentName?: string;
    complainantName?: string;
  } = {};

  if (!purpose) return details;

  purpose.split('\n').forEach((line) => {
    const match = line.match(/^(Business Name|Business Address|Project Location|Site Location|Respondent Name|Complainant Name):\s*(.*)$/i);
    if (!match) return;
    const key = match[1].toLowerCase();
    const val = match[2].trim();
    if (key.includes('business name')) details.businessName = val;
    if (key.includes('business address')) details.businessAddress = val;
    if (key.includes('project location') || key.includes('site location')) {
      details.addWhere = val;
      details.projectLocation = val;
    }
    if (key.includes('respondent name')) details.respondentName = val;
    if (key.includes('complainant name')) details.complainantName = val;
  });

  return details;
}

export function getRequestedPersonDetails(purpose: string | null | undefined) {
  const details = {
    fullName: '',
    address: '',
  };

  if (!purpose?.includes('[Requested For Someone Else]')) return details;

  purpose.split('\n').forEach((line) => {
    const match = line.match(/^(Full Name|Address):\s*(.*)$/);
    if (match?.[1] === 'Full Name') details.fullName = match[2];
    if (match?.[1] === 'Address') details.address = match[2];
  });

  return details;
}

function includesAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}

function splitDateParts(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { day: '', month: '', year: '' };
  }
  return {
    day: String(date.getDate()),
    month: date.toLocaleString('en-US', { month: 'long' }),
    year: String(date.getFullYear()),
  };
}

export function normalizeTemplateFieldMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, fieldValue]) => {
    acc[key] = typeof fieldValue === 'string' ? fieldValue.trim() : fieldValue == null ? '' : String(fieldValue).trim();
    return acc;
  }, {});
}

export function resolveResidentAddress(source: RequestTemplateFieldSource) {
  const direct = clean(source.address);
  if (direct) return direct;

  const parts = [source.addressLine, source.barangay, source.city, source.province]
    .map(clean)
    .filter(Boolean);
  return parts.join(', ');
}

function resolveBarangayReasonFields(source: RequestTemplateFieldSource) {
  const combined = [
    source.selectedTypeLabel,
    source.documentType,
    source.category,
    source.purpose,
  ]
    .map(clean)
    .join(' ')
    .toLowerCase();

  const fields: Record<string, string> = {};
  if (includesAny(combined, ['employment'])) fields.reasonEmployment = 'Yes';
  if (includesAny(combined, ['residency', 'resident'])) fields.reasonResidency = 'Yes';
  if (includesAny(combined, ['medical'])) fields.reasonMedicalAssistance = 'Yes';
  if (includesAny(combined, ['health card'])) fields.reasonSjHealthCard = 'Yes';
  if (includesAny(combined, ['transfer'])) fields.reasonTransferResidence = 'Yes';
  if (includesAny(combined, ['postal', 'passport', 'visa'])) fields.reasonPostalId = 'Yes';
  if (includesAny(combined, ['school'])) fields.reasonSchoolReference = 'Yes';
  if (includesAny(combined, ['burial', 'death'])) fields.reasonBurialAssistance = 'Yes';
  if (includesAny(combined, ['sss', 'gsis', 'philhealth'])) fields.reasonSssGsisPhilhealth = 'Yes';
  if (includesAny(combined, ['financial', 'indigency', 'assistance'])) fields.reasonFinancialAssistance = 'Yes';
  if (includesAny(combined, ['senior', 'sr citizen', 'pwd'])) fields.reasonSrCitizenId = 'Yes';
  if (includesAny(combined, ['non-resident', 'non resident'])) fields.reasonNonResident = 'Yes';

  if (!Object.keys(fields).length && clean(source.purpose)) {
    fields.otherReasonText = clean(source.purpose);
  }

  return fields;
}

function resolveConstructionPermitFields(source: RequestTemplateFieldSource) {
  const combined = [
    source.selectedTypeLabel,
    source.documentType,
    source.category,
    source.purpose,
  ]
    .map(clean)
    .join(' ')
    .toLowerCase();

  const fields: Record<string, string> = {};
  if (includesAny(combined, ['mayor'])) fields.permitMayorsBusiness = 'Yes';
  if (includesAny(combined, ['building'])) fields.permitBuilding = 'Yes';
  if (includesAny(combined, ['occupancy'])) fields.permitOccupancy = 'Yes';
  if (includesAny(combined, ['excavation', 'excavate', 'drainage', 'water'])) fields.permitExcavation = 'Yes';
  if (includesAny(combined, ['demolition'])) fields.permitDemolition = 'Yes';
  if (includesAny(combined, ['renovation', 'repair', 'expansion'])) fields.permitRenovationRepair = 'Yes';
  if (includesAny(combined, ['construction', 'new structure', 'fencing', 'post'])) fields.permitConstruction = 'Yes';
  if (includesAny(combined, ['hauling', 'delivery', 'debris'])) fields.permitHauling = 'Yes';
  if (includesAny(combined, ['signage', 'billboard'])) fields.permitSignageBillboards = 'Yes';

  if (!Object.keys(fields).length && clean(source.purpose)) {
    fields.permitOther = 'Yes';
    fields.otherPermitText = clean(source.purpose);
  }

  return fields;
}

export function buildRequestTemplateDefaultFields(
  templateKey: string,
  source: RequestTemplateFieldSource,
): Record<string, string> {
  const requestedPerson = getRequestedPersonDetails(source.purpose);
  const additional = extractAdditionalDetails(source.purpose);
  const residentName = clean(requestedPerson.fullName) || clean(source.residentName) || 'Resident';
  const address = clean(requestedPerson.address) || resolveResidentAddress(source);

  if (templateKey === INDIGENCY_TEMPLATE_KEY) {
    return {
      residentName,
      address,
      requestedBy: residentName,
      issuedDate: source.issuedDate,
    };
  }

  if (templateKey === BARANGAY_CERTIFICATE_TEMPLATE_KEY) {
    return {
      residentName,
      residentAddressLine: address,
      issuedDate: source.issuedDate,
      ...resolveBarangayReasonFields(source),
    };
  }

  if (
    templateKey === LUPON_SUMMONS_TEMPLATE_KEY ||
    templateKey === 'lupon_tagapamayapa' ||
    templateKey === 'lupon_cfa' ||
    templateKey === 'lupon_notice' ||
    templateKey.includes('lupon')
  ) {
    const issuedDateParts = splitDateParts(source.issuedDate);
    return {
      barangayCaseNumber: '',
      dateFiled: source.issuedDate,
      complainants: additional.complainantName || residentName,
      complaintFor: clean(source.purpose) || clean(source.selectedTypeLabel) || clean(source.documentType),
      respondents: additional.respondentName || '',
      summonsTo: additional.respondentName || '',
      hearingDay: '',
      hearingMonth: '',
      hearingYear: '',
      hearingTime: '',
      hearingPeriod: '',
      issuedDay: issuedDateParts.day,
      issuedMonth: issuedDateParts.month,
      issuedYear: issuedDateParts.year,
      punongBarangay: 'CESAR JR. H. STO. DOMINGO',
    };
  }

  if (templateKey === BUSINESS_PERMIT_TEMPLATE_KEY || templateKey.includes('business')) {
    return {
      establishmentName: additional.businessName || clean(source.purpose) || '',
      businessName: additional.businessName || clean(source.purpose) || '',
      ownerName: residentName,
      postalAddress: additional.businessAddress || address,
      businessAddress: additional.businessAddress || address,
      issuedDate: source.issuedDate,
    };
  }

  if (templateKey === CONSTRUCTION_PERMIT_TEMPLATE_KEY || templateKey.includes('construction')) {
    const siteLoc = additional.addWhere || additional.projectLocation || address;
    return {
      ownerName: residentName,
      ownerAddress: address,
      add_where: siteLoc,
      addWhere: siteLoc,
      location: siteLoc,
      projectLocation: siteLoc,
      issuedDate: source.issuedDate,
      ...resolveConstructionPermitFields(source),
    };
  }

  const siteLoc = additional.addWhere || additional.projectLocation || address;
  return {
    residentName,
    address,
    add_where: siteLoc,
    addWhere: siteLoc,
    location: siteLoc,
    projectLocation: siteLoc,
    issuedDate: source.issuedDate,
  };
}
