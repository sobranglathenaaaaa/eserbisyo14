import {
  DEFAULT_OFFICIAL_TEMPLATES,
  OFFICIAL_WORD_TEMPLATES,
  getCategoryForDocType,
} from '@/lib/documents/document-catalog-constants';
import { getBarangayOfficialSettings } from '@/lib/documents/barangay-settings';
import type { DocumentTemplate } from '@/lib/types/models';

export const OFFICIAL_KAGAWADS = [
  { id: '1', name: 'HON. GODOFREDO M. DE VERA', committee: 'Committee on Peace and Order / Public Safety' },
  { id: '2', name: 'HON. ANACLETO M. DELA CRUZ', committee: 'Committee on Infrastructure / Public Works' },
  { id: '3', name: 'HON. JERRY C. CASANOVA', committee: 'Committee on Health and Sanitation' },
  { id: '4', name: 'HON. JOSEFINA D. ROQUE', committee: 'Committee on Women, Family and Social Services' },
  { id: '5', name: 'HON. ROLANDO M. CRUZ', committee: 'Committee on Education and Culture' },
  { id: '6', name: 'HON. MARCELO R. SANTOS', committee: 'Committee on Ways and Means / Finance' },
  { id: '7', name: 'HON. ERNESTO P. ANGELES', committee: 'Committee on Clean and Green / Environment' },
  { id: '8', name: 'HON. JOSHUA C. VERGARA', committee: 'SK Chairperson / Youth and Sports Development' },
];

export function stripPriceFromPurpose(purpose: string): string {
  if (!purpose) return '';
  return purpose
    .replace(/\s*\([₱P][\d,.]+(?:\s*-\s*[₱P]?[\d,.]+)?(?:\/[a-zA-Z]+)?\)/gi, '')
    .replace(/\s*\(\s*(?:Free|Libre|No\s*fee)[^\)]*\)/gi, '')
    .replace(/\s*-\s*[₱P][\d,.]+/gi, '')
    .trim();
}

export function resolvePurposeFromReasons(fields: Record<string, string>): string {
  if (fields.purpose?.trim()) return stripPriceFromPurpose(fields.purpose.trim());
  if (fields.reason?.trim()) return stripPriceFromPurpose(fields.reason.trim());
  if (fields.reasonText?.trim()) return stripPriceFromPurpose(fields.reasonText.trim());
  if (fields.otherReasonText?.trim()) return stripPriceFromPurpose(fields.otherReasonText.trim());

  const checkedReasons: string[] = [];
  const REASON_MAP: Record<string, string> = {
    reasonGeneralCert: 'Barangay Certification (General)',
    reasonIndigency: 'Certificate of Indigency (Financial / Medical Assistance)',
    reasonResidency: 'Proof of Residency',
    reasonGoodMoral: 'Certificate of Good Moral Character',
    reasonEmployment: 'Application for Employment',
    reasonSchoolReference: 'School Requirement / Scholarship',
    reasonSrCitizenId: 'PWD / Senior Citizen Application',
    reasonSjHealthCard: 'SJ Health Card / Medical Clearance',
    reasonPoliceNbi: 'Police / NBI / Court Clearance',
    reasonPostalId: 'Postal ID / Passport / Visa Application',
    reasonBurialAssistance: 'Burial Assistance',
    reasonSssGsisPhilhealth: 'SSS / GSIS / PhilHealth Requirement',
    reasonFinancialAssistance: 'Financial Assistance',
    reasonMedicalAssistance: 'Medical Assistance',
    reasonTransferResidence: 'Transfer of Residence',
    reasonNoOperation: 'Certificate of No Operation',
    reasonNonResident: 'Non-Resident Certification',
  };

  for (const [key, label] of Object.entries(REASON_MAP)) {
    const val = (fields[key] ?? '').toLowerCase();
    if (val && !['0', 'false', 'no', 'none', 'n/a'].includes(val)) {
      checkedReasons.push(label);
    }
  }

  if (checkedReasons.length > 0) {
    return stripPriceFromPurpose(checkedReasons.join(', '));
  }

  return 'For whatever legal purpose it may serve';
}

