import {
  DEFAULT_OFFICIAL_TEMPLATES,
  OFFICIAL_DOCUMENT_CATEGORIES,
  OFFICIAL_WORD_TEMPLATES,
  getCategoryForDocType,
  getCategoryLabel,
} from '@/lib/documents/document-catalog-constants';

export const INDIGENCY_TEMPLATE_KEY = 'certificate_indigency';
export const INDIGENCY_TEMPLATE_VERSION = 'v2';
export const INDIGENCY_TEMPLATE_NAME = 'Certificate of Indigency Intake Form';
export const INDIGENCY_ASSISTANCE_TYPE = 'Indigency / Financial / Medical / Educational Assistance';
export const BARANGAY_CERTIFICATE_TEMPLATE_KEY = 'barangay_certificate';
export const BARANGAY_CERTIFICATE_TEMPLATE_VERSION = 'v1';
export const BARANGAY_CERTIFICATE_TEMPLATE_NAME = 'Barangay Certificate Intake Form';
export const LUPON_SUMMONS_TEMPLATE_KEY = 'lupon_summons';
export const LUPON_SUMMONS_TEMPLATE_VERSION = 'v1';
export const LUPON_SUMMONS_TEMPLATE_NAME = 'Lupon Summons Intake Form';
export const BUSINESS_PERMIT_TEMPLATE_KEY = 'business_permit';
export const BUSINESS_PERMIT_TEMPLATE_VERSION = 'v1';
export const BUSINESS_PERMIT_TEMPLATE_NAME = 'Business Permit Intake Form';
export const CONSTRUCTION_PERMIT_TEMPLATE_KEY = 'construction_permit';
export const CONSTRUCTION_PERMIT_TEMPLATE_VERSION = 'v1';
export const CONSTRUCTION_PERMIT_TEMPLATE_NAME = 'Construction Permit Intake Form';

export type OcrTemplateField = {
  key: string;
  label: string;
  required: boolean;
};

export type OcrTemplateDefinition = {
  key: string;
  version: string;
  name: string;
  intakeFields: OcrTemplateField[];
  requiredFields: string[];
  defaultFields: string[];
  labels: Record<string, string>;
  documentLabel: string;
  isDocumentType: (typeLabel: string | null | undefined, categoryLabel?: string | null | undefined) => boolean;
  getMissingFields: (parsedFields: Record<string, string>) => string[];
};

const INDIGENCY_FIELDS_BASE: OcrTemplateField[] = [
  { key: 'residentName', label: 'This is to certify that', required: true },
  { key: 'address', label: 'whose residence at', required: true },
  { key: 'requestedBy', label: 'issued upon the request of Mr./Mrs./Ms', required: true },
  { key: 'issuedDate', label: 'Date to issue (YYYY-MM-DD)', required: true },
];

const BARANGAY_CERTIFICATE_FIELDS_BASE: OcrTemplateField[] = [
  { key: 'residentName', label: 'This is to certify that (Resident Full Name)', required: true },
  { key: 'residentAddressLine', label: 'is a bonafide resident of (Resident Address)', required: true },
  { key: 'reasonGeneralCert', label: 'Barangay Certification (General)', required: false },
  { key: 'reasonIndigency', label: 'Certificate of Indigency', required: false },
  { key: 'reasonResidency', label: 'Certificate of Residency', required: false },
  { key: 'reasonGoodMoral', label: 'Certificate of Good Moral Character', required: false },
  { key: 'reasonEmployment', label: 'Application for Employment', required: false },
  { key: 'reasonSchoolReference', label: 'School Requirement / Scholarship', required: false },
  { key: 'reasonSrCitizenId', label: 'PWD / Senior Citizen Application', required: false },
  { key: 'reasonSjHealthCard', label: 'SJ Health Card / Medical Clearance', required: false },
  { key: 'reasonPoliceNbi', label: 'Police / NBI / Court Clearance', required: false },
  { key: 'reasonPostalId', label: 'Postal ID / Passport / Visa', required: false },
  { key: 'reasonBurialAssistance', label: 'Burial Assistance', required: false },
  { key: 'reasonSssGsisPhilhealth', label: 'SSS / GSIS / PhilHealth', required: false },
  { key: 'reasonFinancialAssistance', label: 'Financial Assistance', required: false },
  { key: 'reasonMedicalAssistance', label: 'Medical Assistance', required: false },
  { key: 'reasonTransferResidence', label: 'Transfer of Residence', required: false },
  { key: 'reasonNoOperation', label: 'Certificate of No Operation', required: false },
  { key: 'reasonNonResident', label: 'Non-Resident', required: false },
  { key: 'otherReasonText', label: 'Other: Please Specify', required: false },
  { key: 'issuedDate', label: 'Given this / Date Issued (YYYY-MM-DD)', required: true },
];

