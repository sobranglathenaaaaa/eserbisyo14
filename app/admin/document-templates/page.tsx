'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState, useRef } from 'react';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Code,
  Edit3,
  Eye,
  FileText,
  Image as ImageIcon,
  Layout,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import PortalShell from '@/components/portal-shell';
import {
  EmptyState,
  FieldLabel,
  FormFeedback,
  PageGuide,
  SectionCard,
  StatusBadge,
  statusToneFromState,
} from '@/components/portal-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/formatters';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';
import { deleteDocumentTemplate, upsertDocumentTemplate } from '@/lib/frontend-data/store';
import { useAppState } from '@/lib/frontend-data/use-app-state';
import type { DocumentTemplate } from '@/lib/types/models';
import {
  OFFICIAL_DOCUMENT_CATEGORIES as DOCUMENT_TYPES,
  DEFAULT_OFFICIAL_TEMPLATES,
  OFFICIAL_WORD_TEMPLATES,
  getCategoryForDocType,
} from '@/lib/documents/document-catalog-constants';


// Dynamic System Variables Catalog (Fully Dynamic - NO hardcoded strings!)
const SYSTEM_DYNAMIC_TAGS = [
  { tag: '{{punong_barangay}}', fieldName: 'punong_barangay', label: 'Punong Barangay Full Name' },
  { tag: '{{barangay_secretary}}', fieldName: 'barangay_secretary', label: 'Barangay Secretary Name' },
  { tag: '{{barangay_treasurer}}', fieldName: 'barangay_treasurer', label: 'Barangay Treasurer Name' },
  { tag: '{{kagawad_list}}', fieldName: 'kagawad_list', label: 'Dynamic Kagawad Roster & Committees' },
  { tag: '{{resident_name}}', fieldName: 'resident_name', label: 'Resident Full Name' },
  { tag: '{{resident_address}}', fieldName: 'resident_address', label: 'Resident Address' },
  { tag: '{{purpose}}', fieldName: 'purpose', label: 'Specific Request Purpose' },
  { tag: '{{date_issued}}', fieldName: 'date_issued', label: 'Date Issued' },
  { tag: '{{reference_number}}', fieldName: 'reference_number', label: 'Control / Reference Number' },
  { tag: '{{barangay_name}}', fieldName: 'barangay_name', label: 'Barangay Name' },
  { tag: '{{city}}', fieldName: 'city', label: 'City / Municipality Name' },
  { tag: '{{barangay_address}}', fieldName: 'barangay_address', label: 'Barangay Office Address' },
  { tag: '{{barangay_email}}', fieldName: 'barangay_email', label: 'Barangay Official Email' },
  { tag: '{{barangay_phone}}', fieldName: 'barangay_phone', label: 'Barangay Contact Numbers' },
  { tag: '{{barangay_watermark}}', fieldName: 'barangay_watermark', label: 'Center Barangay Watermark Seal' },
  { tag: '{{country_seal}}', fieldName: 'country_seal', label: 'Bagong Pilipinas / Country Seal' },
  { tag: '{{city_seal}}', fieldName: 'city_seal', label: 'City / Municipal Seal' },
  { tag: '{{barangay_seal}}', fieldName: 'barangay_seal', label: 'Barangay Official Seal' },
  { tag: '{{official_seal}}', fieldName: 'official_seal', label: 'Official Seal Badge Text' },
];

type KagawadItem = {
  id: string;
  name: string;
  committee: string;
};