// Category & Layout-Aware Default HTML Builder (100% Identical to Admin Document Templates)
export function buildDefaultHtmlLayout(
  docTypeKey: string,
  sealAlignment: 'side_by_side' | 'centered' | 'stacked' = 'centered',
  layoutStyle: 'single_column' | 'two_column_sidebar' = 'two_column_sidebar',
  sideColumnVerticalSpacing: 'compact' | 'standard' | 'spacious' = 'standard'
): string {
  const normalizedDocTypeKey = docTypeKey.toLowerCase();
  const isBusinessRenewal =
    normalizedDocTypeKey.includes('renewal') || normalizedDocTypeKey.includes('renew');
  const isMicroSmallBusiness =
    normalizedDocTypeKey.includes('micro') ||
    normalizedDocTypeKey.includes('small enterprise') ||
    normalizedDocTypeKey.includes('small business');
  const isMediumBusiness = normalizedDocTypeKey.includes('medium');
  const isLargeBusiness =
    normalizedDocTypeKey.includes('large') || normalizedDocTypeKey.includes('corporat');

  const barangayLogoHtml = `{{barangay_seal}}`;
  const cityLogoHtml = `{{city_seal}}`;
  const countryLogoHtml = `{{country_seal}}`;

  let headerHtml = '';

  if (sealAlignment === 'side_by_side') {
    headerHtml = `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
  <div style="width:65px;text-align:center;">${barangayLogoHtml}</div>
  <div style="text-align:center;flex:1;padding:0 8px;">
    <p style="font-family:Georgia,serif;font-size:13px;font-weight:bold;font-style:italic;text-transform:uppercase;color:#4f6e34;margin:0;letter-spacing:0.5px;">REPUBLIC OF THE PHILIPPINES</p>
    <p style="font-family:Georgia,serif;font-size:12px;font-style:italic;color:#4f6e34;margin:1px 0;">{{city}}</p>
    <p style="font-family:Georgia,serif;font-size:14px;font-weight:bold;font-style:italic;text-transform:uppercase;color:#4f6e34;margin:0;">{{barangay_name}}</p>
    <p style="font-family:Georgia,serif;font-size:11px;font-weight:bold;font-style:italic;text-transform:uppercase;color:#4f6e34;margin:2px 0 0 0;">OFFICE OF THE PUNONG BARANGAY</p>
  </div>
  <div style="width:65px;text-align:center;">${cityLogoHtml}</div>
</div>
`;
  } else if (sealAlignment === 'stacked') {
    headerHtml = `
<div style="text-align:center;margin-bottom:8px;">
  <div style="margin-bottom:4px;">${countryLogoHtml}</div>
  <p style="font-family:Georgia,serif;font-size:13px;font-weight:bold;font-style:italic;text-transform:uppercase;color:#4f6e34;margin:0;letter-spacing:0.5px;">REPUBLIC OF THE PHILIPPINES</p>
  <p style="font-family:Georgia,serif;font-size:12px;font-style:italic;color:#4f6e34;margin:1px 0;">{{city}}</p>
  <p style="font-family:Georgia,serif;font-size:14px;font-weight:bold;font-style:italic;text-transform:uppercase;color:#4f6e34;margin:0;">{{barangay_name}}</p>
  <p style="font-family:Georgia,serif;font-size:11px;font-weight:bold;font-style:italic;text-transform:uppercase;color:#4f6e34;margin:2px 0 0 0;">OFFICE OF THE PUNONG BARANGAY</p>
  <div style="display:flex;align-items:center;justify-content:center;gap:18px;margin-top:4px;">
    ${barangayLogoHtml}
    ${cityLogoHtml}
  </div>
</div>
`;
  } else {
    // Centered Row (Default Top Row of 3 Seals matching Barangay Progreso 1:1)
    headerHtml = `
<div style="text-align:center;margin-bottom:8px;">
  <div style="display:flex;align-items:center;justify-content:center;gap:18px;margin-bottom:6px;">
    ${barangayLogoHtml}
    ${cityLogoHtml}
    ${countryLogoHtml}
  </div>
  <p style="font-family:Georgia,serif;font-size:13px;font-weight:bold;font-style:italic;text-transform:uppercase;color:#4f6e34;margin:0;letter-spacing:0.5px;">REPUBLIC OF THE PHILIPPINES</p>
  <p style="font-family:Georgia,serif;font-size:12px;font-style:italic;color:#4f6e34;margin:1px 0;">{{city}}</p>
  <p style="font-family:Georgia,serif;font-size:14px;font-weight:bold;font-style:italic;text-transform:uppercase;color:#4f6e34;margin:0;">{{barangay_name}}</p>
  <p style="font-family:Georgia,serif;font-size:11px;font-weight:bold;font-style:italic;text-transform:uppercase;color:#4f6e34;margin:2px 0 0 0;">OFFICE OF THE PUNONG BARANGAY</p>
</div>
`;
  }

  let docTitleUpper = 'BARANGAY CLEARANCE';
  let bodyWordingHtml = '';
  const businessClassification = isBusinessRenewal
    ? 'BUSINESS CLEARANCE RENEWAL - EXISTING ENTERPRISE'
    : isLargeBusiness
    ? 'LARGE ENTERPRISE / CORPORATE BUSINESS'
    : isMediumBusiness
    ? 'MEDIUM ENTERPRISE BUSINESS'
    : isMicroSmallBusiness
    ? 'MICRO / SMALL ENTERPRISE BUSINESS'
    : 'BUSINESS ENTERPRISE';
  const businessPurpose = isBusinessRenewal
    ? 'the annual renewal of the existing business clearance'
    : isLargeBusiness
    ? 'the operation of a large enterprise or corporate business'
    : isMediumBusiness
    ? 'the operation of a medium enterprise business'
    : isMicroSmallBusiness
    ? 'the operation of a micro or small enterprise owned or operated by a resident'
    : 'the operation of the business described below';

  switch (true) {
    case normalizedDocTypeKey.includes('school_req') || normalizedDocTypeKey.includes('school'):
      docTitleUpper = 'BARANGAY CERTIFICATION';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">{{resident_name}}</u>, of legal age, Filipino, whose residence is at <u style="font-weight:bold;">{{resident_address}}</u>, is a bona fide resident of {{barangay_name}}, {{city}}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  Based on records and verification, the above-named individual is a law-abiding citizen with good moral standing in this community.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This certification is issued upon the request of <u style="font-weight:bold;">{{resident_name}}</u> for <u style="font-weight:bold;">{{purpose}}</u>.
</p>
<p style="font-size:14.5px;margin-top:26px;margin-bottom:32px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
</p>
`;
      break;

    case normalizedDocTypeKey.includes('indigency'):
      docTitleUpper = 'CERTIFICATE OF INDIGENCY';
      bodyWordingHtml = `
<p style="font-size:15px;line-height:2.1;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">{{resident_name}}</u> whose residence at <u style="font-weight:bold;">{{resident_address}}</u> is within the jurisdiction of {{barangay_name}}, {{city}} and belongs to the indigent families of this barangay. The barangay also certifies that their daily income is barely enough to meet their day-to-day needs.
</p>
<p style="font-size:15px;line-height:2.1;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This certification is being issued upon the request of Mr./Mrs./Ms. <u style="font-weight:bold;">{{resident_name}}</u> for <u style="font-weight:bold;">{{purpose}}</u>.
</p>
<p style="font-size:15px;margin-top:26px;margin-bottom:32px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
</p>
`;
      break;

    case normalizedDocTypeKey.includes('pwd_senior') || normalizedDocTypeKey.includes('senior') || normalizedDocTypeKey.includes('pwd'):
      docTitleUpper = 'BARANGAY CERTIFICATION';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">{{resident_name}}</u>, whose residence at <u style="font-weight:bold;">{{resident_address}}</u>, is a bona fide and verified resident of {{barangay_name}}, {{city}}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This office further certifies that the subject individual is eligible for registration and issuance of privileges under Republic Act No. 7277 / Republic Act No. 9994.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  Issued upon request of <u style="font-weight:bold;">{{resident_name}}</u> for <u style="font-weight:bold;">{{purpose}}</u>.
</p>
<p style="font-size:14.5px;margin-top:26px;margin-bottom:32px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
</p>
`;
      break;

    case normalizedDocTypeKey.includes('health_card') || normalizedDocTypeKey.includes('health'):
      docTitleUpper = 'BARANGAY CERTIFICATION';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">{{resident_name}}</u> residing at <u style="font-weight:bold;">{{resident_address}}</u> is a bona fide resident of {{barangay_name}}, {{city}}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  He/She has undergone residency verification and has no derogatory record on file with this office.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This certification is issued upon the request of <u style="font-weight:bold;">{{resident_name}}</u> for <u style="font-weight:bold;">{{purpose}}</u>.
</p>
<p style="font-size:14.5px;margin-top:26px;margin-bottom:32px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
</p>
`;
      break;

    case normalizedDocTypeKey.includes('death_cert') || normalizedDocTypeKey.includes('death'):
      docTitleUpper = 'BARANGAY DEATH CERTIFICATION';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This is to certify that the late <u style="font-weight:bold;">{{resident_name}}</u>, during his/her lifetime, was a permanent resident of <u style="font-weight:bold;">{{resident_address}}</u> within {{barangay_name}}, {{city}}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This further certifies that the subject individual passed away on <u style="font-weight:bold;">{{date_issued}}</u>.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This certification is being issued upon the request of his/her next-of-kin for <u style="font-weight:bold;">{{purpose}}</u>.
</p>
<p style="font-size:14.5px;margin-top:26px;margin-bottom:32px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
</p>
`;
      break;

    case normalizedDocTypeKey.includes('employment'):
      docTitleUpper = 'BARANGAY CERTIFICATION';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">{{resident_name}}</u> whose residence at <u style="font-weight:bold;">{{resident_address}}</u> is within the jurisdiction of {{barangay_name}}, {{city}}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  RECORD CHECK IN THIS OFFICE SHOWS THAT THE ABOVE-NAMED INDIVIDUAL HAS NO DEROGATORY AND/OR PENDING CRIMINAL RECORD FILED AGAINST HIM/HER AS OF THIS DATE.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This certification is being issued upon the request of <u style="font-weight:bold;">{{resident_name}}</u> for <u style="font-weight:bold;">{{purpose}}</u>.
</p>
<p style="font-size:14.5px;margin-top:26px;margin-bottom:32px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
</p>
`;
      break;

    case normalizedDocTypeKey.includes('police_nbi') || normalizedDocTypeKey.includes('court'):
      docTitleUpper = 'BARANGAY CLEARANCE';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">{{resident_name}}</u> whose residence is at <u style="font-weight:bold;">{{resident_address}}</u> is a bona fide resident of {{barangay_name}}, {{city}}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  RECORD CHECK SHOWS THAT HE/SHE HAS NO DEROGATORY RECORD ON FILE AS OF THIS DATE AND IS A LAW-ABIDING CITIZEN.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  Issued upon the request of <u style="font-weight:bold;">{{resident_name}}</u> for <u style="font-weight:bold;">{{purpose}}</u>.
</p>
<p style="font-size:14.5px;margin-top:26px;margin-bottom:32px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
</p>
`;
      break;

    case normalizedDocTypeKey.includes('passport_visa') || normalizedDocTypeKey.includes('passport') || normalizedDocTypeKey.includes('postal'):
      docTitleUpper = 'BARANGAY CERTIFICATION';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">{{resident_name}}</u> residing at <u style="font-weight:bold;">{{resident_address}}</u> is a bona fide resident of {{barangay_name}}, {{city}}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  The undersigned officials attest that the bearer is a person of good moral character and has no derogatory record on file.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  Issued upon request for <u style="font-weight:bold;">{{purpose}}</u>.
</p>
<p style="font-size:14.5px;margin-top:26px;margin-bottom:32px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
</p>
`;
      break;

    case normalizedDocTypeKey.includes('overseas_visa') || normalizedDocTypeKey.includes('overseas') || normalizedDocTypeKey.includes('visa'):
      docTitleUpper = 'BARANGAY CERTIFICATION';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">{{resident_name}}</u> residing at <u style="font-weight:bold;">{{resident_address}}</u> is a bona fide resident of {{barangay_name}}, {{city}}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  He/She is verified to have no derogatory record in this barangay and is of good moral standing.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  Issued upon request for <u style="font-weight:bold;">{{purpose}}</u>.
</p>
<p style="font-size:14.5px;margin-top:26px;margin-bottom:32px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
</p>
`;
      break;

    case normalizedDocTypeKey.includes('no_operation'):
      docTitleUpper = 'CERTIFICATE OF NO OPERATION';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This is to certify that according to the records and ocular inspection conducted by this office, the business entity registered under the name of <u style="font-weight:bold;">{{resident_name}}</u> with business address located at <u style="font-weight:bold;">{{resident_address}}</u>, {{barangay_name}}, {{city}}, is <u style="font-weight:bold;">NOT IN OPERATION / HAS CEASED OPERATIONS</u>.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This certification is being issued upon request for <u style="font-weight:bold;">{{purpose}}</u>.
</p>
<p style="font-size:14.5px;margin-top:26px;margin-bottom:32px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
</p>
`;
      break;

    case normalizedDocTypeKey.includes('transient') || normalizedDocTypeKey.includes('kasambahay') || normalizedDocTypeKey.includes('worker'):
      docTitleUpper = 'TRANSIENT WORKER CERTIFICATION';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">{{resident_name}}</u> is an authorized transient employee / worker residing/stationed at <u style="font-weight:bold;">{{resident_address}}</u> within the jurisdiction of {{barangay_name}}, {{city}}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  RECORD CHECK IN THIS OFFICE SHOWS THAT THE ABOVE-NAMED INDIVIDUAL HAS NO DEROGATORY RECORD IN THIS BARANGAY AS OF THIS DATE.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This certification is issued upon the request of <u style="font-weight:bold;">{{resident_name}}</u> for <u style="font-weight:bold;">{{purpose}}</u>.
</p>
<p style="font-size:14.5px;margin-top:26px;margin-bottom:32px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
</p>
`;
      break;

    case normalizedDocTypeKey.includes('business'):
      docTitleUpper = 'BARANGAY BUSINESS CLEARANCE';
      bodyWordingHtml = `
<div style="font-size:14.5px;line-height:2.1;color:#000;">
  <p style="text-align:center;font-size:13px;font-weight:bold;letter-spacing:0.6px;margin:0 0 16px 0;">
    ${businessClassification}
  </p>
  <div style="text-align:center;margin:12px 0 24px 0;line-height:1.9;">
    <p style="font-size:16px;font-weight:bold;margin:0 0 2px 0;">
      <u style="display:inline-block;min-width:320px;text-align:center;">{{purpose}}</u>
    </p>
    <div style="font-size:12px;font-style:italic;margin-bottom:14px;color:#333;">Name of Establishment</div>

    <div style="font-size:14px;font-style:italic;margin-bottom:14px;">is issued to</div>

    <p style="font-size:16px;font-weight:bold;margin:0 0 2px 0;">
      <u style="display:inline-block;min-width:320px;text-align:center;">{{resident_name}}</u>
    </p>
    <div style="font-size:12px;font-style:italic;margin-bottom:14px;color:#333;">Name of Owner</div>

    <div style="font-size:14px;font-style:italic;margin-bottom:8px;">With postal address at</div>

    <p style="font-size:15px;font-weight:bold;margin:0 0 2px 0;">
      <u style="display:inline-block;min-width:340px;text-align:center;">{{resident_address}}, {{city}}</u>
    </p>
    <div style="font-size:12px;font-style:italic;color:#333;">Postal Address</div>
  </div>

  <p style="text-indent:42px;margin-bottom:24px;line-height:2.1;text-align:justify;">
    This clearance specifically covers ${businessPurpose}.
  </p>
  <p style="text-indent:42px;margin-bottom:24px;line-height:2.1;text-align:justify;">
    This clearance is issued upon the request of the aforementioned name, provided that no law, city ordinance, or resolution shall be violated during the operation.
  </p>
  <p style="margin-top:24px;margin-bottom:32px;text-align:justify;">
    Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
  </p>
</div>
`;
      break;

    case normalizedDocTypeKey.includes('construction') ||
      normalizedDocTypeKey.includes('occupancy') ||
      normalizedDocTypeKey.includes('renovation') ||
      normalizedDocTypeKey.includes('expansion') ||
      normalizedDocTypeKey.includes('fencing') ||
      normalizedDocTypeKey.includes('utilities') ||
      normalizedDocTypeKey.includes('excavation') ||
      normalizedDocTypeKey.includes('demolition'):
      docTitleUpper = 'BARANGAY CLEARANCE';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.0;margin-bottom:14px;text-align:justify;color:#000;">
  This is to certify that the Sangguniang Barangay of Progreso, {{city}} interposes no objection to the issuance of:
</p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;margin-bottom:18px;font-size:13px;padding:8px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;">
  <div><span style="font-weight:bold;display:inline-block;width:24px;border-bottom:1px solid #000;text-align:center;">&nbsp;</span> Mayor's Business Permit</div>
  <div><span style="font-weight:bold;display:inline-block;width:24px;border-bottom:1px solid #000;text-align:center;">&nbsp;</span> Building Permit</div>
  <div><span style="font-weight:bold;display:inline-block;width:24px;border-bottom:1px solid #000;text-align:center;">&nbsp;</span> Occupancy Permit</div>
  <div><span style="font-weight:bold;display:inline-block;width:24px;border-bottom:1px solid #000;text-align:center;">&nbsp;</span> Excavation Permit</div>
  <div><span style="font-weight:bold;display:inline-block;width:24px;border-bottom:1px solid #000;text-align:center;">&nbsp;</span> Demolition Permit</div>
  <div><span style="font-weight:bold;display:inline-block;width:24px;border-bottom:1px solid #000;text-align:center;">&nbsp;</span> Renovation / Repair Permit</div>
  <div><span style="font-weight:bold;display:inline-block;width:24px;border-bottom:1px solid #000;text-align:center;">✓</span> Construction Permit</div>
  <div><span style="font-weight:bold;display:inline-block;width:24px;border-bottom:1px solid #000;text-align:center;">&nbsp;</span> Hauling Permit</div>
  <div><span style="font-weight:bold;display:inline-block;width:24px;border-bottom:1px solid #000;text-align:center;">&nbsp;</span> Signage / Billboards Permit</div>
  <div><span style="font-weight:bold;display:inline-block;width:24px;border-bottom:1px solid #000;text-align:center;">&nbsp;</span> Others (Asphalt Overlay)</div>
</div>
<p style="font-size:14px;font-weight:bold;margin-bottom:6px;">IN FAVOR OF:</p>
<p style="font-size:14px;margin-bottom:4px;margin-left:20px;">Name of Owner: <u style="font-weight:bold;">{{resident_name}}</u></p>
<p style="font-size:14px;margin-bottom:4px;margin-left:20px;">Address of Owner: <u style="font-weight:bold;">{{resident_address}}</u></p>
<p style="font-size:14px;margin-bottom:16px;margin-left:20px;">Location of Project / Activity: <u style="font-weight:bold;">{{add_where}}</u></p>
<p style="font-size:14px;line-height:2.0;text-indent:42px;margin-bottom:20px;text-align:justify;color:#000;">
  This Certification is being issued upon the request of the above-named applicant for the aforementioned purpose (<u style="font-weight:bold;">{{purpose}}</u>).
</p>
<p style="font-size:14px;margin-top:20px;margin-bottom:28px;color:#000;">
  Given this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}, Metro Manila.
</p>
`;
      break;

    case normalizedDocTypeKey.includes('delivery') ||
      normalizedDocTypeKey.includes('hauling') ||
      normalizedDocTypeKey.includes('mixer') ||
      normalizedDocTypeKey.includes('debris') ||
      normalizedDocTypeKey.includes('sand_gravel') ||
      normalizedDocTypeKey.includes('heavy_equipment'):
      docTitleUpper = 'DELIVERY & HAULING CLEARANCE';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  Barangay clearance is hereby granted to <u style="font-weight:bold;">{{resident_name}}</u> (residing at {{resident_address}}) for delivery / hauling operations at <u style="font-weight:bold;">{{add_where}}</u>, {{barangay_name}}, {{city}}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This clearance covers hauling/transportation of materials/equipment as specified: <u style="font-weight:bold;">{{purpose}}</u>.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  Subject to strict adherence to barangay traffic, road safety, and waste disposal guidelines.
</p>
<p style="font-size:14.5px;margin-top:26px;margin-bottom:32px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
</p>
`;
      break;

    case normalizedDocTypeKey.includes('special') ||
      normalizedDocTypeKey.includes('shooting') ||
      normalizedDocTypeKey.includes('cables') ||
      normalizedDocTypeKey.includes('flyers'):
      docTitleUpper = 'SPECIAL & COMMERCIAL PERMIT';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  Special barangay clearance/permit is hereby granted to <u style="font-weight:bold;">{{resident_name}}</u> (residing at {{resident_address}}) for activity/operations at <u style="font-weight:bold;">{{add_where}}</u>, {{barangay_name}}, {{city}}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This permit is valid for the specific purpose of: <u style="font-weight:bold;">{{purpose}}</u>.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  Subject to compliance with public safety, noise regulations, and existing barangay ordinances.
</p>
<p style="font-size:14.5px;margin-top:26px;margin-bottom:32px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
</p>
`;
      break;

    case normalizedDocTypeKey.includes('residency'):
      docTitleUpper = 'CERTIFICATE OF RESIDENCY';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">{{resident_name}}</u> whose residence at <u style="font-weight:bold;">{{resident_address}}</u> is a verified permanent resident of {{barangay_name}}, {{city}}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  The barangay also certifies that he/she is a law-abiding citizen of good standing in this community.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This certification is being issued upon the request of <u style="font-weight:bold;">{{resident_name}}</u> for <u style="font-weight:bold;">{{purpose}}</u>.
</p>
<p style="font-size:14.5px;margin-top:26px;margin-bottom:32px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
</p>
`;
      break;

    case normalizedDocTypeKey.includes('good_moral'):
      docTitleUpper = 'CERTIFICATE OF GOOD MORAL CHARACTER';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">{{resident_name}}</u> residing at <u style="font-weight:bold;">{{resident_address}}</u> is personally known to the undersigned officials as a person of good moral character.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  He/She has no record of involvement in any unlawful activities in this barangay.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This certification is being issued upon request for <u style="font-weight:bold;">{{purpose}}</u>.
</p>
<p style="font-size:14.5px;margin-top:26px;margin-bottom:32px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
</p>
`;
      break;

    default:
      docTitleUpper = 'BARANGAY CLEARANCE';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">{{resident_name}}</u> whose residence at <u style="font-weight:bold;">{{resident_address}}</u> is within the jurisdiction of {{barangay_name}}, {{city}}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  RECORD CHECK IN THIS OFFICE SHOWS THAT THE ABOVE-NAMED INDIVIDUAL HAS NO DEROGATORY AND/OR PENDING CRIMINAL RECORD FILED AGAINST HIM/HER AS OF THIS DATE.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This certification is being issued upon the request of <u style="font-weight:bold;">{{resident_name}}</u> for <u style="font-weight:bold;">{{purpose}}</u>.
</p>
<p style="font-size:14.5px;margin-top:26px;margin-bottom:32px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
</p>
`;
      break;
  }

  // LUPON NG MGA TAGAPAMAYAPA (PATAWAG, HEARING NOTICE, CFA) DEDICATED FULL-PAGE STRUCTURE
  if (
    docTypeKey.includes('lupon') ||
    docTypeKey.includes('summons') ||
    docTypeKey.includes('patawag') ||
    docTypeKey.includes('cfa') ||
    docTypeKey.includes('hearing') ||
    docTypeKey.includes('notice')
  ) {
    const isCfa = docTypeKey.includes('cfa') || docTypeKey.includes('file_action');
    const isNotice = !isCfa && (docTypeKey.includes('notice') || docTypeKey.includes('reconciliation') || docTypeKey.includes('hearing'));

    let luponTitle = '= S U M M O N S =';
    let luponSubtitle = '(KP FORM #9 - PATAWAG)';
    if (isCfa) {
      luponTitle = 'CERTIFICATE TO FILE ACTION';
      luponSubtitle = '(KP FORM #20 - KATIBAYAN UPANG MAKADULOG SA HUKUMAN)';
    } else if (isNotice) {
      luponTitle = 'NOTICE OF HEARING / RECONCILIATION NOTICE';
      luponSubtitle = '(KP FORM #8 - ABISO NG PAGDINIG)';
    }

    let luponBody = '';
    if (isCfa) {
      luponBody = `
    <!-- CFA BODY -->
    <div style="font-size:15px;line-height:2.1;margin:18px 0 24px 0;text-align:justify;color:#000;">
      <p style="font-weight:bold;margin-bottom:14px;">This is to certify that:</p>
      <ol style="margin:0 0 20px 28px;padding:0;line-height:2.2;">
        <li style="margin-bottom:10px;">There has been a personal confrontation between the parties before the Punong Barangay / Lupon Tagapamayapa;</li>
        <li style="margin-bottom:10px;">A mediation/conciliation was attempted in good faith, but <strong>NO SETTLEMENT / CONCILIATION</strong> was reached;</li>
        <li style="margin-bottom:10px;">Therefore, the corresponding complaint for the dispute may now be formally filed in Court (MTC/RTC) or Prosecutor's Office.</li>
      </ol>
      <p style="margin-top:20px;">
        Issued this <span style="display:inline-block;border-bottom:1px solid #000;min-width:180px;text-align:center;font-weight:bold;padding:0 6px;">{{date_issued}}</span> at {{barangay_name}}, {{city}}.
      </p>
    </div>`;
    } else if (isNotice) {
      luponBody = `
    <!-- TO PARTIES -->
    <div style="margin-bottom:16px;font-size:15px;line-height:1.5;">
      <strong>TO:</strong> <span style="display:inline-block;border-bottom:1px solid #000;min-width:320px;text-align:center;font-weight:bold;padding:0 8px;">{{complainant_name}} & {{resident_name}}</span>
      <div style="margin-left:36px;font-size:13px;color:#333;font-weight:500;">(Complainant/s and Respondent/s)</div>
    </div>

    <!-- NOTICE BODY -->
    <p style="font-size:15px;line-height:2.0;text-indent:42px;margin-bottom:18px;text-align:justify;color:#000;">
      You are hereby required to appear before the undersigned at the Barangay Hall on <span style="display:inline-block;border-bottom:1px solid #000;min-width:180px;text-align:center;font-weight:bold;padding:0 6px;">{{hearing_date_time}}</span> for a conciliation and mediation hearing of the above-entitled case.
    </p>
    <p style="font-size:15px;line-height:2.0;text-indent:42px;margin-bottom:18px;text-align:justify;color:#000;">
      Please be present promptly on the scheduled date and time with all your relevant supporting records, agreements, or witnesses.
    </p>
    <p style="font-size:15px;margin-top:22px;margin-bottom:32px;color:#000;">
      Issued this <span style="display:inline-block;border-bottom:1px solid #000;min-width:180px;text-align:center;font-weight:bold;padding:0 6px;">{{date_issued}}</span> at {{barangay_name}}, {{city}}.
    </p>`;
    } else {
      luponBody = `
    <!-- TO RESPONDENT -->
    <div style="margin-bottom:16px;font-size:15px;line-height:1.5;">
      <strong>TO:</strong> <span style="display:inline-block;border-bottom:1px solid #000;min-width:240px;text-align:center;font-weight:bold;padding:0 8px;">{{resident_name}}</span>
      <div style="margin-left:36px;font-size:13px;color:#333;font-weight:500;">Respondent/s</div>
    </div>

    <!-- SUMMONS BODY -->
    <p style="font-size:15px;line-height:2.0;text-indent:42px;margin-bottom:18px;text-align:justify;color:#000;">
      You are hereby summoned to appear before me, in person together with your witness on the <span style="display:inline-block;border-bottom:1px solid #000;min-width:180px;text-align:center;font-weight:bold;padding:0 6px;">{{hearing_date_time}}</span> then and there to answer to a complaint made before me, copy of which is attached hereto, for mediation/conciliation of your dispute with complainant/s.
    </p>
    <p style="font-size:15px;line-height:2.0;text-indent:42px;margin-bottom:18px;text-align:justify;color:#000;">
      You are hereby warned that if you refuse or willfully fail to appear in obedience to this summons, you may be barred from the filing of any counterclaim arising from said complaint.
    </p>
    <p style="font-size:15px;font-weight:bold;text-align:center;margin:22px 0;letter-spacing:1px;color:#000;">
      FAIL NOT or else face punishment as for contempt of court.
    </p>
    <p style="font-size:15px;margin-top:22px;margin-bottom:32px;color:#000;">
      Issued this <span style="display:inline-block;border-bottom:1px solid #000;min-width:180px;text-align:center;font-weight:bold;padding:0 6px;">{{date_issued}}</span> at {{barangay_name}}, {{city}}.
    </p>`;
    }

    const bodyHasCaptionBox =
      luponBody.toLowerCase().includes('case no') ||
      luponBody.toLowerCase().includes('complainant') ||
      luponBody.includes('-against-') ||
      luponBody.includes('- against -');

    const bodyHasTitle =
      luponBody.toLowerCase().includes('=summons=') ||
      luponBody.toLowerCase().includes('= summons =') ||
      luponBody.toLowerCase().includes('patawag') ||
      luponBody.toLowerCase().includes('certificate to file action') ||
      luponBody.toLowerCase().includes('kp form');

    return `
<div style="font-family:'Times New Roman',Georgia,serif;color:#000;width:100%;max-width:840px;min-height:272mm;height:100%;margin:0 auto;background:#fff;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;padding:4mm 8mm;position:relative;">
  <!-- DYNAMIC WATERMARK SEAL -->
  {{barangay_watermark}}

  <div style="position:relative;z-index:2;">
    ${headerHtml}
    
    <div style="text-align:center;font-size:12px;font-weight:bold;color:#4f6e34;font-style:italic;margin-top:2px;margin-bottom:14px;letter-spacing:0.5px;">
      OFFICE OF THE LUPONG TAGAPAMAYAPA
    </div>

    ${!bodyHasCaptionBox ? `
    <!-- CAPTION TABLE / BOX -->
    <div style="border:1.5px solid #000;padding:12px 18px;margin-bottom:18px;font-size:14px;line-height:1.8;background:transparent;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">
        <div style="flex:1;"><strong>Barangay Case No.:</strong> <span style="display:inline-block;border-bottom:1px solid #000;min-width:140px;text-align:center;padding:0 8px;">{{case_number}}</span></div>
        <div style="flex:1;text-align:right;"><strong>Date Filed:</strong> <span style="display:inline-block;border-bottom:1px solid #000;min-width:140px;text-align:center;padding:0 8px;">{{date_filed}}</span></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">
        <div style="flex:1;"><strong>Complainant/s:</strong> <span style="display:inline-block;border-bottom:1px solid #000;min-width:160px;text-align:center;padding:0 8px;">{{complainant_name}}</span></div>
        <div style="flex:1;text-align:right;"><strong>For:</strong> <span style="display:inline-block;border-bottom:1px solid #000;min-width:160px;text-align:center;padding:0 8px;">{{purpose}}</span></div>
      </div>
      <div style="text-align:center;font-weight:bold;margin:6px 0;letter-spacing:2px;">- against -</div>
      <div><strong>Respondent/s:</strong> <span style="display:inline-block;border-bottom:1px solid #000;min-width:260px;text-align:center;padding:0 8px;">{{resident_name}}</span></div>
    </div>` : ''}

    ${!bodyHasTitle ? `
    <!-- DOCUMENT HEADING -->
    <div style="text-align:center;margin:18px 0 16px 0;">
      <h2 style="font-size:24px;font-weight:800;letter-spacing:3px;margin:0;color:#000;text-transform:uppercase;">
        ${luponTitle}
      </h2>
      <p style="font-size:12px;font-weight:bold;color:#475569;margin:4px 0 0 0;text-transform:uppercase;letter-spacing:1px;">
        ${luponSubtitle}
      </p>
    </div>` : ''}

    ${luponBody}
  </div>

  <!-- SIGNATURE & FOOTER -->
  <div style="position:relative;z-index:2;margin-top:auto;">
    <div style="display:flex;justify-content:flex-end;margin-bottom:28px;">
      <div style="text-align:center;min-width:260px;">
        <p style="font-size:16px;font-weight:bold;border-bottom:1px solid #000;padding-bottom:4px;margin:0;color:#000;">
          {{punong_barangay}}
        </p>
        <p style="font-size:13px;font-weight:bold;margin:4px 0 0 0;color:#000;">
          Punong Barangay / Lupon Chairman
        </p>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="text-align:center;border-top:1px solid #000;padding-top:8px;font-size:11.5px;font-style:italic;color:#4f6e34;font-weight:bold;line-height:1.4;font-family:Georgia,serif;">
      <p style="margin:0;">{{barangay_address}}</p>
      <p style="margin:2px 0 0 0;">
        Email Address: <span style="text-decoration:underline;">{{barangay_email}}</span>
      </p>
      <p style="margin:2px 0 0 0;">Telephone Nos. {{barangay_phone}}</p>
    </div>
  </div>
</div>
`.trim();
  }

  const sidebarPadding =
    sideColumnVerticalSpacing === 'compact'
      ? '8px 6px'
      : sideColumnVerticalSpacing === 'spacious'
      ? '18px 10px 14px 10px'
      : '12px 8px 8px 8px';
  const punongPbMargin =
    sideColumnVerticalSpacing === 'compact'
      ? '4px'
      : sideColumnVerticalSpacing === 'spacious'
      ? '16px'
      : '10px';
  const kagawadHeaderMargin =
    sideColumnVerticalSpacing === 'compact'
      ? '4px 0 2px 0'
      : sideColumnVerticalSpacing === 'spacious'
      ? '14px 0 8px 0'
      : '8px 0 4px 0';
  const execMarginTop =
    sideColumnVerticalSpacing === 'compact'
      ? '6px'
      : sideColumnVerticalSpacing === 'spacious'
      ? 'auto'
      : '20px';
  const execOfficerMargin =
    sideColumnVerticalSpacing === 'compact'
      ? '2px'
      : sideColumnVerticalSpacing === 'spacious'
      ? '14px'
      : '6px';
  const sidebarJustify =
    sideColumnVerticalSpacing === 'spacious' ? 'space-between' : 'flex-start';

  const isBusinessOrPermit = docTypeKey.includes('business');
  const showToWhom = !isBusinessOrPermit;

  // 2-COLUMN SIDEBAR LAYOUT (100% Matching Admin Document Templates)
  if (layoutStyle === 'two_column_sidebar') {
    return `
<div style="font-family:'Times New Roman',Georgia,serif;color:#000;width:100%;max-width:840px;min-height:272mm;height:100%;margin:0 auto;background:#fff;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;padding:2mm 4mm;position:relative;">
  <!-- DYNAMIC WATERMARK SEAL SPANNING WHOLE CERTIFICATE SHEET -->
  {{barangay_watermark}}

  <!-- TOP 3-SEAL HEADER -->
  <div style="position:relative;z-index:2;">
    ${headerHtml}
  </div>

  <!-- MAIN OUTER BLACK BORDER BOX CONTAINING 2 COLUMNS -->
  <div class="doc-frame" style="border:2px solid #000;display:flex;align-items:stretch;flex:1 1 auto;min-height:226mm;position:relative;margin:4px 0 6px 0;box-sizing:border-box;z-index:2;background:transparent;">
    
    <!-- LEFT SIDEBAR: BARANGAY OFFICIALS & KAGAWAD ROSTER -->
    <div style="width:235px;min-width:235px;border-right:2px solid #000;padding:${sidebarPadding};text-align:center;font-size:13.5px;display:flex;flex-direction:column;justify-content:${sidebarJustify};background:transparent;box-sizing:border-box;">
      
      <div>
        <!-- PUNONG BARANGAY -->
        <div style="margin-bottom:${punongPbMargin};">
          <p style="font-size:15.5px;font-weight:bold;text-decoration:underline;margin:0;color:#000;text-transform:uppercase;">
            {{punong_barangay}}
          </p>
          <p style="font-size:14px;font-weight:bold;margin:2px 0 0 0;color:#000;">
            Punong Barangay
          </p>
          <p style="font-size:12.5px;font-style:italic;margin:2px 0 0 0;color:#333;">
            Senior Citizen & PWD's Committee
          </p>
        </div>

        <!-- KAGAWAD HEADER -->
        <p style="font-size:15px;font-weight:bold;text-transform:uppercase;margin:${kagawadHeaderMargin};color:#000;letter-spacing:0.5px;">
          KAGAWAD:
        </p>

        <!-- DYNAMIC KAGAWAD ROSTER LIST WITH COMMITTEES -->
        <div>
          {{kagawad_list}}
        </div>

        <!-- EXECUTIVE OFFICERS (TREASURER & SECRETARY) -->
        <div style="margin-top:${execMarginTop};">
          <div style="margin-bottom:${execOfficerMargin};">
            <p style="font-size:14.5px;font-weight:bold;margin:0;color:#000;">{{barangay_treasurer}}</p>
            <p style="font-size:12.5px;font-style:italic;margin:1px 0 0 0;color:#333;">Barangay Treasurer</p>
          </div>

          <div>
            <p style="font-size:14.5px;font-weight:bold;margin:0;color:#000;">{{barangay_secretary}}</p>
            <p style="font-size:12.5px;font-style:italic;margin:1px 0 0 0;color:#333;">Barangay Secretary</p>
          </div>
        </div>
      </div>
    </div>

    <!-- RIGHT COLUMN: DOCUMENT TITLE, BODY & SIGNATURE -->
    <div style="flex:1;padding:26px 30px 18px 30px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;box-sizing:border-box;background:transparent;">
      
      <!-- MAIN CONTENT LAYER -->
      <div style="position:relative;z-index:2;">
        <h2 style="text-align:center;font-size:23px;font-weight:800;font-family:'Times New Roman',serif;letter-spacing:1.8px;color:#000;text-transform:uppercase;margin:6px 0 28px 0;">
          ${docTitleUpper}
        </h2>

        ${showToWhom ? `
        <p style="font-size:14.5px;font-weight:bold;margin-bottom:24px;color:#000;">
          TO WHOM IT MAY CONCERN:
        </p>` : ''}

        ${bodyWordingHtml}
      </div>

      <!-- BOTTOM SIGNATURE & OFFICIAL NOTICE SECTION -->
      <div style="position:relative;z-index:2;margin-top:auto;padding-top:32px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px;">
          <div style="font-size:10.5px;font-weight:bold;font-style:italic;color:#333;line-height:1.25;">
            Not Valid Without<br />Official Seal
          </div>

          <div style="text-align:center;min-width:220px;">
            <p style="font-size:14.5px;font-weight:bold;margin:0;color:#000;">
              {{punong_barangay}}
            </p>
            <p style="font-size:12px;font-weight:bold;margin:3px 0 0 0;color:#000;">
              Punong Barangay
            </p>
          </div>
        </div>

        <!-- WARNING FOOTER BAR -->
        <div style="border-top:1px solid #000;padding-top:6px;text-align:center;">
          <p style="font-size:9.5px;font-weight:bold;color:#000;margin:0;text-transform:uppercase;letter-spacing:0.3px;">
            **ALTERATION ON THIS PAGE WILL MAKE THIS CERTIFICATION VOID/INVALID**
          </p>
        </div>
      </div>

    </div>
  </div>

  <!-- DYNAMIC FOOTER ADDRESS & CONTACT INFORMATION -->
  <div style="position:relative;z-index:2;text-align:center;margin-top:auto;padding-top:8px;font-size:11.5px;font-style:italic;color:#4f6e34;font-weight:bold;line-height:1.4;font-family:Georgia,serif;">
    <p style="margin:0;">{{barangay_address}}</p>
    <p style="margin:2px 0 0 0;">
      Email Address: <span style="text-decoration:underline;">{{barangay_email}}</span>
    </p>
    <p style="margin:2px 0 0 0;">Telephone Nos. {{barangay_phone}}</p>
  </div>
</div>
`.trim();
  }

  // STANDARD SINGLE COLUMN LAYOUT
  return `
<div style="font-family:'Times New Roman',Georgia,serif;color:#000;width:100%;max-width:800px;min-height:272mm;height:100%;margin:0 auto;background:#fff;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;position:relative;padding:2mm 4mm;">
  <!-- DYNAMIC WATERMARK SEAL IN THE EXACT MIDDLE -->
  {{barangay_watermark}}

  <div style="position:relative;z-index:2;">
    ${headerHtml}
    <hr style="border:none;border-top:2px solid #000;margin:14px 0 28px 0;" />
    <h2 style="text-align:center;font-size:23px;font-weight:800;letter-spacing:1.8px;color:#000;text-transform:uppercase;margin:20px 0 28px 0;">
      ${docTitleUpper}
    </h2>
    ${showToWhom ? '<p style="font-size:14.5px;font-weight:bold;margin-bottom:22px;">TO WHOM IT MAY CONCERN:</p>' : ''}
    ${bodyWordingHtml}
  </div>

  <div style="position:relative;z-index:2;margin-top:auto;">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:40px;margin-bottom:24px;">
      <div style="font-size:10.5px;font-weight:bold;font-style:italic;color:#333;">
        Not Valid Without<br />Official Seal
      </div>
      <div style="text-align:center;min-width:220px;">
        <p style="font-size:14.5px;font-weight:bold;margin:0;color:#000;">
          {{punong_barangay}}
        </p>
        <p style="font-size:12px;font-weight:bold;margin:3px 0 0 0;color:#000;">
          Punong Barangay
        </p>
      </div>
    </div>
    <!-- DYNAMIC FOOTER ADDRESS & CONTACT INFORMATION -->
    <div style="text-align:center;margin-top:20px;border-top:1px solid #000;padding-top:8px;font-size:11.5px;font-style:italic;color:#4f6e34;font-weight:bold;line-height:1.4;font-family:Georgia,serif;">
      <p style="margin:0;">{{barangay_address}}</p>
      <p style="margin:2px 0 0 0;">
        Email Address: <span style="text-decoration:underline;">{{barangay_email}}</span>
      </p>
      <p style="margin:2px 0 0 0;">Telephone Nos. {{barangay_phone}}</p>
    </div>
  </div>
</div>
`.trim();
}