const LUPON_SUMMONS_FIELDS_BASE: OcrTemplateField[] = [
  { key: 'barangayCaseNumber', label: 'Barangay Case Number', required: true },
  { key: 'dateFiled', label: 'Date Filed', required: true },
  { key: 'complainants', label: 'Complainant/s', required: true },
  { key: 'complaintFor', label: 'Complaint For', required: true },
  { key: 'respondents', label: 'Respondent/s', required: true },
  { key: 'summonsTo', label: 'Summons To', required: true },
  { key: 'hearingDay', label: 'Hearing Day', required: true },
  { key: 'hearingMonth', label: 'Hearing Month', required: true },
  { key: 'hearingYear', label: 'Hearing Year', required: true },
  { key: 'hearingTime', label: 'Hearing Time', required: true },
  { key: 'hearingPeriod', label: 'Hearing Period', required: true },
  { key: 'issuedDay', label: 'Issued Day', required: true },
  { key: 'issuedMonth', label: 'Issued Month', required: true },
  { key: 'issuedYear', label: 'Issued Year', required: true },
  { key: 'punongBarangay', label: 'Punong Barangay', required: false },
];

const BUSINESS_PERMIT_FIELDS_BASE: OcrTemplateField[] = [
  { key: 'establishmentName', label: 'Name of Establishment', required: true },
  { key: 'ownerName', label: 'Name of Owner', required: true },
  { key: 'postalAddress', label: 'With postal address at', required: true },
  { key: 'issuedDate', label: 'Issued this (YYYY-MM-DD)', required: true },
];

const CONSTRUCTION_PERMIT_FIELDS_BASE: OcrTemplateField[] = [
  { key: 'permitMayorsBusiness', label: "Mayor's Business Permit", required: false },
  { key: 'permitBuilding', label: 'Building Permit', required: false },
  { key: 'permitOccupancy', label: 'Occupancy Permit', required: false },
  { key: 'permitExcavation', label: 'Excavation Permit', required: false },
  { key: 'permitDemolition', label: 'Demolition Permit', required: false },
  { key: 'permitRenovationRepair', label: 'Renovation/Repair Permit', required: false },
  { key: 'permitConstruction', label: 'Construction Permit', required: false },
  { key: 'permitHauling', label: 'Hauling Permit', required: false },
  { key: 'permitSignageBillboards', label: 'Signage/Billboards Permit', required: false },
  { key: 'permitOther', label: 'Others', required: false },
  { key: 'otherPermitText', label: 'Others: Please Specify', required: false },
  { key: 'ownerName', label: 'Name of Owner', required: true },
  { key: 'ownerAddress', label: 'Address of Owner', required: true },
  { key: 'issuedDate', label: 'Given this (YYYY-MM-DD)', required: true },
];

const BARANGAY_REASON_KEYS = [
  'reasonGeneralCert',
  'reasonIndigency',
  'reasonResidency',
  'reasonGoodMoral',
  'reasonEmployment',
  'reasonSchoolReference',
  'reasonSrCitizenId',
  'reasonSjHealthCard',
  'reasonPoliceNbi',
  'reasonPostalId',
  'reasonBurialAssistance',
  'reasonSssGsisPhilhealth',
  'reasonFinancialAssistance',
  'reasonMedicalAssistance',
  'reasonTransferResidence',
  'reasonNoOperation',
  'reasonNonResident',
] as const;

const CONSTRUCTION_PERMIT_SELECTION_KEYS = [
  'permitMayorsBusiness',
  'permitBuilding',
  'permitOccupancy',
  'permitExcavation',
  'permitDemolition',
  'permitRenovationRepair',
  'permitConstruction',
  'permitHauling',
  'permitSignageBillboards',
  'permitOther',
] as const;

function toLabels(fields: OcrTemplateField[]) {
  return fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.key] = field.label;
    return acc;
  }, {});
}

function toDefaultFields(fields: OcrTemplateField[]) {
  return fields.map((field) => field.key);
}

function toRequiredFields(fields: OcrTemplateField[]) {
  return fields.filter((field) => field.required).map((field) => field.key);
}

function hasReasonMark(value: string | undefined) {
  const normalized = (value ?? '').trim().toLowerCase();
  return Boolean(normalized && !['0', 'false', 'no', 'none', 'n/a'].includes(normalized));
}

function getMissingIndigencyFields(parsedFields: Record<string, string>) {
  return toRequiredFields(INDIGENCY_FIELDS_BASE).filter((field) => {
    if (field === 'address') {
      return !((parsedFields.address ?? parsedFields.residentAddress ?? parsedFields.residentAddressLine ?? parsedFields.residenceAddress ?? '').trim());
    }
    if (field === 'requestedBy') {
      return !((parsedFields.requestedBy ?? parsedFields.residentName ?? '').trim());
    }
    if (field === 'issuedDate') {
      const direct = (parsedFields.issuedDate ?? parsedFields.dateIssued ?? '').trim();
      const hasSplitParts = Boolean(
        (parsedFields.issuedDay ?? '').trim() &&
          (parsedFields.issuedMonth ?? '').trim() &&
          (parsedFields.issuedYear ?? '').trim(),
      );
      return !(direct || hasSplitParts);
    }
    return !(parsedFields[field] ?? '').trim();
  });
}

