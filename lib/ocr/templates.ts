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
  { key: 'residentName', label: 'This is to certify that', required: true },
  { key: 'residentAddressLine', label: 'is a bonafide resident of', required: true },
  { key: 'reasonEmployment', label: 'Application for Employment', required: false },
  { key: 'reasonResidency', label: 'Proof of Residency', required: false },
  { key: 'reasonMedicalAssistance', label: 'Medical Assistance', required: false },
  { key: 'reasonSjHealthCard', label: 'SJ Health Card', required: false },
  { key: 'reasonTransferResidence', label: 'Transfer of Residence', required: false },
  { key: 'reasonPostalId', label: 'Postal ID', required: false },
  { key: 'reasonSchoolReference', label: 'School Reference', required: false },
  { key: 'reasonBurialAssistance', label: 'Burial Assistance', required: false },
  { key: 'reasonSssGsisPhilhealth', label: 'SSS/GSIS/PHILHEALTH', required: false },
  { key: 'reasonFinancialAssistance', label: 'Financial Assistance', required: false },
  { key: 'reasonSrCitizenId', label: 'SR Citizen ID', required: false },
  { key: 'reasonNonResident', label: 'Non-Resident', required: false },
  { key: 'otherReasonText', label: 'Other: Please Specify', required: false },
  { key: 'issuedDate', label: 'Given this (YYYY-MM-DD)', required: true },
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
  'reasonEmployment',
  'reasonResidency',
  'reasonMedicalAssistance',
  'reasonSjHealthCard',
  'reasonTransferResidence',
  'reasonPostalId',
  'reasonSchoolReference',
  'reasonBurialAssistance',
  'reasonSssGsisPhilhealth',
  'reasonFinancialAssistance',
  'reasonSrCitizenId',
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
      return !((parsedFields.address ?? parsedFields.residenceAddress ?? '').trim());
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
  if (!(parsedFields.residentAddressLine ?? '').trim()) missing.push('residentAddressLine');
  const hasMarkedReason = BARANGAY_REASON_KEYS.some((key) => hasReasonMark(parsedFields[key]));
  if (!hasMarkedReason && !(parsedFields.otherReasonText ?? '').trim()) {
    missing.push('reasonSelection');
  }
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

function isIndigencyAssistanceType(typeLabel: string | null | undefined): boolean {
  if (!typeLabel) return false;
  const value = typeLabel.toLowerCase();
  return value.includes('indigency') && value.includes('assistance');
}

function isBarangayCertificateType(typeLabel: string | null | undefined): boolean {
  if (!typeLabel) return false;
  const value = typeLabel.toLowerCase();
  return value.includes('barangay') && value.includes('certificate');
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

export function getOcrTemplateByKey(templateKey: string | null | undefined) {
  if (!templateKey) return null;
  return TEMPLATES_BY_KEY[templateKey] ?? null;
}

export function getDefaultOcrTemplate() {
  return TEMPLATES_BY_KEY[INDIGENCY_TEMPLATE_KEY];
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
  const selectedTemplate = getTemplateOrDefault(selectedTemplateKey);

  if (detectedTemplateKey && detectedTemplateKey !== selectedTemplate.key) {
    const detectedTemplate = getTemplateOrDefault(detectedTemplateKey);
    const errorMessage = getOcrTemplateMismatchMessage(
      detectedTemplate.documentLabel,
      selectedTemplate.documentLabel,
      locale
    );
    return {
      isMatch: false,
      detectedTemplateKey,
      detectedTemplateLabel: detectedTemplate.documentLabel,
      selectedTemplateLabel: selectedTemplate.documentLabel,
      errorMessage,
      errorMessageEn: getOcrTemplateMismatchMessage(detectedTemplate.documentLabel, selectedTemplate.documentLabel, 'en'),
      errorMessageFil: getOcrTemplateMismatchMessage(detectedTemplate.documentLabel, selectedTemplate.documentLabel, 'fil'),
    };
  }

  return {
    isMatch: true,
    detectedTemplateKey,
    detectedTemplateLabel: detectedTemplateKey ? getTemplateOrDefault(detectedTemplateKey).documentLabel : null,
    selectedTemplateLabel: selectedTemplate.documentLabel,
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