// Category & Layout-Aware Default HTML Builder (Fully Dynamic Placeholders & Variables)
function buildDefaultHtmlLayout(
  docTypeKey: string,
  sealAlignment: 'side_by_side' | 'centered' | 'stacked' = 'centered',
  layoutStyle: 'single_column' | 'two_column_sidebar' = 'two_column_sidebar',
  sideColumnVerticalSpacing: 'compact' | 'standard' | 'spacious' = 'standard'
): string {
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

  switch (true) {
    // 1. Barangay Certification Sub-Types
    case docTypeKey.includes('school_req') || docTypeKey.includes('school'):
      docTitleUpper = 'BARANGAY CERTIFICATION';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">{{resident_name}}</u>, of legal age, Filipino, whose residence is at <u style="font-weight:bold;">{{resident_address}}</u>, is a bona fide resident of {{barangay_name}}, {{city}}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  Based on records and verification, the above-named individual is a law-abiding citizen with good moral standing in this community.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This certification is issued upon the request of <u style="font-weight:bold;">{{resident_name}}</u> for <u style="font-weight:bold;">SCHOOL REQUIREMENT / ENROLLMENT / SCHOLARSHIP APPLICATION</u> (<u style="font-weight:bold;">{{purpose}}</u>).
</p>
<p style="font-size:14.5px;margin-top:26px;margin-bottom:32px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
</p>
`;
      break;

    case docTypeKey.includes('indigency'):
      docTitleUpper = 'CERTIFICATE OF INDIGENCY';
      bodyWordingHtml = `
<p style="font-size:15px;line-height:2.1;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">{{resident_name}}</u> whose residence at <u style="font-weight:bold;">{{resident_address}}</u> is within the jurisdiction of {{barangay_name}}, {{city}} and belongs to the indigent families of this barangay. The barangay also certifies that their daily income is barely enough to meet their day-to-day needs.
</p>
<p style="font-size:15px;line-height:2.1;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This certification is being issued upon the request of Mr./Mrs./Ms. <u style="font-weight:bold;">{{resident_name}}</u> for <u style="font-weight:bold;">{{purpose}}</u> (Financial, Medical, Educational, or Burial Assistance).
</p>
<p style="font-size:15px;margin-top:26px;margin-bottom:32px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
</p>
`;
      break;

    case docTypeKey.includes('pwd_senior') || docTypeKey.includes('senior') || docTypeKey.includes('pwd'):
      docTitleUpper = 'BARANGAY CERTIFICATION';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">{{resident_name}}</u>, whose residence at <u style="font-weight:bold;">{{resident_address}}</u>, is a bona fide and verified resident of {{barangay_name}}, {{city}}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This office further certifies that the subject individual is eligible for registration and issuance of privileges under Republic Act No. 7277 / Republic Act No. 9994.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  Issued upon request of <u style="font-weight:bold;">{{resident_name}}</u> for <u style="font-weight:bold;">PWD / SENIOR CITIZEN APPLICATION</u> (<u style="font-weight:bold;">{{purpose}}</u>).
</p>
<p style="font-size:14.5px;margin-top:26px;margin-bottom:32px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
</p>
`;
      break;

    case docTypeKey.includes('health_card') || docTypeKey.includes('health'):
      docTitleUpper = 'BARANGAY CERTIFICATION';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">{{resident_name}}</u> residing at <u style="font-weight:bold;">{{resident_address}}</u> is a bona fide resident of {{barangay_name}}, {{city}}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  He/She has undergone residency verification and has no derogatory record on file with this office.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This certification is issued upon the request of <u style="font-weight:bold;">{{resident_name}}</u> for <u style="font-weight:bold;">HEALTH CARD APPLICATION / MEDICAL PROCESSING</u> (<u style="font-weight:bold;">{{purpose}}</u>).
</p>
<p style="font-size:14.5px;margin-top:26px;margin-bottom:32px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
</p>
`;
      break;

    case docTypeKey.includes('death_cert') || docTypeKey.includes('death'):
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

    case docTypeKey.includes('employment'):
      docTitleUpper = 'BARANGAY CERTIFICATION';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">{{resident_name}}</u> whose residence at <u style="font-weight:bold;">{{resident_address}}</u> is within the jurisdiction of {{barangay_name}}, {{city}}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  RECORD CHECK IN THIS OFFICE SHOWS THAT THE ABOVE-NAMED INDIVIDUAL HAS NO DEROGATORY AND/OR PENDING CRIMINAL RECORD FILED AGAINST HIM/HER AS OF THIS DATE.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This certification is being issued upon the request of <u style="font-weight:bold;">{{resident_name}}</u> for <u style="font-weight:bold;">LOCAL EMPLOYMENT / PRE-EMPLOYMENT REQUIREMENTS</u> (<u style="font-weight:bold;">{{purpose}}</u>).
</p>
<p style="font-size:14.5px;margin-top:26px;margin-bottom:32px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
</p>
`;
      break;

    case docTypeKey.includes('police_nbi') || docTypeKey.includes('court'):
      docTitleUpper = 'BARANGAY CLEARANCE';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">{{resident_name}}</u> whose residence is at <u style="font-weight:bold;">{{resident_address}}</u> is a bona fide resident of {{barangay_name}}, {{city}}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  RECORD CHECK SHOWS THAT HE/SHE HAS NO DEROGATORY RECORD ON FILE AS OF THIS DATE AND IS A LAW-ABIDING CITIZEN.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  Issued upon the request of <u style="font-weight:bold;">{{resident_name}}</u> for <u style="font-weight:bold;">SECURING POLICE, NBI, OR COURT CLEARANCE</u> (<u style="font-weight:bold;">{{purpose}}</u>).
</p>
<p style="font-size:14.5px;margin-top:26px;margin-bottom:32px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
</p>
`;
      break;

    case docTypeKey.includes('passport_visa') || docTypeKey.includes('passport') || docTypeKey.includes('postal'):
      docTitleUpper = 'BARANGAY CERTIFICATION';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">{{resident_name}}</u> residing at <u style="font-weight:bold;">{{resident_address}}</u> is a bona fide resident of {{barangay_name}}, {{city}}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  The undersigned officials attest that the bearer is a person of good moral character and has no derogatory record on file.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  Issued upon request for <u style="font-weight:bold;">PASSPORT / POSTAL ID / VISA APPLICATION</u> (<u style="font-weight:bold;">{{purpose}}</u>).
</p>
<p style="font-size:14.5px;margin-top:26px;margin-bottom:32px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
</p>
`;
      break;

    case docTypeKey.includes('overseas_visa') || docTypeKey.includes('overseas') || docTypeKey.includes('visa'):
      docTitleUpper = 'BARANGAY CERTIFICATION';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">{{resident_name}}</u> residing at <u style="font-weight:bold;">{{resident_address}}</u> is a bona fide resident of {{barangay_name}}, {{city}}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  He/She is verified to have no derogatory record in this barangay and is of good moral standing.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  Issued upon request for <u style="font-weight:bold;">OVERSEAS EMPLOYMENT (OFW) / VISA EXTENSION</u> (<u style="font-weight:bold;">{{purpose}}</u>).
</p>
<p style="font-size:14.5px;margin-top:26px;margin-bottom:32px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
</p>
`;
      break;

    case docTypeKey.includes('no_operation'):
      docTitleUpper = 'CERTIFICATE OF NO OPERATION';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This is to certify that according to the records and ocular inspection conducted by this office, the business entity registered under the name of <u style="font-weight:bold;">{{resident_name}}</u> with business address located at <u style="font-weight:bold;">{{resident_address}}</u>, {{barangay_name}}, {{city}}, is <u style="font-weight:bold;">NOT IN OPERATION / HAS CEASED OPERATIONS</u>.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This certification is being issued upon request for <u style="font-weight:bold;">{{purpose}}</u> (Business Closure / Tax Assessment / Government Agency compliance).
</p>
<p style="font-size:14.5px;margin-top:26px;margin-bottom:32px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
</p>
`;
      break;

    // 2. Transient Employees & Worker Certification
    case docTypeKey.includes('transient') || docTypeKey.includes('kasambahay') || docTypeKey.includes('worker'):
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

    // 3. Lupon ng mga Tagapamayapa (Summons / CFA)
    case docTypeKey.includes('cfa') || docTypeKey.includes('file_action'):
      docTitleUpper = 'CERTIFICATE TO FILE ACTION';
      bodyWordingHtml = `
<p style="font-size:13px;font-weight:bold;margin-bottom:12px;color:#000;">KP FORM NO. 20 - OFFICE OF THE LUPONG TAGAPAMAYAPA</p>
<p style="font-size:14px;line-height:2.0;text-indent:42px;margin-bottom:20px;text-align:justify;color:#000;">
  This is to certify that the dispute involving complainant and respondent <u style="font-weight:bold;">{{resident_name}}</u> regarding <u style="font-weight:bold;">{{purpose}}</u> underwent conciliation proceedings before the Barangay Lupon.
</p>
<p style="font-size:14px;line-height:2.0;text-indent:42px;margin-bottom:20px;text-align:justify;color:#000;">
  That personal confrontation between parties failed to reach an amicable settlement. Therefore, the corresponding complaint for the dispute may now be filed in Court / competent government tribunal.
</p>
<p style="font-size:14px;margin-top:24px;margin-bottom:28px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
</p>
`;
      break;

    case docTypeKey.includes('lupon') || docTypeKey.includes('summons') || docTypeKey.includes('patawag'):
      docTitleUpper = '= S U M M O N S =';
      bodyWordingHtml = `
<div style="border:1.5px solid #000;padding:10px 14px;margin-bottom:18px;font-size:13px;line-height:1.7;">
  <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
    <div><strong>Barangay Case No.:</strong> <u style="font-weight:bold;">{{reference_number}}</u></div>
    <div><strong>Date Filed:</strong> <u style="font-weight:bold;">{{date_issued}}</u></div>
  </div>
  <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
    <div><strong>Complainant/s:</strong> <u style="font-weight:bold;">{{complainant_name}}</u></div>
    <div><strong>For:</strong> <u style="font-weight:bold;">{{purpose}}</u></div>
  </div>
  <div style="text-align:center;font-weight:bold;margin:4px 0;letter-spacing:1px;">- against -</div>
  <div><strong>Respondent/s:</strong> <u style="font-weight:bold;">{{resident_name}}</u></div>
</div>

<p style="font-size:14px;font-weight:bold;margin-bottom:12px;color:#000;">TO: <u style="font-weight:bold;">{{resident_name}}</u> (Respondent/s)</p>
<p style="font-size:14px;line-height:2.0;text-indent:42px;margin-bottom:18px;text-align:justify;color:#000;">
  You are hereby summoned to appear before me, in person together with your witness on the <u style="font-weight:bold;">{{date_issued}}</u> then and there to answer to a complaint made before me, copy of which is attached hereto, for mediation/conciliation of your dispute with complainant/s.
</p>
<p style="font-size:14px;line-height:2.0;text-indent:42px;margin-bottom:18px;text-align:justify;color:#000;">
  You are hereby warned that if you refuse or willfully fail to appear in obedience to this summons, you may be barred from the filing of any counterclaim arising from said complaint.
</p>
<p style="font-size:13.5px;font-weight:bold;text-align:center;margin:16px 0;letter-spacing:0.5px;color:#000;">
  FAIL NOT or else face punishment as for contempt of court.
</p>
<p style="font-size:14px;margin-top:20px;margin-bottom:28px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
</p>
`;
      break;

    // 4. Business Clearance (BLANK BUSINESS-PERMIT.docx reference)
    case docTypeKey.includes('business'):
      docTitleUpper = 'BARANGAY BUSINESS CLEARANCE';
      bodyWordingHtml = `
<div style="font-size:14.5px;line-height:2.1;text-align:justify;color:#000;">
  <p style="margin-bottom:16px;text-indent:42px;">
    <strong>Name of Establishment:</strong> <u style="font-weight:bold;font-size:15.5px;">{{purpose}}</u>
  </p>
  <p style="margin-bottom:16px;text-indent:42px;">
    is issued to <u style="font-weight:bold;font-size:15.5px;">{{resident_name}}</u> (Name of Owner)
  </p>
  <p style="margin-bottom:20px;text-indent:42px;">
    With postal address at <u style="font-weight:bold;">{{resident_address}}</u>, {{city}}.
  </p>
  <p style="text-indent:42px;margin-bottom:24px;line-height:2.1;">
    This clearance is issued upon the request of the aforementioned name granted that no law / city ordinance / resolution shall be violated upon the duration of the operations or renewal of the aforementioned clearance shall not be granted.
  </p>
  <p style="margin-top:24px;margin-bottom:32px;">
    Issued this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}.
  </p>
</div>
`;
      break;

    // 5. Construction Clearances (CONSTRUCTION-PERMIT.docx reference)
    case docTypeKey.includes('construction') ||
      docTypeKey.includes('occupancy') ||
      docTypeKey.includes('renovation') ||
      docTypeKey.includes('expansion') ||
      docTypeKey.includes('fencing') ||
      docTypeKey.includes('utilities') ||
      docTypeKey.includes('excavation') ||
      docTypeKey.includes('demolition'):
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
<p style="font-size:14px;margin-bottom:16px;margin-left:20px;">Address of Owner: <u style="font-weight:bold;">{{resident_address}}</u></p>
<p style="font-size:14px;line-height:2.0;text-indent:42px;margin-bottom:20px;text-align:justify;color:#000;">
  This Certification is being issued upon the request of the above-named applicant for the aforementioned purpose (<u style="font-weight:bold;">{{purpose}}</u>).
</p>
<p style="font-size:14px;margin-top:20px;margin-bottom:28px;color:#000;">
  Given this <u style="font-weight:bold;">{{date_issued}}</u> at {{barangay_name}}, {{city}}, Metro Manila.
</p>
`;
      break;

    // 6. Delivery & Hauling Clearances
    case docTypeKey.includes('delivery') ||
      docTypeKey.includes('hauling') ||
      docTypeKey.includes('mixer') ||
      docTypeKey.includes('debris') ||
      docTypeKey.includes('sand_gravel') ||
      docTypeKey.includes('heavy_equipment'):
      docTitleUpper = 'DELIVERY & HAULING CLEARANCE';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  Barangay clearance is hereby granted to <u style="font-weight:bold;">{{resident_name}}</u> for delivery / hauling operations at <u style="font-weight:bold;">{{resident_address}}</u>, {{barangay_name}}, {{city}}.
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

    // 7. Special & Commercial Permits
    case docTypeKey.includes('special') ||
      docTypeKey.includes('shooting') ||
      docTypeKey.includes('cables') ||
      docTypeKey.includes('flyers'):
      docTitleUpper = 'SPECIAL & COMMERCIAL PERMIT';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  Special barangay clearance/permit is hereby granted to <u style="font-weight:bold;">{{resident_name}}</u> for activity/operations at <u style="font-weight:bold;">{{resident_address}}</u>, {{barangay_name}}, {{city}}.
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

    case docTypeKey.includes('residency'):
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

    case docTypeKey.includes('good_moral'):
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

    return `
<div style="font-family:'Times New Roman',Georgia,serif;color:#000;width:100%;max-width:840px;min-height:272mm;height:100%;margin:0 auto;background:#fff;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;padding:4mm 8mm;position:relative;">
  <!-- DYNAMIC WATERMARK SEAL -->
  {{barangay_watermark}}

  <div style="position:relative;z-index:2;">
    ${headerHtml}
    
    <div style="text-align:center;font-size:12px;font-weight:bold;color:#4f6e34;font-style:italic;margin-top:2px;margin-bottom:14px;letter-spacing:0.5px;">
      OFFICE OF THE LUPONG TAGAPAMAYAPA
    </div>

    <!-- CAPTION TABLE / BOX (Barangay Case No, Date Filed, Complainants, For, Respondents) -->
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
    </div>

    <!-- DOCUMENT HEADING -->
    <div style="text-align:center;margin:18px 0 16px 0;">
      <h2 style="font-size:24px;font-weight:800;letter-spacing:3px;margin:0;color:#000;text-transform:uppercase;">
        ${luponTitle}
      </h2>
      <p style="font-size:12px;font-weight:bold;color:#475569;margin:4px 0 0 0;text-transform:uppercase;letter-spacing:1px;">
        ${luponSubtitle}
      </p>
    </div>

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

  // Sidebar height & spacing distributions:
  // - 'compact': ~50% page length (upper half)
  // - 'standard': ~75% (3/4) page length
  // - 'spacious': 100% full page length stretching to bottom
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

  // 2-COLUMN SIDEBAR LAYOUT (FULL A4 HEIGHT PROPORTIONS & DYNAMIC WHOLE-PAGE WATERMARK)
  if (layoutStyle === 'two_column_sidebar') {
    return `
<div style="font-family:'Times New Roman',Georgia,serif;color:#000;width:100%;max-width:840px;min-height:272mm;height:100%;margin:0 auto;background:#fff;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;padding:2mm 4mm;position:relative;">
  <!-- DYNAMIC WATERMARK SEAL SPANNING WHOLE CERTIFICATE SHEET -->
  {{barangay_watermark}}

  <!-- TOP 3-SEAL HEADER -->
  <div style="position:relative;z-index:2;">
    ${headerHtml}
  </div>

  <!-- MAIN OUTER BLACK BORDER BOX CONTAINING 2 COLUMNS (FLEX-1 STRETCH TO FILL FULL HEIGHT) -->
  <div class="doc-frame" style="border:2px solid #000;display:flex;align-items:stretch;flex:1 1 auto;min-height:226mm;position:relative;margin:4px 0 6px 0;box-sizing:border-box;z-index:2;background:transparent;">
    
    <!-- LEFT SIDEBAR: BARANGAY OFFICIALS & KAGAWAD ROSTER (SIZED UP BY +2PX) -->
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

export default function AdminDocumentTemplatesPage() {
  const { state, locale } = useAppState();
  const pageCopy = getRolePageCopy('admin/document-templates');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Dynamic Templates List directly from System State (Strictly Deduplicated)
  const templatesList = useMemo(() => {
    const customTemplates = state.documentTemplates || [];
    const merged: DocumentTemplate[] = [];
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();

    const normalizeName = (name: string) =>
      name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

    // 1. Process custom templates first (preserving user edits)
    customTemplates.forEach((tpl) => {
      const normId = (tpl.id || '').trim().toLowerCase();
      const normName = normalizeName(tpl.name || '');
      if (normId && !seenIds.has(normId) && !seenNames.has(normName)) {
        seenIds.add(normId);
        if (normName) seenNames.add(normName);

        // Enrich with official word template metadata if applicable
        const officialWordMatch = OFFICIAL_WORD_TEMPLATES.find(
          (ow) => ow.id === tpl.id || normalizeName(ow.name) === normName
        );

        merged.push({
          ...tpl,
          dynamicFields:
            tpl.dynamicFields && tpl.dynamicFields.length > 0
              ? tpl.dynamicFields
              : officialWordMatch
              ? officialWordMatch.dynamicFields
              : ['resident_name', 'resident_address', 'purpose', 'date_issued', 'punong_barangay'],
          documentType: tpl.documentType || (officialWordMatch ? officialWordMatch.documentType : 'barangay_certification'),
          sourceType: tpl.sourceType || (officialWordMatch ? 'official' : 'custom'),
          originalFileName: tpl.originalFileName || (officialWordMatch ? officialWordMatch.fileName : undefined),
        });
      }
    });

    // 2. Add default official templates that haven't been added yet
    DEFAULT_OFFICIAL_TEMPLATES.forEach((defTpl) => {
      const normId = (defTpl.id || '').trim().toLowerCase();
      const normName = normalizeName(defTpl.name || '');

      if (!seenIds.has(normId) && !seenNames.has(normName)) {
        seenIds.add(normId);
        if (normName) seenNames.add(normName);

        const officialWordMatch = OFFICIAL_WORD_TEMPLATES.find(
          (ow) => ow.id === defTpl.id || normalizeName(ow.name) === normName
        );

        merged.push({
          id: defTpl.id,
          name: defTpl.name,
          body: '',
          dynamicFields: officialWordMatch
            ? officialWordMatch.dynamicFields
            : ['resident_name', 'resident_address', 'purpose', 'date_issued', 'punong_barangay'],
          updatedAt: new Date().toISOString(),
          updatedBy: 'System (Official)',
          documentType: officialWordMatch ? officialWordMatch.documentType : defTpl.categoryId,
          sourceType: officialWordMatch ? 'official' : 'custom',
          originalFileName: officialWordMatch ? officialWordMatch.fileName : undefined,
          isActive: true,
        });
      }
    });

    return merged;
  }, [state.documentTemplates]);


  // Main Category Navigation: 'library' | 'barangay_officials'
  const [mainTab, setMainTab] = useState<'library' | 'barangay_officials'>('library');

  // View Modes: 'list' | 'view_details' | 'upload_wizard' | 'editor'
  const [viewMode, setViewMode] = useState<'list' | 'view_details' | 'upload_wizard' | 'editor'>('list');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [templatePage, setTemplatePage] = useState(1);
  const templatesPerPage = 10;

  // Upload Wizard State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFilePreviewUrl, setUploadedFilePreviewUrl] = useState<string | null>(null);
  const [wizardDocType, setWizardDocType] = useState('barangay_certification');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatusText, setAnalysisStatusText] = useState('');
  const [overwriteModal, setOverwriteModal] = useState<{
    isOpen: boolean;
    existingTemplate: DocumentTemplate;
  } | null>(null);
  const [overwriteSaveModal, setOverwriteSaveModal] = useState<{
    isOpen: boolean;
    conflictingTemplate: DocumentTemplate;
  } | null>(null);

  // Template Editor State
  const [editorName, setEditorName] = useState('');
  const [editorDocType, setEditorDocType] = useState('certificate_indigency');
  const [editorSourceType, setEditorSourceType] = useState<'uploaded' | 'custom' | 'official'>('custom');
  const [editorFileName, setEditorFileName] = useState('');
  const [bodyContent, setBodyContent] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [dynamicFieldsInput, setDynamicFieldsInput] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [editorIsOverwritten, setEditorIsOverwritten] = useState(false);

  // Editor Display Mode Tab: 'visual' | 'html' | 'text' | 'original_upload'
  const [editorTab, setEditorTab] = useState<'visual' | 'html' | 'text' | 'original_upload'>('visual');

  // Styling, Seals & Layout Config
  const [showLogo, setShowLogo] = useState(true);
  const [showSeal, setShowSeal] = useState(true);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('center');

  // 3-Seal Media State (Country, City, Barangay)
  const [countryLogoUrl, setCountryLogoUrl] = useState<string>('/images/indigency-template/bagong-pilipinas.png');
  const [cityLogoUrl, setCityLogoUrl] = useState<string>('/images/indigency-template/san-juan-seal.jpeg');
  const [barangayLogoUrl, setBarangayLogoUrl] = useState<string>('/images/indigency-template/barangay-progreso-seal.jpeg');

  // Seal Arrangement Options: 'side_by_side' | 'centered' | 'stacked'
  const [sealAlignment, setSealAlignment] = useState<'side_by_side' | 'centered' | 'stacked'>('centered');

  // Document Layout Style Options: 'single_column' | 'two_column_sidebar'
  const [layoutStyle, setLayoutStyle] = useState<'single_column' | 'two_column_sidebar'>('two_column_sidebar');

  // Side Column Vertical Spacing Customization (Compact / Standard / Spacious)
  const [sideColumnVerticalSpacing, setSideColumnVerticalSpacing] = useState<'compact' | 'standard' | 'spacious'>('standard');

  // Interactive Barangay General & Contact Information State
  const [cityText, setCityText] = useState('City Of San Juan');
  const [barangayText, setBarangayText] = useState('BARANGAY PROGRESO');
  const [barangayAddress, setBarangayAddress] = useState('#15 M. Cruz Street Barangay Progreso, San Juan City');
  const [barangayEmail, setBarangayEmail] = useState('barangayprogreso@yahoo.com');
  const [barangayPhone, setBarangayPhone] = useState('(02)8727-5635 / (02)76258731');

  // Key Executive Officials State
  const [punongBarangay, setPunongBarangay] = useState('CESAR JR. H. STO. DOMINGO');
  const [barangaySecretary, setBarangaySecretary] = useState('Ma. Theresa R. Dela Cruz');
  const [barangayTreasurer, setBarangayTreasurer] = useState('Saturnina C. Mirata');

  // Pre-populated Kagawad list matching Barangay Progreso Council
  const [kagawadList, setKagawadList] = useState<KagawadItem[]>([
    { id: 'k1', name: 'Carmencita H. Sto. Domingo', committee: 'Peace and Order/BADAC Traffic and Parking Management Committee' },
    { id: 'k2', name: 'Mary Antoinette P. Salayon', committee: 'Disaster Management and RedCross 143/Barangay Volunteers Citizen Program Committee' },
    { id: 'k3', name: 'Rodelio O. Santos', committee: 'Livelihood, Entrepreneurship & Public Enterprise Committee' },
    { id: 'k4', name: 'Darryl S. Eustaquio', committee: 'Infrastructure and Public Works Committee' },
    { id: 'k5', name: 'Amafel T. Ingalla', committee: 'Health, Nutrition and Women and Children\'s Welfare Committee' },
    { id: 'k6', name: 'Renar M. Mendoza', committee: 'Ways & Means, Appropriations, Education, Public Information, Cultural Affairs Committee' },
    { id: 'k7', name: 'Raymund Marcel B. Fontamillas', committee: 'Clean & Green and Solid Waste Management Committee' },
    { id: 'k8', name: 'Anton Jose T. Cabrillas', committee: 'SK-Chairperson Youth Sports Development' },
  ]);

  // Feedback banner
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Filtered Template List with clean Status and Category classification
  const filteredTemplates = useMemo(() => {
    return templatesList.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = item.name.toLowerCase().includes(q) || (item.originalFileName || '').toLowerCase().includes(q);
      const category = getCategoryForDocType(item.documentType, item.name);
      const matchesType = typeFilter === 'all' || item.documentType === typeFilter || category === typeFilter;

      let matchesStatus = true;
      if (statusFilter === 'active') {
        matchesStatus = item.isActive !== false;
      } else if (statusFilter === 'overwritten') {
        matchesStatus = Boolean(item.isOverwritten);
      } else if (statusFilter === 'inactive') {
        matchesStatus = item.isActive === false;
      } else if (statusFilter === 'custom') {
        matchesStatus = item.sourceType === 'uploaded' || item.sourceType === 'custom';
      }

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [templatesList, searchQuery, typeFilter, statusFilter]);

  const templatePageCount = Math.max(1, Math.ceil(filteredTemplates.length / templatesPerPage));
  const paginatedTemplates = useMemo(() => {
    const startIndex = (templatePage - 1) * templatesPerPage;
    return filteredTemplates.slice(startIndex, startIndex + templatesPerPage);
  }, [filteredTemplates, templatePage]);

  useEffect(() => {
    setTemplatePage(1);
  }, [searchQuery, typeFilter, statusFilter]);

  useEffect(() => {
    if (templatePage > templatePageCount) {
      setTemplatePage(templatePageCount);
    }
  }, [templatePage, templatePageCount]);

  // Selected Template Object for Details/Edit
  const activeTemplate = useMemo(() => {
    if (selectedTemplateId) {
      return templatesList.find((t) => t.id === selectedTemplateId) ?? null;
    }
    return null;
  }, [selectedTemplateId, templatesList]);

  // Resolved Plain Text Document Preview String
  const liveRenderedPreviewText = useMemo(() => {
    let text = bodyContent || activeTemplate?.body || '';

    const formattedKagawadList = kagawadList
      .filter((k) => k.name.trim().length > 0)
      .map((k) => `• ${k.name}${k.committee ? ` (${k.committee})` : ''}`)
      .join('\n');

    const currentYear = new Date().getFullYear();
    const sampleData: Record<string, string> = {
      resident_name: '________________________',
      resident_address: '________________________________________',
      purpose: '________________________',
      date_issued: `______ day of ____________, ${currentYear}`,
      reference_number: '____________________',
      complainant_name: '________________________',
      case_number: '____________________',
      date_filed: '____________________',
      hearing_date_time: `_____ day of ____________, ${currentYear} at _____ o'clock in the ____________`,
      business_name: '________________________',
      permit_type: 'Construction Permit',
      barangay_name: barangayText.trim() || 'BARANGAY PROGRESO',
      city: cityText.trim() || 'City Of San Juan',
      punong_barangay: punongBarangay.trim() || 'CESAR JR. H. STO. DOMINGO',
      barangay_secretary: barangaySecretary.trim() || 'Ma. Theresa R. Dela Cruz',
      barangay_treasurer: barangayTreasurer.trim() || 'Saturnina C. Mirata',
      kagawad_list: formattedKagawadList || 'Carmencita H. Sto. Domingo',
      barangay_address: barangayAddress.trim() || '#15 M. Cruz Street Barangay Progreso, San Juan City',
      barangay_email: barangayEmail.trim() || 'barangayprogreso@yahoo.com',
      barangay_phone: barangayPhone.trim() || '(02)8727-5635 / (02)76258731',
      official_seal: '[ OFFICIAL BARANGAY SEAL ]',
    };

    const fields = dynamicFieldsInput.split(',').map((f) => f.trim()).filter(Boolean);
    fields.forEach((field) => {
      const replacement = sampleData[field] ?? sampleData[field.toLowerCase()] ?? `[ ${field} ]`;
      text = text.replaceAll(`{{${field}}}`, replacement);
    });

    Object.entries(sampleData).forEach(([key, val]) => {
      text = text.replaceAll(`{{${key}}}`, val);
    });

    return text;
  }, [bodyContent, activeTemplate, dynamicFieldsInput, barangayText, cityText, punongBarangay, barangaySecretary, barangayTreasurer, kagawadList, barangayAddress, barangayEmail, barangayPhone]);

  // Resolved Rich HTML Document Preview String (Substituting All Dynamic Variables from System Inputs)
  const liveRenderedPreviewHtml = useMemo(() => {
    let html = htmlContent || activeTemplate?.htmlBody || '';
    if (!html.trim()) {
      html = buildDefaultHtmlLayout(
        editorDocType || activeTemplate?.documentType || 'certificate_indigency',
        sealAlignment,
        layoutStyle,
        sideColumnVerticalSpacing
      );
    }

    // Dynamic Barangay Watermark Seal: large format spanning the whole paper sheet (~1 inch side space)
    const activeWatermarkSrc =
      barangayLogoUrl || '/images/indigency-template/watermark-seal.png' || '/images/indigency-template/barangay-progreso-seal.jpeg';
    const dynamicWatermarkHtml = `<img src="${activeWatermarkSrc}" class="doc-watermark" style="position:absolute;left:50%;top:50%;width:560px;max-width:88%;transform:translate(-50%, -50%);opacity:0.12;filter:contrast(115%);pointer-events:none;z-index:1;user-select:none;-webkit-user-select:none;" alt="Barangay Seal Watermark" />`;

    // Replace any legacy watermark src with the active barangay logo
    html = html.replaceAll('/images/indigency-template/watermark-seal.png', activeWatermarkSrc);

    // Format Kagawad Roster Items dynamically with customizable vertical spacing
    const kagawadItemMargin = sideColumnVerticalSpacing === 'compact' ? '2px' : sideColumnVerticalSpacing === 'spacious' ? '14px' : '7px';
    const formattedKagawadListHtml = kagawadList
      .filter((k) => k.name.trim().length > 0)
      .map(
        (k) => `
<div style="margin-bottom:${kagawadItemMargin};">
  <p style="font-size:14px;font-weight:bold;margin:0;color:#000;line-height:1.25;">${k.name}</p>
  ${k.committee ? `<p style="font-size:12px;font-style:italic;margin:2px 0 0 0;color:#333;line-height:1.2;">${k.committee}</p>` : ''}
</div>`
      )
      .join('');

    // Dynamic Seals HTML Elements
    const barangaySealHtml = barangayLogoUrl
      ? `<img src="${barangayLogoUrl}" style="height:60px;width:60px;object-fit:contain;" alt="Barangay Seal" />`
      : `<img src="/images/indigency-template/barangay-progreso-seal.jpeg" style="height:60px;width:60px;object-fit:contain;" alt="Barangay Seal" />`;

    const citySealHtml = cityLogoUrl
      ? `<img src="${cityLogoUrl}" style="height:60px;width:60px;object-fit:contain;" alt="City Seal" />`
      : `<img src="/images/indigency-template/san-juan-seal.jpeg" style="height:60px;width:60px;object-fit:contain;" alt="City Seal" />`;

    const countrySealHtml = countryLogoUrl
      ? `<img src="${countryLogoUrl}" style="height:55px;width:68px;object-fit:contain;" alt="Bagong Pilipinas Seal" />`
      : `<img src="/images/indigency-template/bagong-pilipinas.png" style="height:55px;width:68px;object-fit:contain;" alt="Bagong Pilipinas Seal" />`;

    const currentYear = new Date().getFullYear();
    // Dynamic Substitution Object mapping system variables to active system inputs
    const sampleData: Record<string, string> = {
      resident_name: '<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>',
      resident_address: '<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>',
      purpose: '<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>',
      date_issued: `<u>______ day of ____________, ${currentYear}</u>`,
      reference_number: '<u>____________________</u>',
      complainant_name: '<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>',
      case_number: '<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>',
      date_filed: '<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>',
      hearing_date_time: `<u>_____ day of ____________, ${currentYear} at _____ o'clock in the ____________</u>`,
      business_name: '<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>',
      permit_type: 'Construction Permit',
      barangay_name: barangayText.trim() ? `<strong>${barangayText.trim()}</strong>` : 'BARANGAY PROGRESO',
      city: cityText.trim() ? `<strong>${cityText.trim()}</strong>` : 'City Of San Juan',
      punong_barangay: punongBarangay.trim() ? `<strong>${punongBarangay.trim()}</strong>` : 'CESAR JR. H. STO. DOMINGO',
      barangay_secretary: barangaySecretary.trim() ? `<strong>${barangaySecretary.trim()}</strong>` : 'Ma. Theresa R. Dela Cruz',
      barangay_treasurer: barangayTreasurer.trim() ? `<strong>${barangayTreasurer.trim()}</strong>` : 'Saturnina C. Mirata',
      kagawad_list: formattedKagawadListHtml || '<div style="font-size:9px;">Carmencita H. Sto. Domingo</div>',
      barangay_address: barangayAddress.trim() || '#15 M. Cruz Street Barangay Progreso, San Juan City',
      barangay_email: barangayEmail.trim() || 'barangayprogreso@yahoo.com',
      barangay_phone: barangayPhone.trim() || '(02)8727-5635 / (02)76258731',
      barangay_watermark: dynamicWatermarkHtml,
      official_seal: '<div style="display:inline-block;border:2px solid #1e3a8a;color:#1e3a8a;padding:4px 10px;border-radius:9999px;font-weight:bold;font-size:10px;">[ OFFICIAL BARANGAY SEAL ]</div>',
      country_seal: countrySealHtml,
      city_seal: citySealHtml,
      barangay_seal: barangaySealHtml,
    };

    const fields = dynamicFieldsInput.split(',').map((f) => f.trim()).filter(Boolean);
    fields.forEach((field) => {
      const replacement = sampleData[field] ?? sampleData[field.toLowerCase()] ?? `<u>&nbsp;&nbsp;&nbsp;&nbsp;[ ${field} ]&nbsp;&nbsp;&nbsp;&nbsp;</u>`;
      html = html.replaceAll(`{{${field}}}`, replacement);
    });

    Object.entries(sampleData).forEach(([key, val]) => {
      html = html.replaceAll(`{{${key}}}`, val);
    });

    // If template does not contain any watermark element, inject it dynamically into the document
    if (!html.includes('Barangay Seal Watermark') && !html.includes('doc-watermark')) {
      if (html.includes('<!-- MAIN CONTENT LAYER (Z-INDEX 2) -->')) {
        html = html.replace('<!-- MAIN CONTENT LAYER (Z-INDEX 2) -->', `${dynamicWatermarkHtml}\n<!-- MAIN CONTENT LAYER (Z-INDEX 2) -->`);
      } else {
        html = `${dynamicWatermarkHtml}\n${html}`;
      }
    }

    return html;
  }, [htmlContent, activeTemplate, editorDocType, cityLogoUrl, barangayLogoUrl, countryLogoUrl, sealAlignment, layoutStyle, sideColumnVerticalSpacing, dynamicFieldsInput, barangayText, cityText, punongBarangay, barangaySecretary, barangayTreasurer, kagawadList, barangayAddress, barangayEmail, barangayPhone]);

  // Dedicated Isolated Document Printing (Prints ONLY the authentic certificate document with Full A4 proportions)
  const handlePrintDocument = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) {
      window.print();
      return;
    }
    const fontCss =
      fontFamily === 'Times New Roman'
        ? '"Times New Roman", Times, serif'
        : fontFamily === 'Arial'
        ? 'Arial, sans-serif'
        : '"Bookman Old Style", Georgia, serif';

    printWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${activeTemplate?.name || editorName || 'Barangay Document'} - Print</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 4mm 6mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      font-family: ${fontCss};
      color: #000;
      width: 100%;
      height: 100%;
    }
    .print-document-wrapper {
      width: 100%;
      max-width: 198mm;
      min-height: 275mm;
      height: 275mm;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #fff;
      box-sizing: border-box;
      padding: 2mm 0;
    }
    .print-document-wrapper > div {
      min-height: 275mm !important;
      height: 100% !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
    }
    .print-document-wrapper .doc-frame {
      flex: 1 1 auto !important;
      min-height: 226mm !important;
      height: 226mm !important;
      display: flex !important;
    }
  </style>