function getMissingBarangayCertificateFields(parsedFields: Record<string, string>) {
  const missing: string[] = [];
  if (!(parsedFields.residentName ?? '').trim()) missing.push('residentName');
  const hasAddress = Boolean((parsedFields.residentAddressLine ?? parsedFields.residentAddress ?? parsedFields.address ?? parsedFields.residenceAddress ?? '').trim());
  if (!hasAddress) missing.push('residentAddressLine');
  const issuedDate = (parsedFields.issuedDate ?? parsedFields.dateIssued ?? '').trim();
  if (!issuedDate) missing.push('issuedDate');
  return missing;
}

function getMissingLuponSummonsFields(parsedFields: Record<string, string>) {
  return toRequiredFields(LUPON_SUMMONS_FIELDS_BASE).filter((field) => !(parsedFields[field] ?? '').trim());
}

function getMissingBusinessPermitFields(parsedFields: Record<string, string>) {
  return toRequiredFields(BUSINESS_PERMIT_FIELDS_BASE).filter((field) => !(parsedFields[field] ?? '').trim());
}

function getMissingConstructionPermitFields(parsedFields: Record<string, string>) {
  const missing: string[] = [];
  if (!(parsedFields.ownerName ?? '').trim()) missing.push('ownerName');
  if (!(parsedFields.ownerAddress ?? '').trim()) missing.push('ownerAddress');
  const hasMarkedPermit = CONSTRUCTION_PERMIT_SELECTION_KEYS.some((key) => hasReasonMark(parsedFields[key]));
  if (!hasMarkedPermit) {
    missing.push('permitSelection');
  }
  const issuedDate = (parsedFields.issuedDate ?? parsedFields.dateIssued ?? '').trim();
  if (!issuedDate) missing.push('issuedDate');
  return missing;
}

function isIndigencyAssistanceType(typeLabel: string | null | undefined, categoryLabel?: string | null | undefined): boolean {
  if (includesLabel(categoryLabel, 'barangay certification')) return true;
  if (!typeLabel) return false;
  const value = typeLabel.toLowerCase();
  return value.includes('indigency') || (value.includes('assistance') && value.includes('certificate'));
}

function isBarangayCertificateType(typeLabel: string | null | undefined, categoryLabel?: string | null | undefined): boolean {
  if (includesLabel(categoryLabel, 'barangay certification') || includesLabel(categoryLabel, 'barangay certificate')) return true;
  if (!typeLabel) return false;
  const value = typeLabel.toLowerCase();
  return (
    (value.includes('barangay') && (value.includes('certificate') || value.includes('clearance') || value.includes('certification'))) ||
    value.includes('indigency') ||
    value.includes('residency') ||
    value.includes('good moral')
  );
}

function isLuponSummonsType(typeLabel: string | null | undefined, categoryLabel?: string | null | undefined): boolean {
  const value = typeLabel?.toLowerCase() ?? '';
  const isLuponCategory = includesLabel(categoryLabel, 'lupon ng mga tagapamayapa');
  if (isLuponCategory) {
    return value.includes('filing') || value.includes('summons') || value.includes('barangay case');
  }
  return value.includes('lupon') && (value.includes('filing') || value.includes('summons'));
}

function includesLabel(value: string | null | undefined, needle: string) {
  return Boolean(value?.toLowerCase().includes(needle));
}

function isBusinessPermitType(typeLabel: string | null | undefined, categoryLabel?: string | null | undefined): boolean {
  return (
    includesLabel(categoryLabel, 'business clearance') ||
    includesLabel(typeLabel, 'business clearance') ||
    includesLabel(typeLabel, 'business permit')
  );
}

function isConstructionPermitType(typeLabel: string | null | undefined, categoryLabel?: string | null | undefined): boolean {
  if (includesLabel(categoryLabel, 'construction clearance')) return true;
  if (!typeLabel) return false;
  const value = typeLabel.toLowerCase();
  return [
    'building permit',
    'occupancy',
    'excavation',
    'demolition',
    'renovation',
    'construction permit',
    'construction of new structure',
    'fencing',
    'electric or communication post',
    'drainage works',
  ].some((candidate) => value.includes(candidate));
}