export function renderDocumentTemplateHtml(
  template: { name?: string; body?: string | null; documentType?: string | null; id?: string } | null,
  data: {
    residentName?: string;
    residentAddress?: string;
    purpose?: string;
    dateIssued?: string;
    referenceNumber?: string;
    complainantName?: string;
    [key: string]: unknown;
  }
): string {
  const residentName = (data.residentName as string) || 'Juan Dela Cruz';
  const residentAddress =
    (data.residentAddress as string) ||
    (data.address as string) ||
    (data.residentAddressLine as string) ||
    (data.residenceAddress as string) ||
    'Barangay Progreso, City of San Juan';
  const rawPurpose = (data.purpose as string) || (data.reason as string) || 'For whatever legal purpose it may serve';
  const purpose = stripPriceFromPurpose(rawPurpose) || 'For whatever legal purpose it may serve';
  const rawDateIssued = (data.dateIssued as string) || (data.issuedDate as string) || new Date().toISOString().slice(0, 10);
  const parsedDate = new Date(rawDateIssued);
  const validDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  const dayNum = validDate.getDate();
  const daySuffix = ['th', 'st', 'nd', 'rd'][(dayNum % 10 > 3 || Math.floor((dayNum % 100) / 10) === 1) ? 0 : dayNum % 10];
  const formattedDay = `${dayNum}${daySuffix}`;
  const formattedMonth = validDate.toLocaleString('en-US', { month: 'long' });
  const formattedYear = String(validDate.getFullYear());
  const formattedDateIssued = `${formattedDay} day of ${formattedMonth}, ${formattedYear}`;
  const dateIssued = rawDateIssued;

  const referenceNumber = (data.referenceNumber as string) || (data.caseNumber as string) || '';
  const complainantName = (data.complainantName as string) || (data.complainants as string) || '';

  const settings = getBarangayOfficialSettings();

  const punongBarangay = (data.punongBarangay as string) || (data.punong_barangay as string) || settings.punongBarangay;
  const barangaySecretary = (data.barangaySecretary as string) || (data.barangay_secretary as string) || settings.barangaySecretary;
  const barangayTreasurer = (data.barangayTreasurer as string) || (data.barangay_treasurer as string) || settings.barangayTreasurer;
  const barangayName = (data.barangayName as string) || (data.barangay_name as string) || settings.barangayName;
  const city = (data.city as string) || (data.cityName as string) || settings.cityName;
  const barangayAddress = (data.barangayAddress as string) || (data.barangay_address as string) || settings.barangayAddress;
  const barangayEmail = (data.barangayEmail as string) || (data.barangay_email as string) || settings.barangayEmail;
  const barangayPhone = (data.barangayPhone as string) || (data.barangay_phone as string) || settings.barangayPhone;

  const sealImgs = {
    country: '<img src="/images/indigency-template/bagong-pilipinas.png" alt="Country Seal" style="height:55px;width:68px;object-fit:contain;display:inline-block;" />',
    city: '<img src="/images/indigency-template/san-juan-seal.jpeg" alt="City Seal" style="height:60px;width:60px;object-fit:contain;display:inline-block;" />',
    barangay: '<img src="/images/indigency-template/barangay-progreso-seal.jpeg" alt="Barangay Seal" style="height:60px;width:60px;object-fit:contain;display:inline-block;" />',
    watermark: '<img src="/images/indigency-template/barangay-progreso-seal.jpeg" class="doc-watermark" style="position:absolute;left:50%;top:50%;width:560px;max-width:88%;transform:translate(-50%, -50%);opacity:0.12;filter:contrast(115%);pointer-events:none;z-index:1;user-select:none;-webkit-user-select:none;" alt="Barangay Seal Watermark" />',
  };

  const formattedKagawadListHtml = OFFICIAL_KAGAWADS.map(
    (k) => `
<div style="margin-bottom:7px;">
  <p style="font-size:14px;font-weight:bold;margin:0;color:#000;line-height:1.25;">${k.name}</p>
  <p style="font-size:12px;font-style:italic;margin:2px 0 0 0;color:#333;line-height:1.2;">${k.committee}</p>
</div>`
  ).join('');

  const docKey = `${template?.documentType || template?.id || ''} ${template?.name || ''}`.trim() || 'barangay_certification';
  const isLuponKey =
    docKey.toLowerCase().includes('lupon') ||
    docKey.toLowerCase().includes('summons') ||
    docKey.toLowerCase().includes('patawag') ||
    docKey.toLowerCase().includes('cfa');

  let rawHtml = template?.body?.trim();
  if (!rawHtml || (!isLuponKey && !rawHtml.includes('doc-frame') && !rawHtml.includes('kagawad'))) {
    rawHtml = buildDefaultHtmlLayout(docKey, 'centered', isLuponKey ? 'single_column' : 'two_column_sidebar');
  }

  // Strip metadata comments if present
  rawHtml = rawHtml.replace(/<!-- TEMPLATE_META:([\s\S]*?) -->$/, '').trim();

  const addWhere =
    (data.add_where as string) ||
    (data.addWhere as string) ||
    (data.location as string) ||
    (data.projectLocation as string) ||
    (data.site_address as string) ||
    (data.siteAddress as string) ||
    residentAddress;

  let rendered = rawHtml;
  rendered = rendered.replaceAll('{{resident_name}}', residentName);
  rendered = rendered.replaceAll('{{residentName}}', residentName);
  rendered = rendered.replaceAll('{{name}}', residentName);
  rendered = rendered.replaceAll('{{resident_address}}', residentAddress);
  rendered = rendered.replaceAll('{{residentAddress}}', residentAddress);
  rendered = rendered.replaceAll('{{address}}', residentAddress);
  rendered = rendered.replaceAll('{{add_where}}', addWhere);
  rendered = rendered.replaceAll('{{addWhere}}', addWhere);
  rendered = rendered.replaceAll('{{location}}', addWhere);
  rendered = rendered.replaceAll('{{site_address}}', addWhere);
  rendered = rendered.replaceAll('{{siteAddress}}', addWhere);
  rendered = rendered.replaceAll('{{project_location}}', addWhere);
  rendered = rendered.replaceAll('{{projectLocation}}', addWhere);
  rendered = rendered.replaceAll('{{purpose}}', purpose);
  rendered = rendered.replaceAll('{{reason}}', purpose);
  rendered = rendered.replaceAll('{{date_issued}}', formattedDateIssued);
  rendered = rendered.replaceAll('{{day}}', formattedDay);
  rendered = rendered.replaceAll('{{month}}', formattedMonth);
  rendered = rendered.replaceAll('{{year}}', formattedYear);
  rendered = rendered.replaceAll('{{dateIssued}}', dateIssued);
  rendered = rendered.replaceAll('{{issuedDate}}', dateIssued);
  rendered = rendered.replaceAll('{{reference_number}}', referenceNumber);
  rendered = rendered.replaceAll('{{referenceNumber}}', referenceNumber);
  rendered = rendered.replaceAll('{{case_number}}', referenceNumber);
  rendered = rendered.replaceAll('{{date_filed}}', formattedDateIssued);
  rendered = rendered.replaceAll('{{hearing_date_time}}', `${formattedDateIssued} at 9:00 AM`);
  rendered = rendered.replaceAll('{{complainant_name}}', complainantName || 'Complainant Name');
  rendered = rendered.replaceAll('{{complainants}}', complainantName || 'Complainant Name');
  rendered = rendered.replaceAll('{{punong_barangay}}', punongBarangay);
  rendered = rendered.replaceAll('{{punongBarangay}}', punongBarangay);
  rendered = rendered.replaceAll('{{barangay_secretary}}', barangaySecretary);
  rendered = rendered.replaceAll('{{barangaySecretary}}', barangaySecretary);
  rendered = rendered.replaceAll('{{barangay_treasurer}}', barangayTreasurer);
  rendered = rendered.replaceAll('{{barangayTreasurer}}', barangayTreasurer);
  rendered = rendered.replaceAll('{{kagawad_list}}', formattedKagawadListHtml);
  rendered = rendered.replaceAll('{{barangay_name}}', barangayName);
  rendered = rendered.replaceAll('{{barangayName}}', barangayName);
  rendered = rendered.replaceAll('{{city}}', city);
  rendered = rendered.replaceAll('{{cityName}}', city);
  rendered = rendered.replaceAll('{{country_seal}}', sealImgs.country);
  rendered = rendered.replaceAll('{{city_seal}}', sealImgs.city);
  rendered = rendered.replaceAll('{{barangay_seal}}', sealImgs.barangay);
  rendered = rendered.replaceAll('{{barangay_watermark}}', sealImgs.watermark);
  rendered = rendered.replaceAll('{{official_seal}}', '<div style="display:inline-block;border:2px solid #1e3a8a;color:#1e3a8a;padding:4px 10px;border-radius:9999px;font-weight:bold;font-size:10px;">[ OFFICIAL BARANGAY SEAL ]</div>');
  rendered = rendered.replaceAll('{{barangay_address}}', barangayAddress);
  rendered = rendered.replaceAll('{{barangay_email}}', barangayEmail);
  rendered = rendered.replaceAll('{{barangay_phone}}', barangayPhone);

  // Replace other dynamic fields from data map
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined && val !== null && typeof val !== 'object') {
      rendered = rendered.replaceAll(`{{${key}}}`, String(val));
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      rendered = rendered.replaceAll(`{{${snakeKey}}}`, String(val));
    }
  }

  return rendered;
}