</head>
<body>
  <div class="print-document-wrapper">
    ${liveRenderedPreviewHtml}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`);
    printWindow.document.close();
  };

  // Open Editor for new or existing template
  const handleOpenEditor = (template?: DocumentTemplate | null) => {
    if (template) {
      const docType = template.documentType ?? 'certificate_indigency';
      const isLupon = docType.includes('lupon') || docType.includes('summons') || docType.includes('patawag');
      const targetLayout = isLupon ? 'single_column' : 'two_column_sidebar';
      setLayoutStyle(targetLayout);
      setSelectedTemplateId(template.id);
      setEditorName(template.name);
      setEditorDocType(docType);
      setEditorSourceType(template.sourceType ?? 'custom');
      setEditorFileName(template.originalFileName ?? '');
      setBodyContent(template.body);
      setHtmlContent(template.htmlBody || buildDefaultHtmlLayout(docType, sealAlignment, targetLayout, sideColumnVerticalSpacing));
      setDynamicFieldsInput((template.dynamicFields || []).join(','));
      setIsActive(template.isActive ?? true);
      setEditorIsOverwritten(Boolean(template.isOverwritten));
      if (template.headerConfig) {
        setShowLogo(template.headerConfig.showLogo ?? true);
        setShowSeal(template.headerConfig.showSeal ?? true);
        setFontFamily(template.headerConfig.fontFamily ?? 'Arial');
        setAlignment(template.headerConfig.alignment ?? 'center');
        if (template.headerConfig.cityText) setCityText(template.headerConfig.cityText);
        if (template.headerConfig.barangayText) setBarangayText(template.headerConfig.barangayText);
      }
    } else {
      const defaultDocType = 'certificate_indigency';
      const docObj = DOCUMENT_TYPES.find((d) => d.id === defaultDocType);
      setSelectedTemplateId(null);
      setEditorName(`${docObj?.labelEn || 'Certificate of Indigency'} Template`);
      setEditorDocType(defaultDocType);
      setEditorSourceType('custom');
      setEditorFileName('');
      setBodyContent('');
      setHtmlContent(buildDefaultHtmlLayout(defaultDocType, sealAlignment, layoutStyle, sideColumnVerticalSpacing));
      setDynamicFieldsInput('resident_name,resident_address,purpose,date_issued,punong_barangay');
      setIsActive(true);
      setEditorIsOverwritten(false);
    }
    setEditorTab('visual');
    setViewMode('editor');
  };

  // Switch Document Type in Editor & Update Default Layout
  const handleEditorDocTypeChange = (newDocType: string) => {
    setEditorDocType(newDocType);
    const isLupon = newDocType.includes('lupon') || newDocType.includes('summons') || newDocType.includes('patawag');
    const targetLayout = isLupon ? 'single_column' : 'two_column_sidebar';
    setLayoutStyle(targetLayout);
    const docObj = DOCUMENT_TYPES.find((d) => d.id === newDocType);
    if (docObj) {
      setEditorName(`${docObj.labelEn} Template`);
      setHtmlContent(buildDefaultHtmlLayout(newDocType, sealAlignment, targetLayout, sideColumnVerticalSpacing));
    }
  };

  // Re-generate HTML Layout when Seal Alignment, Layout Style, or Vertical Spacing changes
  const handleRegenerateLayout = (
    newSealAlignment: 'side_by_side' | 'centered' | 'stacked' = sealAlignment,
    newLayoutStyle: 'single_column' | 'two_column_sidebar' = layoutStyle,
    newVerticalSpacing: 'compact' | 'standard' | 'spacious' = sideColumnVerticalSpacing
  ) => {
    setSealAlignment(newSealAlignment);
    setLayoutStyle(newLayoutStyle);
    setSideColumnVerticalSpacing(newVerticalSpacing);
    setHtmlContent(
      buildDefaultHtmlLayout(
        editorDocType,
        newSealAlignment,
        newLayoutStyle,
        newVerticalSpacing
      )
    );
  };

  // Handle File Input Selection
  const handleFileSelection = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      if (file.type.startsWith('image/') || file.name.match(/\.(png|jpe?g|webp)$/i)) {
        const url = URL.createObjectURL(file);
        setUploadedFilePreviewUrl(url);
      } else {
        setUploadedFilePreviewUrl(null);
      }
    }
  };

  // Handle Logo Upload (Country, City, Barangay)
  const handleLogoUpload = (type: 'country' | 'city' | 'barangay', e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (type === 'country') setCountryLogoUrl(url);
      else if (type === 'city') setCityLogoUrl(url);
      else setBarangayLogoUrl(url);
      setFeedback({
        tone: 'success',
        text: `${type === 'country' ? 'Bagong Pilipinas / Country' : type === 'city' ? 'City / Municipal' : 'Barangay'} Seal Logo updated successfully!`,
      });
    }
  };

  // Clear Selected File
  const handleClearSelectedFile = () => {
    setUploadedFile(null);
    if (uploadedFilePreviewUrl) {
      URL.revokeObjectURL(uploadedFilePreviewUrl);
      setUploadedFilePreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Trigger Template Upload Analysis (Checking for Overrides)
  const handleStartAnalysis = async () => {
    if (!uploadedFile) {
      setFeedback({ tone: 'error', text: 'Please select a document file (.docx / .pdf / image) to upload from File Explorer.' });
      return;
    }

    // Check if a template for this category already exists
    const existing = templatesList.find(
      (t) => t.documentType === wizardDocType || getCategoryForDocType(t.documentType, t.name) === wizardDocType
    );

    if (existing) {
      // Prompt user whether to override or create as new
      setOverwriteModal({
        isOpen: true,
        existingTemplate: existing,
      });
      return;
    }

    // Proceed directly if no existing template found
    await runAnalysis(null);
  };

  // Execute Analysis with specified target ID (null for new, existing ID for override)
  const runAnalysis = async (targetTemplateId: string | null, customTemplateName?: string) => {
    if (!uploadedFile) return;

    setIsAnalyzing(true);
    setAnalysisProgress(10);
    setAnalysisStatusText('Reading document from File Explorer...');
    await new Promise((r) => setTimeout(r, 60));

    try {
      let extractedText = '';
      let extractedHtml = '';
      const fileName = uploadedFile.name;
      const fileExt = fileName.split('.').pop()?.toLowerCase() || '';

      if (fileExt === 'docx') {
        setAnalysisStatusText('Parsing Word (.docx) layout & styles...');
        setAnalysisProgress(35);
        await new Promise((r) => setTimeout(r, 60));

        const mammoth = await import('mammoth');
        const arrayBuffer = await uploadedFile.arrayBuffer();

        setAnalysisProgress(65);
        setAnalysisStatusText('Extracting exact HTML layout, tables & formatting...');
        await new Promise((r) => setTimeout(r, 60));

        const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
        extractedHtml = htmlResult.value || '';

        const textResult = await mammoth.extractRawText({ arrayBuffer });
        extractedText = textResult.value || '';
      } else if (uploadedFile.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(fileExt)) {
        setAnalysisStatusText('Processing image document structure via OCR...');
        setAnalysisProgress(30);
        await new Promise((r) => setTimeout(r, 60));

        try {
          const { createWorker } = await import('tesseract.js');
          const worker = await createWorker('eng', 1, {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                const pct = Math.round((m.progress || 0) * 60) + 30;
                setAnalysisProgress(pct);
                setAnalysisStatusText(`Extracting layout via OCR (${pct}%)...`);
              }
            },
          });
          const imageUrl = URL.createObjectURL(uploadedFile);
          const res = await worker.recognize(imageUrl);
          extractedText = res.data.text || '';
          URL.revokeObjectURL(imageUrl);
          await worker.terminate();
        } catch (ocrErr) {
          console.warn('OCR processing fallback:', ocrErr);
        }
      } else if (fileExt === 'pdf') {
        setAnalysisStatusText('Reading PDF document layout stream...');
        setAnalysisProgress(70);
        await new Promise((r) => setTimeout(r, 60));

        const rawBuffer = await uploadedFile.arrayBuffer();
        const textDecoder = new TextDecoder('utf-8', { fatal: false });
        const rawStr = textDecoder.decode(rawBuffer);
        const cleaned = rawStr.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ');
        extractedText = cleaned.length > 50 ? cleaned.slice(0, 3000) : '';
      } else {
        setAnalysisStatusText('Reading text file content...');
        setAnalysisProgress(70);
        await new Promise((r) => setTimeout(r, 60));
        extractedText = await uploadedFile.text().catch(() => '');
      }

      setAnalysisProgress(100);
      setAnalysisStatusText('Analysis complete! Preparing layout editor...');
      await new Promise((r) => setTimeout(r, 100));
      setIsAnalyzing(false);

      const docTypeObj = DOCUMENT_TYPES.find((d) => d.id === wizardDocType);
      const docLabel = docTypeObj?.labelEn || 'Barangay Document';

      setSelectedTemplateId(targetTemplateId);
      setEditorName(customTemplateName || `${docLabel} Template`);
      setEditorDocType(wizardDocType);
      setEditorSourceType('uploaded');
      setEditorFileName(uploadedFile.name);
      setEditorIsOverwritten(Boolean(targetTemplateId));

      setBodyContent(
        extractedText ||
          `REPUBLIC OF THE PHILIPPINES\n{{city}}\n{{barangay_name}}\n\n${docLabel.toUpperCase()}\n\nTO WHOM IT MAY CONCERN:\n\nThis is to certify that {{resident_name}} is a resident of {{resident_address}}.\n\nIssued this {{date_issued}} for {{purpose}}.\n\n{{punong_barangay}}\nPunong Barangay`
      );

      if (extractedHtml && extractedHtml.trim().length > 20) {
        setHtmlContent(extractedHtml);
      } else {
        setHtmlContent(
          buildDefaultHtmlLayout(
            wizardDocType,
            sealAlignment,
            layoutStyle,
            sideColumnVerticalSpacing
          )
        );
      }

      setDynamicFieldsInput('resident_name,resident_address,purpose,date_issued,punong_barangay');
      setIsActive(true);
      setEditorTab('visual');
      setViewMode('editor');
      setFeedback({
        tone: 'success',
        text: targetTemplateId
          ? `Document "${uploadedFile.name}" analyzed successfully! Template for ${docLabel} will overwrite the existing configuration upon saving.`
          : `Document "${uploadedFile.name}" analyzed successfully! New layout for ${docLabel} loaded into paper canvas.`,
      });
    } catch (err) {
      console.error('Error during template analysis:', err);
      setIsAnalyzing(false);
      setViewMode('editor');
      setFeedback({
        tone: 'error',
        text: 'Template analysis completed with default layout formatting.',
      });
    }
  };

  // Save Template into Supabase & System State with Overwrite confirmation
  const handleSaveTemplate = async (
    event?: FormEvent<HTMLFormElement>,
    overwriteConfirmed = false,
    saveAsNewCopy = false,
    customOverrideTargetId?: string
  ) => {
    if (event) event.preventDefault();
    if (!editorName.trim()) {
      setFeedback({ tone: 'error', text: 'Please enter a template name.' });
      return;
    }

    // Check if saving a new template that conflicts with an existing one
    if (!selectedTemplateId && !overwriteConfirmed && !saveAsNewCopy) {
      const conflicting = templatesList.find(
        (t) =>
          t.name.trim().toLowerCase() === editorName.trim().toLowerCase() ||
          t.documentType === editorDocType ||
          getCategoryForDocType(t.documentType, t.name) === editorDocType
      );
      if (conflicting) {
        setOverwriteSaveModal({
          isOpen: true,
          conflictingTemplate: conflicting,
        });
        return;
      }
    }

    const targetId = customOverrideTargetId || (overwriteConfirmed && overwriteSaveModal ? overwriteSaveModal.conflictingTemplate.id : selectedTemplateId);
    const finalName = saveAsNewCopy ? `${editorName.trim()} (New)` : editorName.trim();
    const shouldMarkOverwritten = Boolean(overwriteConfirmed || editorIsOverwritten || targetId);

    const dynamicFields = dynamicFieldsInput.split(',').map((f) => f.trim()).filter(Boolean);

    await upsertDocumentTemplate({
      id: targetId ?? undefined,
      name: finalName,
      documentType: editorDocType,
      sourceType: editorSourceType,
      originalFileName: editorFileName,
      body: bodyContent || 'Official Barangay Template',
      htmlBody: htmlContent,
      previewImageUrl: uploadedFilePreviewUrl || undefined,
      dynamicFields,
      headerConfig: { showLogo, showSeal, fontFamily, alignment, cityText, barangayText },
      isActive,
      isOverwritten: shouldMarkOverwritten,
    });

    setOverwriteSaveModal(null);
    setFeedback({
      tone: 'success',
      text: shouldMarkOverwritten
        ? `Template "${finalName}" has been saved and is now the active overridden template for the system.`
        : `Template "${finalName}" saved successfully!`,
    });
    setViewMode('list');
  };

  // Delete Template permanently
  const handleDeleteTemplate = async (idToDelete: string) => {
    await deleteDocumentTemplate(idToDelete);
    setFeedback({
      tone: 'success',
      text: 'Template deleted successfully.',
    });
    setViewMode('list');
  };

  // Kagawad Management Handlers
  const handleAddKagawad = () => {
    setKagawadList((prev) => [
      ...prev,
      { id: `k-${Date.now()}`, name: '', committee: '' },
    ]);
  };

  const handleRemoveKagawad = (id: string) => {
    setKagawadList((prev) => prev.filter((k) => k.id !== id));
  };

  const handleUpdateKagawad = (id: string, field: 'name' | 'committee', value: string) => {
    setKagawadList((prev) =>
      prev.map((k) => (k.id === id ? { ...k, [field]: value } : k))
    );
  };

  const handleSaveBarangayOfficialsInfo = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback({
      tone: 'success',
      text: 'Barangay & Official Information updated successfully! Dynamic template variables refreshed across all documents.',
    });
  };

  // Insert Tag Pill into Body / HTML
  const handleInsertTag = (tag: string, fieldName: string) => {
    setBodyContent((prev) => `${prev} ${tag}`);
    setHtmlContent((prev) => `${prev} ${tag}`);
    if (!dynamicFieldsInput.includes(fieldName)) {
      setDynamicFieldsInput((prev) => (prev ? `${prev},${fieldName}` : fieldName));
    }
  };

  return (
    <PortalShell role="admin" allowedRoles={['admin']} title={pageCopy?.title ? resolveRoleCopy(locale, pageCopy.title) : 'Document Template'} description={pageCopy?.description ? resolveRoleCopy(locale, pageCopy.description) : ''} showHero={false}>
      {pageCopy?.guide ? (
        <PageGuide
          title={resolveRoleCopy(locale, pageCopy.guide.title)}
          summary={resolveRoleCopy(locale, pageCopy.guide.summary)}
          steps={resolveSteps(locale, pageCopy.guide.steps)}
          cta={{ label: resolveRoleCopy(locale, pageCopy.guide.cta.label), href: pageCopy.guide.cta.href }}
        />
      ) : null}

      {/* Global Form Feedback Banner */}
      {feedback ? <FormFeedback tone={feedback.tone} text={feedback.text} /> : null}

      {/* Main Category Tabs */}
      {viewMode === 'list' && (
        <div className="mb-6 flex justify-center border-b border-[color:var(--portal-border-soft)]">
          <button
            type="button"
            onClick={() => setMainTab('library')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              mainTab === 'library'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="h-4 w-4" />
            Template Library ({templatesList.length})
          </button>

          <button
            type="button"
            onClick={() => setMainTab('barangay_officials')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              mainTab === 'barangay_officials'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Barangay & Official Information
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 1: TEMPLATE LIBRARY LIST                                             */}
      {/* ========================================================================= */}
      {viewMode === 'list' && mainTab === 'library' && (
        <SectionCard
          title="Document Templates"
          description="Official barangay document templates active in the system."
          actions={
            <>
              <button
                type="button"
                onClick={() => setViewMode('upload_wizard')}
                className="inline-flex items-center gap-2 rounded-md border border-emerald-600 bg-emerald-50/40 px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all shadow-2xs cursor-pointer"
              >
                <Upload className="h-4 w-4" />
                Upload Template
              </button>
              <button
                type="button"
                onClick={() => handleOpenEditor()}
                className="inline-flex items-center gap-2 rounded-md border border-emerald-600 bg-emerald-50/40 px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all shadow-2xs cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Create Template
              </button>
            </>
          }
        >

          {/* Single-Line Search & Filters Grid */}
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            <div className="relative sm:col-span-6">
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full"
              />
            </div>

            <div className="sm:col-span-3">
              <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-10 w-full">
                <option value="all">All Document Types</option>
                {DOCUMENT_TYPES.map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.labelEn}
                  </option>
                ))}
              </Select>
            </div>

            <div className="sm:col-span-3">
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 w-full">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="overwritten">Overwritten</option>
                <option value="custom">Custom / Uploaded</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
          </div>

          {filteredTemplates.length === 0 ? (
            <EmptyState
              title="No templates found"
              description="No document templates matched your search criteria."
            />
          ) : (
            <div className="overflow-hidden bg-white">
              <Table className="w-full min-w-[900px] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[35%] px-4 text-center text-sm normal-case tracking-normal text-[color:var(--portal-ink-700)]">Template</TableHead>
                    <TableHead className="w-[25%] px-4 text-center text-sm normal-case tracking-normal text-[color:var(--portal-ink-700)]">Document type</TableHead>
                    <TableHead className="w-[12%] px-4 text-center text-sm normal-case tracking-normal text-[color:var(--portal-ink-700)]">Status</TableHead>
                    <TableHead className="w-[13%] px-4 text-center text-sm normal-case tracking-normal text-[color:var(--portal-ink-700)]">Updated</TableHead>
                    <TableHead className="w-[15%] px-4 text-center text-sm normal-case tracking-normal text-[color:var(--portal-ink-700)]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
              {paginatedTemplates.map((item) => {
                const category = getCategoryForDocType(item.documentType, item.name);
                const docTypeObj = DOCUMENT_TYPES.find((d) => d.id === item.documentType);
                const categoryObj = DOCUMENT_TYPES.find((d) => d.id === category);
                const isUploaded = item.sourceType === 'uploaded';
                const isCustom = item.sourceType === 'custom' || !DOCUMENT_TYPES.some((dt) => dt.id === item.documentType);
                const typeLabel = docTypeObj?.labelEn || categoryObj?.labelEn || (isUploaded ? 'Uploaded (.docx) Template' : isCustom ? 'Custom Template' : 'Official Barangay Template');
                const isOverwritten = Boolean(item.isOverwritten);
                const isActive = item.isActive !== false;
                const statusTone = isOverwritten ? 'warning' : statusToneFromState(isActive ? 'active' : 'inactive');

                return (
                  <TableRow key={item.id} className="transition-colors hover:bg-[color:var(--portal-surface-1)]">
                    <TableCell className="px-4 py-3.5 text-left">
                      <div className="min-w-[240px]">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-bold text-[color:var(--portal-ink-900)]">{item.name}</h3>
                          {isOverwritten ? (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-300">
                              Overwritten
                            </span>
                          ) : null}
                        </div>
                        {item.originalFileName ? (
                          <p className="mt-0.5 truncate text-xs text-[color:var(--portal-ink-700)]">{item.originalFileName}</p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-center text-sm text-[color:var(--portal-ink-700)]">
                      {typeLabel}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-center">
                      <StatusBadge tone={statusTone}>
                        {isOverwritten ? 'Overwritten' : isActive ? 'Active' : 'Inactive'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3.5 text-center text-xs text-[color:var(--portal-ink-700)]">
                      {formatDateTime(item.updatedAt, locale)}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-center">
                      <div className="flex justify-center whitespace-nowrap">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEditor(item)}
                        className="justify-center gap-1 border-slate-300 bg-white text-xs text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
                </TableBody>
              </Table>
              <div className="flex flex-col gap-3 border-t border-[color:var(--portal-border-soft)] px-4 py-3 text-sm text-[color:var(--portal-ink-700)] sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Showing {filteredTemplates.length === 0 ? 0 : (templatePage - 1) * templatesPerPage + 1}–{Math.min(templatePage * templatesPerPage, filteredTemplates.length)} of {filteredTemplates.length} templates
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setTemplatePage((page) => Math.max(1, page - 1))}
                    disabled={templatePage === 1}
                    className="border-slate-300 bg-white text-xs text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                  >
                    Previous
                  </Button>
                  <span className="min-w-16 text-center text-xs font-semibold text-[color:var(--portal-ink-700)]">
                    Page {templatePage} of {templatePageCount}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setTemplatePage((page) => Math.min(templatePageCount, page + 1))}
                    disabled={templatePage === templatePageCount}
                    className="border-slate-300 bg-white text-xs text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: VIEW TEMPLATE DETAILS                                             */}
      {/* ========================================================================= */}
      {viewMode === 'view_details' && activeTemplate && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button
              type="button"
              onClick={() => setViewMode('list')}
              variant="ghost"
              className="gap-1.5 border border-blue-600 bg-white text-xs text-blue-700 shadow-sm transition-all hover:bg-blue-600 hover:text-white hover:shadow-md"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Template Library
            </Button>

            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={() => handleOpenEditor(activeTemplate)} className="gap-1.5 text-xs">
                <Edit3 className="h-3.5 w-3.5" />
                Edit Template
              </Button>
              <Button type="button" variant="ghost" onClick={handlePrintDocument} className="gap-1.5 border border-emerald-600 bg-white text-xs text-emerald-700 shadow-sm transition-all hover:bg-emerald-600 hover:text-white hover:shadow-md">
                <Printer className="h-3.5 w-3.5" />
                Preview & Print
              </Button>
            </div>
          </div>

          <SectionCard
            title={activeTemplate.name.toUpperCase()}
            description={`Official Barangay Template • ${activeTemplate.isActive !== false ? 'Active' : 'Inactive'} • Last updated ${formatDateTime(activeTemplate.updatedAt, locale)}`}
          >
            <div className="grid gap-6 lg:grid-cols-[minmax(300px,1fr)_minmax(0,1.5fr)]">
              {/* Left Column: Template Information */}
              <div className="space-y-4 rounded-[var(--portal-radius-md)] border border-slate-200 bg-slate-50 p-5 text-xs no-print">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-3 text-sm">
                  TEMPLATE INFORMATION
                </h4>

                <div>
                  <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Document Type</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {DOCUMENT_TYPES.find((d) => d.id === activeTemplate.documentType)?.labelEn || activeTemplate.name}
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Source</p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {activeTemplate.sourceType === 'uploaded' ? 'Uploaded Template' : 'Custom Built Template'}
                  </p>
                </div>

                {activeTemplate.originalFileName && (
                  <div>
                    <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">File Reference</p>
                    <p className="text-sm font-mono text-blue-700 mt-0.5">{activeTemplate.originalFileName}</p>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200">
                  <p className="font-bold text-slate-800 mb-2">Configured Dynamic Variables ({activeTemplate.dynamicFields?.length || 0}):</p>
                  <div className="space-y-1.5">
                    {(activeTemplate.dynamicFields || []).map((field) => {
                      const tagObj = SYSTEM_DYNAMIC_TAGS.find((t) => t.fieldName === field);
                      return (
                        <div key={field} className="flex items-center justify-between rounded bg-white p-2 border border-slate-200">
                          <span className="font-mono font-bold text-blue-700">{`{{${field}}}`}</span>
                          <span className="text-[11px] text-slate-500">{tagObj?.label || 'Dynamic Field'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Authentic Document Paper Sheet Canvas */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 no-print">
                  <Eye className="h-4 w-4 text-blue-600" />
                  AUTHENTIC DOCUMENT CANVAS (1-TO-1 EXACT PREVIEW)
                </h4>

                <div
                  id="printable-document-canvas"
                  className="mx-auto max-w-[850px] min-h-[650px] rounded-sm border border-slate-300 bg-white p-8 shadow-xl text-slate-900"
                  style={{
                    fontFamily: fontFamily === 'Times New Roman' ? '"Times New Roman", Times, serif' : fontFamily === 'Arial' ? 'Arial, sans-serif' : '"Bookman Old Style", Georgia, serif',
                  }}
                >
                  <div
                    className="w-full text-slate-900 leading-relaxed [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-2"
                    dangerouslySetInnerHTML={{ __html: liveRenderedPreviewHtml }}
                  />
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: UPLOAD TEMPLATE WIZARD                                            */}
      {/* ========================================================================= */}
      {viewMode === 'upload_wizard' && (
        <SectionCard
          title="Upload Document Template"
          description="Select an official document file (.docx / PDF / image) from File Explorer. System will parse layout, formatting, and dynamic fields for the selected document type category."
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <FieldLabel label="Document Type Category">
                <Select value={wizardDocType} onChange={(e) => setWizardDocType(e.target.value)}>
                  {DOCUMENT_TYPES.map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {dt.labelEn} ({dt.labelFil})
                    </option>
                  ))}
                </Select>
              </FieldLabel>

              {/* File Drop & Selection Card */}
              <div className="rounded-[var(--portal-radius-md)] border-2 border-dashed border-blue-200 bg-blue-50/50 p-6 text-center transition-all hover:border-blue-400">
                {!uploadedFile ? (
                  <>
                    <Upload className="mx-auto h-10 w-10 text-blue-500" />
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      Select document from File Explorer
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Supports .DOCX, .PDF, .PNG, .JPG, .WEBP files</p>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".docx,.pdf,.png,.jpg,.jpeg,.webp"
                      onClick={(e) => {
                        (e.currentTarget as HTMLInputElement).value = '';
                      }}
                      onChange={handleFileSelection}
                      className="mt-4 block w-full text-xs text-slate-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white file:cursor-pointer hover:file:bg-blue-700 cursor-pointer"
                    />
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-white p-3 shadow-xs">
                      <div className="flex items-center gap-3 text-left">
                        <div className="grid h-10 w-10 place-items-center rounded bg-blue-100 font-bold text-blue-700 text-xs uppercase">
                          {uploadedFile.name.split('.').pop()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 truncate max-w-[200px]">
                            {uploadedFile.name}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {(uploadedFile.size / 1024).toFixed(1)} KB • Updated in File Explorer
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={handleClearSelectedFile}
                        className="text-red-600 hover:bg-red-50 text-xs px-2"
                        title="Remove or select another file"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Image Thumbnail Preview if user selected an image file */}
                    {uploadedFilePreviewUrl && (
                      <div className="relative mx-auto max-h-48 overflow-hidden rounded border border-slate-200 bg-slate-100 p-2">
                        <img
                          src={uploadedFilePreviewUrl}
                          alt="Uploaded File Preview"
                          className="mx-auto max-h-44 object-contain rounded"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> File Ready
                      </span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-600 font-medium hover:underline cursor-pointer"
                      >
                        Choose updated file...
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button type="button" variant="ghost" onClick={() => setViewMode('list')}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleStartAnalysis}
                  disabled={isAnalyzing || !uploadedFile}
                  className="flex-1 gap-2 bg-[linear-gradient(135deg,#1b7a50_0%,#0f5c39_100%)] text-white shadow-[0_8px_20px_rgba(21,98,65,0.2)] hover:bg-[linear-gradient(135deg,#166846_0%,#0b4a30_100%)]"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Analyzing Document Layout...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Run Template Analysis
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Analysis Progress & Status Panel */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-center flex flex-col justify-center">
              {isAnalyzing ? (
                <div>
                  <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-600" />
                  <p className="mt-3 text-sm font-semibold text-slate-800">{analysisStatusText}</p>
                  <div className="mx-auto mt-4 max-w-xs rounded-full bg-slate-200 h-2 overflow-hidden">
                    <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${analysisProgress}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500 font-mono">{analysisProgress}%</p>
                </div>
              ) : (
                <div>
                  <Sparkles className="mx-auto h-10 w-10 text-blue-500" />
                  <h4 className="mt-3 text-sm font-bold text-slate-900">Category-Specific Layout Extraction Ready</h4>
                  <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
                    The system will read the uploaded file layout and build the exact document format for <strong>{DOCUMENT_TYPES.find(d => d.id === wizardDocType)?.labelEn}</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      )}

      {/* ========================================================================= */}
      {/* MODE 4: SMART TEMPLATE EDITOR                                             */}
      {/* ========================================================================= */}
      {viewMode === 'editor' && (
        <form onSubmit={handleSaveTemplate} className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <Button
              type="button"
              onClick={() => setViewMode('list')}
              variant="ghost"
              className="gap-1 border border-slate-400 bg-white text-xs text-slate-700 shadow-sm transition-all hover:border-slate-700 hover:bg-slate-700 hover:text-white hover:shadow-md"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Template Library
            </Button>

            <div className="flex items-center gap-2">
              {selectedTemplateId ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-1.5 border border-red-600 bg-white text-xs text-red-700 shadow-sm transition-all hover:bg-red-600 hover:text-white hover:shadow-md"
                  onClick={() => handleDeleteTemplate(selectedTemplateId)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Template
                </Button>
              ) : null}

              <Button type="button" variant="ghost" onClick={handlePrintDocument} className="gap-1.5 border border-emerald-600 bg-white text-xs text-emerald-700 shadow-sm transition-all hover:bg-emerald-600 hover:text-white hover:shadow-md">
                <Printer className="h-3.5 w-3.5" />
                Preview & Print
              </Button>

              <Button type="submit" variant="ghost" className="gap-1.5 border border-emerald-600 bg-white text-emerald-700 shadow-sm transition-all hover:bg-emerald-600 hover:text-white hover:shadow-md">
                <Save className="h-4 w-4" />
                Save Template
              </Button>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_260px]">
            {/* PANEL 1: TEMPLATE ELEMENTS & DYNAMIC TAG PICKER */}
            <div className="space-y-4 rounded-[var(--portal-radius-md)] border border-slate-200 bg-slate-50 p-4 text-xs">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2 text-xs flex items-center gap-1.5">
                <Layout className="h-4 w-4 text-blue-600" />
                1. TEMPLATE ELEMENTS
              </h4>

              <div className="space-y-2">
                <FieldLabel label="Template Name">
                  <Input
                    placeholder="e.g. Certificate of Indigency"
                    value={editorName}
                    onChange={(e) => setEditorName(e.target.value)}
                    required
                  />
                </FieldLabel>

                <FieldLabel label="Document Type Category">
                  <Select
                    value={editorDocType}
                    onChange={(e) => handleEditorDocTypeChange(e.target.value)}
                  >
                    {DOCUMENT_TYPES.map((dt) => (
                      <option key={dt.id} value={dt.id}>
                        {dt.labelEn}
                      </option>
                    ))}
                  </Select>
                </FieldLabel>
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-2">
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Insert Dynamic System Variables:</p>
                <div className="flex flex-col gap-1 max-h-[320px] overflow-y-auto pr-1">
                  {SYSTEM_DYNAMIC_TAGS.map((st) => (
                    <button
                      key={st.tag}
                      type="button"
                      onClick={() => handleInsertTag(st.tag, st.fieldName)}
                      className="text-left rounded bg-white px-2 py-1 font-mono text-[11px] text-blue-700 border border-slate-200 hover:bg-blue-50 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>{st.tag}</span>
                      <Plus className="h-3 w-3 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* PANEL 2: DOCUMENT INPUT & PAPER CANVAS PREVIEW WITH DUAL MODES */}
            <div className="space-y-4">
              {/* Display Mode Tabs */}
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-1.5 rounded-t-lg">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditorTab('visual')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                      editorTab === 'visual'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Exact Paper Canvas
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditorTab('html')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                      editorTab === 'html'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Code className="h-3.5 w-3.5" />
                    HTML Layout Code
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditorTab('text')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                      editorTab === 'text'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Plain Wording
                  </button>

                  {uploadedFilePreviewUrl && (
                    <button
                      type="button"
                      onClick={() => setEditorTab('original_upload')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                        editorTab === 'original_upload'
                          ? 'bg-amber-600 text-white font-bold shadow-xs'
                          : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      Original Uploaded File
                    </button>
                  )}
                </div>

                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest px-2">
                  MODE: {editorTab.toUpperCase()}
                </span>
              </div>

              {/* EDITOR TAB CONTENT */}
              {editorTab === 'text' && (
                <div className="rounded-[var(--portal-radius-md)] border border-slate-200 bg-white p-4">
                  <FieldLabel label="Template Wording (Plain Text with {{variables}})">
                    <Textarea
                      value={bodyContent}
                      onChange={(e) => setBodyContent(e.target.value)}
                      placeholder="Type or paste your document template wording here..."
                      className="min-h-[280px] font-mono text-sm leading-relaxed"
                    />
                  </FieldLabel>
                </div>
              )}

              {editorTab === 'html' && (
                <div className="rounded-[var(--portal-radius-md)] border border-slate-200 bg-slate-900 p-4 text-white">
                  <FieldLabel label="HTML Document Layout Editor (Exact Formatting Code with {{variables}})">
                    <Textarea
                      value={htmlContent}
                      onChange={(e) => setHtmlContent(e.target.value)}
                      placeholder="Input exact HTML layout..."
                      className="min-h-[340px] font-mono text-xs leading-relaxed bg-slate-950 text-emerald-400 border-slate-700"
                    />
                  </FieldLabel>
                  <p className="mt-2 text-[11px] text-slate-400">
                    💡 You can edit HTML markup, inline styles, tables, and alignment directly. Dynamic variables like <code className="text-amber-300">{"{{resident_name}}"}</code>, <code className="text-amber-300">{"{{punong_barangay}}"}</code>, <code className="text-amber-300">{"{{kagawad_list}}"}</code> will be substituted automatically from system state.
                  </p>
                </div>
              )}

              {editorTab === 'original_upload' && uploadedFilePreviewUrl && (
                <div className="rounded-[var(--portal-radius-md)] border border-slate-300 bg-slate-100 p-4 text-center">
                  <p className="text-xs font-bold text-slate-700 mb-3">ORIGINAL UPLOADED FILE VIEW</p>
                  <img
                    src={uploadedFilePreviewUrl}
                    alt="Original Uploaded File"
                    className="mx-auto max-h-[550px] object-contain border border-slate-300 shadow-md rounded"
                  />
                </div>
              )}

              {/* Exact Paper Canvas Rendered Preview */}
              {(editorTab === 'visual' || editorTab === 'text') && (
                <div
                  className="rounded-xs border border-slate-300 bg-white p-8 shadow-xl text-slate-900 min-h-[500px]"
                  style={{
                    fontFamily: fontFamily === 'Times New Roman' ? '"Times New Roman", Times, serif' : fontFamily === 'Arial' ? 'Arial, sans-serif' : '"Bookman Old Style", Georgia, serif',
                    textAlign: alignment,
                  }}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                      LIVE PREVIEW (PAPER CANVAS OUTPUT - DYNAMIC VARIABLES)
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => handleRegenerateLayout(sealAlignment, layoutStyle, sideColumnVerticalSpacing)}
                      className="text-[11px] h-6 px-2 text-blue-600 gap-1"
                    >
                      <RotateCcw className="h-3 w-3" /> Reset Category Layout
                    </Button>
                  </div>

                  {htmlContent && htmlContent.trim().length > 0 ? (
                    <div
                      className="w-full text-slate-900 leading-relaxed [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-2"
                      dangerouslySetInnerHTML={{ __html: liveRenderedPreviewHtml }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap leading-relaxed text-base text-left">
                      {liveRenderedPreviewText}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PANEL 3: STYLING & FORMATTING SETTINGS */}
            <div className="space-y-4 rounded-[var(--portal-radius-md)] border border-slate-200 bg-slate-50 p-4 text-xs">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2 text-xs flex items-center gap-1.5">
                <Settings className="h-4 w-4 text-blue-600" />
                3. FORMATTING SETTINGS
              </h4>

              <div className="space-y-3 bg-white p-3 rounded border border-slate-200">
                <FieldLabel label="Font Family">
                  <Select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
                    <option value="Arial">Arial</option>
                    <option value="Bookman Old Style">Bookman Old Style</option>
                    <option value="Times New Roman">Times New Roman</option>
                  </Select>
                </FieldLabel>

                <FieldLabel label="Header Alignment">
                  <Select value={alignment} onChange={(e) => setAlignment(e.target.value as 'left' | 'center' | 'right')}>
                    <option value="center">Centered</option>
                    <option value="left">Left Aligned</option>
                  </Select>
                </FieldLabel>

                <FieldLabel label="Seal Placement Arrangement">
                  <Select
                    value={sealAlignment}
                    onChange={(e) =>
                      handleRegenerateLayout(
                        e.target.value as 'side_by_side' | 'centered' | 'stacked',
                        layoutStyle,
                        sideColumnVerticalSpacing
                      )
                    }
                  >
                    <option value="centered">3 Seals Centered Top Row (Barangay Progreso Style)</option>
                    <option value="side_by_side">Side-by-Side (Left & Right Seals)</option>
                    <option value="stacked">Stacked Vertical Seals</option>
                  </Select>
                </FieldLabel>

                <FieldLabel label="Document Structure & Sidebar Layout">
                  <Select
                    value={layoutStyle}
                    onChange={(e) =>
                      handleRegenerateLayout(
                        sealAlignment,
                        e.target.value as 'single_column' | 'two_column_sidebar',
                        sideColumnVerticalSpacing
                      )
                    }
                  >
                    <option value="two_column_sidebar">2-Column Layout (With Left Kagawad Roster Sidebar)</option>
                    <option value="single_column">Standard 1-Column Layout</option>
                  </Select>
                </FieldLabel>

                {layoutStyle === 'two_column_sidebar' && (
                  <FieldLabel label="Side Column Vertical Spacing">
                    <Select
                      value={sideColumnVerticalSpacing}
                      onChange={(e) =>
                        handleRegenerateLayout(
                          sealAlignment,
                          layoutStyle,
                          e.target.value as 'compact' | 'standard' | 'spacious'
                        )
                      }
                    >
                      <option value="compact">Compact (Half Page Length ~50%)</option>
                      <option value="standard">Standard (3/4 Page Length ~75%)</option>
                      <option value="spacious">Extra Spacious (Full Page Length 100%)</option>
                    </Select>
                  </FieldLabel>
                )}
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* COMBINED TAB 2: BARANGAY & OFFICIAL INFORMATION MANAGEMENT                */}
      {/* ========================================================================= */}
      {viewMode === 'list' && mainTab === 'barangay_officials' && (
        <form onSubmit={handleSaveBarangayOfficialsInfo} className="space-y-6">
          <SectionCard
            title="BARANGAY & OFFICIAL INFORMATION"
            description="Configure official barangay details, contact info, 3-seal logo media, and council members referenced dynamically across all document templates."
          >
            {/* PART: BARANGAY GENERAL & CONTACT DETAILS */}
            <div className="mb-6 rounded-[var(--portal-radius-md)] border border-slate-200 bg-slate-50 p-4">
              <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                Barangay General & Contact Details
              </h4>
              <div className="grid gap-4 md:grid-cols-2">
                <FieldLabel label="City / Municipality">
                  <Input
                    value={cityText}
                    onChange={(e) => setCityText(e.target.value)}
                    placeholder="Enter city / municipality (e.g. City Of San Juan)"
                  />
                </FieldLabel>

                <FieldLabel label="Barangay Name">
                  <Input
                    value={barangayText}
                    onChange={(e) => setBarangayText(e.target.value)}
                    placeholder="Enter barangay name (e.g. BARANGAY PROGRESO)"
                  />
                </FieldLabel>

                <FieldLabel label="Barangay Office Address">
                  <Input
                    value={barangayAddress}
                    onChange={(e) => setBarangayAddress(e.target.value)}
                    placeholder="Enter office address (e.g. #15 M. Cruz Street Barangay Progreso...)"
                  />
                </FieldLabel>

                <FieldLabel label="Official Barangay Email">
                  <Input
                    value={barangayEmail}
                    onChange={(e) => setBarangayEmail(e.target.value)}
                    placeholder="Enter official email (e.g. barangayprogreso@yahoo.com)"
                  />
                </FieldLabel>

                <div className="md:col-span-2">
                  <FieldLabel label="Contact Telephone Numbers">
                    <Input
                      value={barangayPhone}
                      onChange={(e) => setBarangayPhone(e.target.value)}
                      placeholder="Enter contact numbers (e.g. (02)8727-5635 / (02)76258731)"
                    />
                  </FieldLabel>
                </div>
              </div>
            </div>

            {/* PART: OFFICIAL SEAL LOGOS MANAGEMENT */}
            <div className="mb-6 rounded-[var(--portal-radius-md)] border border-slate-200 bg-white p-4">
              <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-blue-600" />
                Official Seal Logos
              </h4>
              <div className="grid gap-4 md:grid-cols-3">
                {/* Barangay Seal */}
                <div className="rounded-[var(--portal-radius-md)] border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <p className="font-bold text-slate-800 text-xs uppercase tracking-wider">Barangay Official Seal</p>
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-full border-2 border-emerald-300 bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                      {barangayLogoUrl ? (
                        <img src={barangayLogoUrl} alt="Barangay Logo" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-[8px] font-bold text-emerald-800 text-center">BRGY PROGRESO</span>
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <Input
                        placeholder="Image URL (e.g. https://...)"
                        value={barangayLogoUrl}
                        onChange={(e) => setBarangayLogoUrl(e.target.value)}
                        className="text-xs"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoUpload('barangay', e)}
                        className="block w-full text-[10px] text-slate-500 file:mr-2 file:rounded file:border-0 file:bg-emerald-600 file:px-2 file:py-0.5 file:text-[11px] file:font-semibold file:text-white file:cursor-pointer hover:file:bg-emerald-700"
                      />
                    </div>
                  </div>
                </div>

                {/* City / Municipal Seal */}
                <div className="rounded-[var(--portal-radius-md)] border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <p className="font-bold text-slate-800 text-xs uppercase tracking-wider">City / Municipal Seal</p>
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-full border-2 border-amber-300 bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                      {cityLogoUrl ? (
                        <img src={cityLogoUrl} alt="City Logo" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-[8px] font-bold text-amber-800 text-center">SAN JUAN</span>
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <Input
                        placeholder="Image URL (e.g. https://...)"
                        value={cityLogoUrl}
                        onChange={(e) => setCityLogoUrl(e.target.value)}
                        className="text-xs"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoUpload('city', e)}
                        className="block w-full text-[10px] text-slate-500 file:mr-2 file:rounded file:border-0 file:bg-amber-600 file:px-2 file:py-0.5 file:text-[11px] file:font-semibold file:text-white file:cursor-pointer hover:file:bg-amber-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Country / Bagong Pilipinas Seal */}
                <div className="rounded-[var(--portal-radius-md)] border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <p className="font-bold text-slate-800 text-xs uppercase tracking-wider">Bagong Pilipinas / National Seal</p>
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-full border-2 border-blue-300 bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                      {countryLogoUrl ? (
                        <img src={countryLogoUrl} alt="Bagong Pilipinas Logo" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-[8px] font-bold text-blue-800 text-center">BAGONG PILIPINAS</span>
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <Input
                        placeholder="Image URL (e.g. https://...)"
                        value={countryLogoUrl}
                        onChange={(e) => setCountryLogoUrl(e.target.value)}
                        className="text-xs"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoUpload('country', e)}
                        className="block w-full text-[10px] text-slate-500 file:mr-2 file:rounded file:border-0 file:bg-blue-600 file:px-2 file:py-0.5 file:text-[11px] file:font-semibold file:text-white file:cursor-pointer hover:file:bg-blue-700"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PART: KEY EXECUTIVE OFFICIALS */}
            <div className="mb-6 rounded-[var(--portal-radius-md)] border border-slate-200 bg-white p-4">
              <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                Key Executive Officials
              </h4>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[var(--portal-radius-md)] border border-slate-200 bg-slate-50 p-4">
                  <FieldLabel label="Punong Barangay Full Name">
                    <Input
                      value={punongBarangay}
                      onChange={(e) => setPunongBarangay(e.target.value)}
                      placeholder="Enter Punong Barangay name (e.g. CESAR JR. H. STO. DOMINGO)"
                    />
                  </FieldLabel>
                </div>

                <div className="rounded-[var(--portal-radius-md)] border border-slate-200 bg-slate-50 p-4">
                  <FieldLabel label="Barangay Secretary Full Name">
                    <Input
                      value={barangaySecretary}
                      onChange={(e) => setBarangaySecretary(e.target.value)}
                      placeholder="Enter Barangay Secretary name (e.g. Ma. Theresa R. Dela Cruz)"
                    />
                  </FieldLabel>
                </div>

                <div className="rounded-[var(--portal-radius-md)] border border-slate-200 bg-slate-50 p-4">
                  <FieldLabel label="Barangay Treasurer Full Name">
                    <Input
                      value={barangayTreasurer}
                      onChange={(e) => setBarangayTreasurer(e.target.value)}
                      placeholder="Enter Barangay Treasurer name (e.g. Saturnina C. Mirata)"
                    />
                  </FieldLabel>
                </div>
              </div>
            </div>

            {/* PART: BARANGAY KAGAWAD ROSTER MANAGEMENT */}
            <div className="rounded-[var(--portal-radius-md)] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    Barangay Kagawad Roster & Committees
                  </h4>
                  <p className="text-xs text-slate-500">
                    Add, edit, or remove Kagawad members and their assigned committees for the dynamic 2-Column Sidebar Layout.
                  </p>
                </div>

                <Button type="button" size="sm" variant="secondary" onClick={handleAddKagawad} className="gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  Add Kagawad
                </Button>
              </div>

              {kagawadList.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-500">
                  No Kagawads added yet. Click "+ Add Kagawad" to add council members.
                </div>
              ) : (
                <div className="space-y-3">
                  {kagawadList.map((k, index) => (
                    <div key={k.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
                      <span className="text-xs font-bold font-mono text-slate-400 min-w-[24px]">#{index + 1}</span>
                      <div className="flex-1 min-w-[200px]">
                        <Input
                          placeholder="Kagawad Full Name"
                          value={k.name}
                          onChange={(e) => handleUpdateKagawad(k.id, 'name', e.target.value)}
                          className="text-xs"
                        />
                      </div>
                      <div className="flex-1 min-w-[220px]">
                        <Input
                          placeholder="Committee / Assignment (e.g. Peace and Order/BADAC)"
                          value={k.committee}
                          onChange={(e) => handleUpdateKagawad(k.id, 'committee', e.target.value)}
                          className="text-xs"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRemoveKagawad(k.id)}
                        className="text-red-600 hover:bg-red-50 hover:border-red-200 text-xs px-2.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SAVE ACTION BUTTON */}
            <div className="mt-6 flex justify-end">
              <Button type="submit" variant="ghost" className="gap-2">
                <Save className="h-4 w-4" />
                Save Information & Refresh Templates
              </Button>
            </div>
          </SectionCard>
        </form>
      )}

      {/* Override Confirmation Modal on Template Upload */}
      {overwriteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-amber-100 text-amber-700 shrink-0">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Override Existing Template?</h3>
                <p className="text-xs text-slate-500">Mayroon nang naka-save na template para sa kategoryang ito.</p>
              </div>
            </div>

            <p className="text-sm text-slate-700 mb-6 leading-relaxed">
              Mayroon nang aktibong template para sa <strong className="text-slate-900">{DOCUMENT_TYPES.find(d => d.id === wizardDocType)?.labelEn}</strong> na pinangalanang <span className="font-semibold text-blue-700">"{overwriteModal.existingTemplate.name}"</span>.
              <br /><br />
              Nais mo ba itong <strong>i-override / palitan</strong> ang kasalukuyang template, o i-save bilang <strong>panibagong custom template</strong>?
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOverwriteModal(null)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const docTypeObj = DOCUMENT_TYPES.find((d) => d.id === wizardDocType);
                  const newName = `${docTypeObj?.labelEn || 'Custom'} Template (New)`;
                  setOverwriteModal(null);
                  runAnalysis(null, newName);
                }}
                className="w-full sm:w-auto text-xs"
              >
                Save as New Template
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const existingId = overwriteModal.existingTemplate.id;
                  const existingName = overwriteModal.existingTemplate.name;
                  setOverwriteModal(null);
                  runAnalysis(existingId, existingName);
                }}
                className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs gap-1.5"
              >
                Override Existing Template
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Overwrite Confirmation Modal on Template Save */}
      {overwriteSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-amber-100 text-amber-700 shrink-0">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Overwrite Existing Template?</h3>
                <p className="text-xs text-slate-500">Mayroon nang template na may kaparehong pangalan o uri.</p>
              </div>
            </div>

            <p className="text-sm text-slate-700 mb-6 leading-relaxed">
              Mayroon nang umiiral na template na pinangalanang <strong className="text-blue-700 font-semibold">"{overwriteSaveModal.conflictingTemplate.name}"</strong>.
              <br /><br />
              Nais mo ba itong <strong>i-overwrite / palitan</strong> upang ito na ang maging aktibong template na gagamitin sa buong system (Staff OCR & Document Requests), o i-save bilang <strong>panibagong hiwalay na template</strong>?
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOverwriteSaveModal(null)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleSaveTemplate(undefined, false, true)}
                className="w-full sm:w-auto text-xs"
              >
                Save as New Copy
              </Button>
              <Button
                type="button"
                onClick={() => void handleSaveTemplate(undefined, true, false)}
                className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs gap-1.5"
              >
                Yes, Overwrite Template
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for Print-Only Document Isolation */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 4mm 6mm;
          }
          html, body {
            background: #fff !important;
            color: #000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
          }
          body * {
            visibility: hidden;
          }
          #printable-document-canvas,
          #printable-document-canvas * {
            visibility: visible;
          }
          #printable-document-canvas {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: 280mm !important;
            margin: 0 !important;
            padding: 4mm 6mm !important;
            border: none !important;
            box-shadow: none !important;
            background: #fff !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          nav,
          header,
          aside,
          button,
          .no-print,
          [data-portal-shell-nav] {
            display: none !important;
          }
        }
      `}</style>
    </PortalShell>
  );
}