const TEMPLATES_BY_KEY: Record<string, OcrTemplateDefinition> = {
  [INDIGENCY_TEMPLATE_KEY]: {
    key: INDIGENCY_TEMPLATE_KEY,
    version: INDIGENCY_TEMPLATE_VERSION,
    name: INDIGENCY_TEMPLATE_NAME,
    intakeFields: INDIGENCY_FIELDS_BASE,
    requiredFields: toRequiredFields(INDIGENCY_FIELDS_BASE),
    defaultFields: toDefaultFields(INDIGENCY_FIELDS_BASE),
    labels: toLabels(INDIGENCY_FIELDS_BASE),
    documentLabel: 'Certificate of Indigency',
    isDocumentType: isIndigencyAssistanceType,
    getMissingFields: getMissingIndigencyFields,
  },
  [BARANGAY_CERTIFICATE_TEMPLATE_KEY]: {
    key: BARANGAY_CERTIFICATE_TEMPLATE_KEY,
    version: BARANGAY_CERTIFICATE_TEMPLATE_VERSION,
    name: BARANGAY_CERTIFICATE_TEMPLATE_NAME,
    intakeFields: BARANGAY_CERTIFICATE_FIELDS_BASE,
    requiredFields: ['residentName', 'residentAddressLine', 'issuedDate', 'reasonSelection'],
    defaultFields: toDefaultFields(BARANGAY_CERTIFICATE_FIELDS_BASE),
    labels: toLabels(BARANGAY_CERTIFICATE_FIELDS_BASE),
    documentLabel: 'Barangay Certificate',
    isDocumentType: isBarangayCertificateType,
    getMissingFields: getMissingBarangayCertificateFields,
  },
  [LUPON_SUMMONS_TEMPLATE_KEY]: {
    key: LUPON_SUMMONS_TEMPLATE_KEY,
    version: LUPON_SUMMONS_TEMPLATE_VERSION,
    name: LUPON_SUMMONS_TEMPLATE_NAME,
    intakeFields: LUPON_SUMMONS_FIELDS_BASE,
    requiredFields: toRequiredFields(LUPON_SUMMONS_FIELDS_BASE),
    defaultFields: toDefaultFields(LUPON_SUMMONS_FIELDS_BASE),
    labels: toLabels(LUPON_SUMMONS_FIELDS_BASE),
    documentLabel: 'Lupon Summons',
    isDocumentType: isLuponSummonsType,
    getMissingFields: getMissingLuponSummonsFields,
  },
  [BUSINESS_PERMIT_TEMPLATE_KEY]: {
    key: BUSINESS_PERMIT_TEMPLATE_KEY,
    version: BUSINESS_PERMIT_TEMPLATE_VERSION,
    name: BUSINESS_PERMIT_TEMPLATE_NAME,
    intakeFields: BUSINESS_PERMIT_FIELDS_BASE,
    requiredFields: toRequiredFields(BUSINESS_PERMIT_FIELDS_BASE),
    defaultFields: toDefaultFields(BUSINESS_PERMIT_FIELDS_BASE),
    labels: toLabels(BUSINESS_PERMIT_FIELDS_BASE),
    documentLabel: 'Business Permit',
    isDocumentType: isBusinessPermitType,
    getMissingFields: getMissingBusinessPermitFields,
  },
  [CONSTRUCTION_PERMIT_TEMPLATE_KEY]: {
    key: CONSTRUCTION_PERMIT_TEMPLATE_KEY,
    version: CONSTRUCTION_PERMIT_TEMPLATE_VERSION,
    name: CONSTRUCTION_PERMIT_TEMPLATE_NAME,
    intakeFields: CONSTRUCTION_PERMIT_FIELDS_BASE,
    requiredFields: ['ownerName', 'ownerAddress', 'permitSelection', 'issuedDate'],
    defaultFields: toDefaultFields(CONSTRUCTION_PERMIT_FIELDS_BASE),
    labels: toLabels(CONSTRUCTION_PERMIT_FIELDS_BASE),
    documentLabel: 'Construction Permit',
    isDocumentType: isConstructionPermitType,
    getMissingFields: getMissingConstructionPermitFields,
  },
};

export function buildDynamicOcrTemplateDefinition(docTemplate: {
  id: string;
  name: string;
  body?: string;
  dynamicFields?: string[];
  fieldMappings?: Array<{ staticText: string; category: string; mappedTo: string; confidence?: number }>;
  documentType?: string;
}): OcrTemplateDefinition {
  const key = docTemplate.id;
  const name = docTemplate.name || 'Document Template';
  const dynamicFields = docTemplate.dynamicFields || [];

  const FIELD_LABELS: Record<string, { label: string; required: boolean }> = {
    resident_name: { label: 'Resident Full Name', required: true },
    residentName: { label: 'Resident Full Name', required: true },
    resident_address: { label: 'Resident Address', required: true },
    address: { label: 'Resident Address', required: true },
    residentAddress: { label: 'Resident Address', required: true },
    residentAddressLine: { label: 'Resident Address', required: true },
    purpose: { label: 'Purpose / Assistance Type', required: true },
    reason: { label: 'Purpose / Assistance Type', required: true },
    date_issued: { label: 'Date Issued (YYYY-MM-DD)', required: true },
    issuedDate: { label: 'Date Issued (YYYY-MM-DD)', required: true },
    reference_number: { label: 'Reference / Control Number', required: false },
    referenceNumber: { label: 'Reference / Control Number', required: false },
    owner_name: { label: 'Name of Owner', required: true },
    ownerName: { label: 'Name of Owner', required: true },
    owner_address: { label: 'Address of Owner', required: true },
    ownerAddress: { label: 'Address of Owner', required: true },
    establishment_name: { label: 'Name of Establishment', required: true },
    establishmentName: { label: 'Name of Establishment', required: true },
    postal_address: { label: 'Postal Address', required: true },
    postalAddress: { label: 'Postal Address', required: true },
    barangay_case_number: { label: 'Barangay Case Number', required: true },
    barangayCaseNumber: { label: 'Barangay Case Number', required: true },
    complainants: { label: 'Complainant/s', required: true },
    complaint_for: { label: 'Complaint For', required: true },
    complaintFor: { label: 'Complaint For', required: true },
    respondents: { label: 'Respondent/s', required: true },
    summons_to: { label: 'Summons To', required: true },
    summonsTo: { label: 'Summons To', required: true },
    hearing_time: { label: 'Hearing Schedule', required: true },
    hearingTime: { label: 'Hearing Schedule', required: true },
  };

  const systemSealsAndOfficials = new Set([
    'punong_barangay',
    'punongBarangay',
    'barangay_secretary',
    'barangaySecretary',
    'barangay_treasurer',
    'barangayTreasurer',
    'kagawad_list',
    'kagawadList',
    'barangay_name',
    'barangayName',
    'city',
    'cityName',
    'barangay_address',
    'barangayAddress',
    'barangay_email',
    'barangayEmail',
    'barangay_phone',
    'barangayPhone',
    'country_seal',
    'city_seal',
    'barangay_seal',
    'barangay_watermark',
    'official_seal',
  ]);

  const intakeFields: OcrTemplateField[] = [];
  const labels: Record<string, string> = {};
  const addedKeys = new Set<string>();

  if (docTemplate.fieldMappings && docTemplate.fieldMappings.length > 0) {
    for (const mapping of docTemplate.fieldMappings) {
      const fieldKey = mapping.mappedTo.replace(/^\{\{|\}\}$/g, '').trim();
      if (!fieldKey || systemSealsAndOfficials.has(fieldKey) || addedKeys.has(fieldKey)) continue;
      addedKeys.add(fieldKey);
      const isReq = ['resident_name', 'residentName', 'purpose', 'date_issued', 'issuedDate', 'owner_name', 'ownerName', 'establishment_name', 'establishmentName'].includes(fieldKey);
      const label = mapping.staticText || FIELD_LABELS[fieldKey]?.label || fieldKey.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      intakeFields.push({ key: fieldKey, label, required: isReq });
      labels[fieldKey] = label;
    }
  } else if (dynamicFields.length > 0) {
    for (const df of dynamicFields) {
      const cleanKey = df.replace(/^\{\{|\}\}$/g, '').trim();
      if (!cleanKey || systemSealsAndOfficials.has(cleanKey) || addedKeys.has(cleanKey)) continue;
      addedKeys.add(cleanKey);
      const meta = FIELD_LABELS[cleanKey] || {
        label: cleanKey.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        required: false,
      };
      intakeFields.push({ key: cleanKey, label: meta.label, required: meta.required });
      labels[cleanKey] = meta.label;
    }
  }

  // Fallback defaults if no field was recognized
  if (intakeFields.length === 0) {
    const fallbackList = [
      { key: 'residentName', label: 'Resident Full Name', required: true },
      { key: 'address', label: 'Resident Address', required: true },
      { key: 'purpose', label: 'Purpose / Assistance Type', required: true },
      { key: 'issuedDate', label: 'Date Issued (YYYY-MM-DD)', required: true },
    ];
    for (const f of fallbackList) {
      intakeFields.push(f);
      labels[f.key] = f.label;
    }
  }

  const requiredFields = intakeFields.filter((f) => f.required).map((f) => f.key);
  const defaultFields = intakeFields.map((f) => f.key);

  return {
    key,
    version: 'v1',
    name,
    intakeFields,
    requiredFields,
    defaultFields,
    labels,
    documentLabel: name,
    isDocumentType: () => true,
    getMissingFields: (parsedFields: Record<string, string>) => {
      return requiredFields.filter((field) => {
        const snake = field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        const camel = field.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
        const val = parsedFields[field] ?? parsedFields[snake] ?? parsedFields[camel] ?? '';
        return !val.trim();
      });
    },
  };
}

export function getCategoryDefaultOcrTemplate(categoryId: string): OcrTemplateDefinition {
  switch (categoryId) {
    case 'barangay_certification':
      return TEMPLATES_BY_KEY[BARANGAY_CERTIFICATE_TEMPLATE_KEY] ?? getDefaultOcrTemplate();
    case 'lupon_tagapamayapa':
      return TEMPLATES_BY_KEY[LUPON_SUMMONS_TEMPLATE_KEY] ?? getDefaultOcrTemplate();
    case 'business_clearance':
      return TEMPLATES_BY_KEY[BUSINESS_PERMIT_TEMPLATE_KEY] ?? getDefaultOcrTemplate();
    case 'construction_clearances':
      return TEMPLATES_BY_KEY[CONSTRUCTION_PERMIT_TEMPLATE_KEY] ?? getDefaultOcrTemplate();
    case 'transient_employees':
      return buildDynamicOcrTemplateDefinition({
        id: 'transient_employees',
        name: 'Transient Employees & Worker Certification',
        dynamicFields: ['resident_name', 'resident_address', 'employer_name', 'workplace_address', 'position', 'purpose', 'date_issued', 'punong_barangay'],
      });
    case 'delivery_hauling_clearances':
      return buildDynamicOcrTemplateDefinition({
        id: 'delivery_hauling_clearances',
        name: 'Delivery & Hauling Clearances',
        dynamicFields: ['applicant_name', 'contractor_name', 'hauling_address', 'vehicle_plate_number', 'purpose', 'date_issued', 'punong_barangay'],
      });
    case 'special_commercial_permits':
      return buildDynamicOcrTemplateDefinition({
        id: 'special_commercial_permits',
        name: 'Special & Commercial Permits',
        dynamicFields: ['applicant_name', 'organization_name', 'activity_description', 'location', 'valid_date_range', 'purpose', 'date_issued', 'punong_barangay'],
      });
    default:
      return TEMPLATES_BY_KEY[categoryId] ?? getDefaultOcrTemplate();
  }
}

export function buildAdminTemplateOcrDefinition(docTemplate: {
  id: string;
  name: string;
  documentType?: string | null;
  body?: string;
  dynamicFields?: string[];
}): OcrTemplateDefinition {
  const category = getCategoryForDocType(docTemplate.documentType, docTemplate.name);
  const categoryTemplate = getCategoryDefaultOcrTemplate(category);
  return {
    ...categoryTemplate,
    key: docTemplate.id,
    name: docTemplate.name,
    documentLabel: docTemplate.name,
  };
}

export function getOcrTemplateByKey(templateKey: string | null | undefined) {
  if (!templateKey) return null;
  if (TEMPLATES_BY_KEY[templateKey]) return TEMPLATES_BY_KEY[templateKey];

  const defaultTpl = DEFAULT_OFFICIAL_TEMPLATES.find((t) => t.id === templateKey);
  if (defaultTpl) {
    const categoryDef = getCategoryDefaultOcrTemplate(defaultTpl.categoryId);
    return {
      ...categoryDef,
      key: defaultTpl.id,
      name: defaultTpl.name,
      documentLabel: defaultTpl.name,
    };
  }

  const wordTpl = OFFICIAL_WORD_TEMPLATES.find((t) => t.id === templateKey);
  if (wordTpl) {
    const categoryDef = getCategoryDefaultOcrTemplate(wordTpl.categoryId);
    return {
      ...categoryDef,
      key: wordTpl.id,
      name: wordTpl.name,
      documentLabel: wordTpl.name,
    };
  }

  const officialCategories = [
    'barangay_certification',
    'transient_employees',
    'lupon_tagapamayapa',
    'business_clearance',
    'construction_clearances',
    'delivery_hauling_clearances',
    'special_commercial_permits',
  ];
  if (officialCategories.includes(templateKey)) {
    return getCategoryDefaultOcrTemplate(templateKey);
  }
  return null;
}

export function getDefaultOcrTemplate() {
  return TEMPLATES_BY_KEY[BARANGAY_CERTIFICATE_TEMPLATE_KEY] ?? TEMPLATES_BY_KEY[INDIGENCY_TEMPLATE_KEY];
}

export function getAllOcrTemplates() {
  return Object.values(TEMPLATES_BY_KEY);
}

export function getTemplateOrDefault(templateKey: string | null | undefined) {
  return getOcrTemplateByKey(templateKey) ?? getDefaultOcrTemplate();
}

export function isTemplateCompatibleWithDocumentType(
  templateKey: string,
  typeLabel: string | null | undefined,
  categoryLabel?: string | null | undefined,
) {
  const template = getOcrTemplateByKey(templateKey);
  if (!template) return false;
  return template.isDocumentType(typeLabel, categoryLabel);
}

export function getTemplateDefaults(templateKey: string | null | undefined) {
  const template = getTemplateOrDefault(templateKey);
  return template.defaultFields.reduce<Record<string, string>>((acc, key) => {
    acc[key] = '';
    return acc;
  }, {});
}

export function getMissingRequiredTemplateFields(templateKey: string | null | undefined, parsedFields: Record<string, string>) {
  const template = getTemplateOrDefault(templateKey);
  return template.getMissingFields(parsedFields);
}

export function resolveTemplateForDocumentType(
  typeLabel: string | null | undefined,
  categoryLabel?: string | null | undefined,
) {
  return getAllOcrTemplates().find((template) => template.isDocumentType(typeLabel, categoryLabel)) ?? null;
}

export function detectTemplateKeyFromText(extractedText: string): string | null {
  if (!extractedText || !extractedText.trim()) return null;
  const lower = extractedText.toLowerCase();

  const scores: Record<string, number> = {
    [INDIGENCY_TEMPLATE_KEY]: 0,
    [BARANGAY_CERTIFICATE_TEMPLATE_KEY]: 0,
    [LUPON_SUMMONS_TEMPLATE_KEY]: 0,
    [BUSINESS_PERMIT_TEMPLATE_KEY]: 0,
    [CONSTRUCTION_PERMIT_TEMPLATE_KEY]: 0,
  };

  // Lupon Summons signals
  if (lower.includes('lupon summons')) scores[LUPON_SUMMONS_TEMPLATE_KEY] += 6;
  if (lower.includes('office of the lupon tagapamayapa') || lower.includes('lupon tagapamayapa')) scores[LUPON_SUMMONS_TEMPLATE_KEY] += 5;
  if (lower.includes('barangay case number') || lower.includes('barangay case no')) scores[LUPON_SUMMONS_TEMPLATE_KEY] += 5;
  if (lower.includes('complainant')) scores[LUPON_SUMMONS_TEMPLATE_KEY] += 3;
  if (lower.includes('respondent')) scores[LUPON_SUMMONS_TEMPLATE_KEY] += 3;
  if (lower.includes('summons to')) scores[LUPON_SUMMONS_TEMPLATE_KEY] += 4;
  if (lower.includes('hearing day') || lower.includes('hearing time')) scores[LUPON_SUMMONS_TEMPLATE_KEY] += 4;
  if (lower.includes('katarungang pambarangay') || lower.includes('kp form')) scores[LUPON_SUMMONS_TEMPLATE_KEY] += 5;

  // Construction Permit signals
  if (lower.includes('construction permit')) scores[CONSTRUCTION_PERMIT_TEMPLATE_KEY] += 6;
  if (lower.includes('construction clearance')) scores[CONSTRUCTION_PERMIT_TEMPLATE_KEY] += 5;
  if (lower.includes('permit selection')) scores[CONSTRUCTION_PERMIT_TEMPLATE_KEY] += 4;
  if (lower.includes('address of owner')) scores[CONSTRUCTION_PERMIT_TEMPLATE_KEY] += 4;
  if (lower.includes("mayor's business permit")) scores[CONSTRUCTION_PERMIT_TEMPLATE_KEY] += 3;
  if (lower.includes('building permit')) scores[CONSTRUCTION_PERMIT_TEMPLATE_KEY] += 3;
  if (lower.includes('occupancy permit')) scores[CONSTRUCTION_PERMIT_TEMPLATE_KEY] += 3;
  if (lower.includes('excavation permit')) scores[CONSTRUCTION_PERMIT_TEMPLATE_KEY] += 3;
  if (lower.includes('demolition permit')) scores[CONSTRUCTION_PERMIT_TEMPLATE_KEY] += 3;
  if (lower.includes('renovation/repair')) scores[CONSTRUCTION_PERMIT_TEMPLATE_KEY] += 3;

  // Business Permit signals
  if (lower.includes('business permit')) scores[BUSINESS_PERMIT_TEMPLATE_KEY] += 6;
  if (lower.includes('business clearance')) scores[BUSINESS_PERMIT_TEMPLATE_KEY] += 5;
  if (lower.includes('name of establishment')) scores[BUSINESS_PERMIT_TEMPLATE_KEY] += 5;
  if (lower.includes('with postal address at')) scores[BUSINESS_PERMIT_TEMPLATE_KEY] += 5;

  // Barangay Certificate signals
  if (lower.includes('barangay certificate')) scores[BARANGAY_CERTIFICATE_TEMPLATE_KEY] += 6;
  if (lower.includes('is a bonafide resident of')) scores[BARANGAY_CERTIFICATE_TEMPLATE_KEY] += 5;
  if (lower.includes('marked reason')) scores[BARANGAY_CERTIFICATE_TEMPLATE_KEY] += 4;
  if (lower.includes('application for employment')) scores[BARANGAY_CERTIFICATE_TEMPLATE_KEY] += 3;
  if (lower.includes('proof of residency')) scores[BARANGAY_CERTIFICATE_TEMPLATE_KEY] += 3;
  if (lower.includes('sj health card')) scores[BARANGAY_CERTIFICATE_TEMPLATE_KEY] += 3;
  if (lower.includes('transfer of residence')) scores[BARANGAY_CERTIFICATE_TEMPLATE_KEY] += 3;
  if (lower.includes('sr citizen id')) scores[BARANGAY_CERTIFICATE_TEMPLATE_KEY] += 3;

  // Certificate of Indigency signals
  if (lower.includes('certificate of indigency') || lower.includes('cert. of indigency')) scores[INDIGENCY_TEMPLATE_KEY] += 6;
  if (lower.includes('whose residence at')) scores[INDIGENCY_TEMPLATE_KEY] += 5;
  if (lower.includes('issued upon the request of')) scores[INDIGENCY_TEMPLATE_KEY] += 5;

  let bestKey: string | null = null;
  let maxScore = 0;
  for (const [key, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestKey = key;
    }
  }

  return maxScore >= 3 ? bestKey : null;
}

export function getOcrTemplateMismatchMessage(
  detectedTemplateLabel: string,
  selectedTemplateLabel: string,
  locale: 'en' | 'fil' = 'en'
): string {
  if (locale === 'fil') {
    return `Mali ang napiling template. Ang na-upload na form ay ${detectedTemplateLabel}, ngunit ${selectedTemplateLabel} ang napiling template. Mangyaring piliin ang tamang template (${detectedTemplateLabel}) sa dropdown o i-upload ang tamang form.`;
  }
  return `Selected template is incorrect. The uploaded form is ${detectedTemplateLabel}, but ${selectedTemplateLabel} was selected. Please select the correct template (${detectedTemplateLabel}) in the dropdown or upload the matching form.`;
}

export function validateOcrTemplateMatch(
  selectedTemplateKey: string,
  extractedText: string,
  locale: 'en' | 'fil' = 'en'
) {
  const detectedTemplateKey = detectTemplateKeyFromText(extractedText);
  const selectedTemplate = getOcrTemplateByKey(selectedTemplateKey);

  const detectedCategory = detectedTemplateKey ? getCategoryForDocType(detectedTemplateKey) : null;
  const selectedCategory = getCategoryForDocType(selectedTemplateKey);

  const isDirectMatch =
    detectedTemplateKey === selectedTemplateKey ||
    (Boolean(selectedTemplate) && detectedTemplateKey === selectedTemplate?.key);

  const isCategoryMatch = Boolean(
    detectedCategory &&
    selectedCategory &&
    detectedCategory === selectedCategory
  );

  const isMatch = !detectedTemplateKey || isDirectMatch || isCategoryMatch;

  const detectedTemplate = detectedTemplateKey ? getTemplateOrDefault(detectedTemplateKey) : null;
  const detectedLabel = detectedTemplate?.documentLabel ?? 'Uploaded Document';

  const isOfficialCategory = OFFICIAL_DOCUMENT_CATEGORIES.some((c) => c.id === selectedTemplateKey);
  const selectedLabel = isOfficialCategory
    ? getCategoryLabel(selectedTemplateKey)
    : selectedTemplate?.documentLabel ?? getCategoryLabel(selectedCategory);

  if (!isMatch) {
    const errorMessage = getOcrTemplateMismatchMessage(
      detectedLabel,
      selectedLabel,
      locale
    );
    return {
      isMatch: false,
      detectedTemplateKey,
      detectedTemplateLabel: detectedLabel,
      selectedTemplateLabel: selectedLabel,
      errorMessage,
      errorMessageEn: getOcrTemplateMismatchMessage(detectedLabel, selectedLabel, 'en'),
      errorMessageFil: getOcrTemplateMismatchMessage(detectedLabel, selectedLabel, 'fil'),
    };
  }

  return {
    isMatch: true,
    detectedTemplateKey,
    detectedTemplateLabel: detectedLabel,
    selectedTemplateLabel: selectedLabel,
  };
}

export const INDIGENCY_INTAKE_FIELDS_EXPORT = INDIGENCY_FIELDS_BASE;
export const INDIGENCY_TEMPLATE_DEFAULT_FIELDS = toDefaultFields(INDIGENCY_FIELDS_BASE);
export const INDIGENCY_REQUIRED_FIELDS = toRequiredFields(INDIGENCY_FIELDS_BASE);
export const INDIGENCY_LABEL_BY_KEY = toLabels(INDIGENCY_FIELDS_BASE);
export const INDIGENCY_TEMPLATE_PLACEHOLDER_BODY = `CERTIFICATE OF INDIGENCY

This certifies that {{residentName}}, residing at {{address}}, is known to be an indigent resident of this barangay.

This certification is issued upon the request of {{requestedBy}} for whatever legal purpose it may serve him/her.

Issued this {{issuedDay}} day of {{issuedMonth}}, {{issuedYear}}.

Authorized by: {{authorizedBy}}`;

export { isIndigencyAssistanceType };
export const INDIGENCY_INTAKE_FIELDS = INDIGENCY_INTAKE_FIELDS_EXPORT;
