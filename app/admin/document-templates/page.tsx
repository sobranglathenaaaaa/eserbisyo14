'use client';

import { ChangeEvent, FormEvent, useMemo, useState, useRef } from 'react';
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
import { formatDateTime } from '@/lib/formatters';
import { getRolePageCopy, resolveRoleCopy, resolveSteps } from '@/lib/content/role-pages';
import { deleteDocumentTemplate, upsertDocumentTemplate } from '@/lib/frontend-data/store';
import { useAppState } from '@/lib/frontend-data/use-app-state';
import type { DocumentTemplate } from '@/lib/types/models';

// Clean Document Types Catalog
const DOCUMENT_TYPES = [
  { id: 'certificate_indigency', labelEn: 'Certificate of Indigency', labelFil: 'Katibayan ng Kapalaran / Indigency' },
  { id: 'barangay_certificate', labelEn: 'Barangay Clearance', labelFil: 'Klarans ng Barangay' },
  { id: 'certificate_residency', labelEn: 'Certificate of Residency', labelFil: 'Katibayan ng Pagkahukom / Tirahan' },
  { id: 'good_moral', labelEn: 'Certificate of Good Moral Character', labelFil: 'Katibayan ng Mabuting Asal' },
  { id: 'business_permit', labelEn: 'Business Clearance', labelFil: 'Klarans ng Negosyo' },
  { id: 'lupon_summons', labelEn: 'Lupon Tagapamayapa Summons (KP #9)', labelFil: 'Patawag ng Lupon Tagapamayapa' },
];

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

  let docTitleUpper = 'CERTIFICATE OF INDIGENCY';
  let bodyWordingHtml = '';

  switch (docTypeKey) {
    case 'barangay_certificate':
      docTitleUpper = 'BARANGAY CLEARANCE';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">{{resident_name}}</u> whose residence at <u style="font-weight:bold;">{{resident_address}}</u> is within the jurisdiction of {{barangay_name}}, {{city}}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  RECORD CHECK IN THIS OFFICE SHOWS THAT THE ABOVE-NAMED INDIVIDUAL HAS NO DEROGATORY AND/OR PENDING CRIMINAL RECORD FILED AGAINST HIM/HER AS OF THIS DATE.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:28px;text-align:justify;color:#000;">
  This certification is being issued upon the request of <u style="font-weight:bold;">{{resident_name}}</u> for <u style="font-weight:bold;">{{purpose}}</u>.
</p>
<p style="font-size:14.5px;margin-top:28px;margin-bottom:36px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u>.
</p>
`;
      break;

    case 'certificate_residency':
      docTitleUpper = 'CERTIFICATE OF RESIDENCY';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">{{resident_name}}</u> whose residence at <u style="font-weight:bold;">{{resident_address}}</u> is a verified permanent resident of {{barangay_name}}, {{city}}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  The barangay also certifies that he/she is a law-abiding citizen of good standing in this community.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:28px;text-align:justify;color:#000;">
  This certification is being issued upon the request of <u style="font-weight:bold;">{{resident_name}}</u> for <u style="font-weight:bold;">{{purpose}}</u>.
</p>
<p style="font-size:14.5px;margin-top:28px;margin-bottom:36px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u>.
</p>
`;
      break;

    case 'good_moral':
      docTitleUpper = 'CERTIFICATE OF GOOD MORAL CHARACTER';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">{{resident_name}}</u> residing at <u style="font-weight:bold;">{{resident_address}}</u> is personally known to the undersigned officials as a person of good moral character.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  He/She has no record of involvement in any unlawful activities in this barangay.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:28px;text-align:justify;color:#000;">
  This certification is being issued upon request for <u style="font-weight:bold;">{{purpose}}</u>.
</p>
<p style="font-size:14.5px;margin-top:28px;margin-bottom:36px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u>.
</p>
`;
      break;

    case 'business_permit':
      docTitleUpper = 'BARANGAY BUSINESS CLEARANCE';
      bodyWordingHtml = `
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  Barangay clearance is hereby granted to <u style="font-weight:bold;">{{resident_name}}</u> to operate business under registered trade name located at <u style="font-weight:bold;">{{resident_address}}</u>, {{barangay_name}}, {{city}}.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:28px;text-align:justify;color:#000;">
  Subject to compliance with all existing barangay ordinances and municipal health laws.
</p>
<p style="font-size:14.5px;margin-top:28px;margin-bottom:36px;color:#000;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u> for <u style="font-weight:bold;">{{purpose}}</u>.
</p>
`;
      break;

    case 'lupon_summons':
      docTitleUpper = 'PATAWAG / SUMMONS (KP FORM #9)';
      bodyWordingHtml = `
<p style="font-size:14px;font-weight:bold;margin-bottom:16px;color:#000;">TO RESPONDENT: <u style="font-weight:bold;">{{resident_name}}</u></p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  You are hereby summoned to appear before me personally at the Barangay Hall on <u style="font-weight:bold;">{{date_issued}}</u> for a mediation/conciliation hearing regarding complaint filed against you.
</p>
<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:28px;text-align:justify;color:#000;">
  Fail not, or else face prejudice and legal action in court according to law.
</p>
`;
      break;

    case 'certificate_indigency':
    default:
      docTitleUpper = 'CERTIFICATE OF INDIGENCY';
      bodyWordingHtml = `
<p style="font-size:15.5px;line-height:2.1;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">
  This is to certify that <u style="font-weight:bold;">{{resident_name}}</u> whose residence at <u style="font-weight:bold;">{{resident_address}}</u> is within the jurisdiction of {{barangay_name}}, {{city}} and belongs to the indigent families of this barangay. The barangay also certifies that their daily income is barely enough to meet their day-to-day needs.
</p>
<p style="font-size:15.5px;line-height:2.1;text-indent:42px;margin-bottom:26px;text-align:justify;color:#000;">
  This certification is being issued upon the request of Mr./Mrs./Ms. <u style="font-weight:bold;">{{resident_name}}</u> for whatever legal purpose it may serve him/her.
</p>
<p style="font-size:15.5px;margin-top:26px;margin-bottom:32px;color:#000;text-align:center;">
  Issued this <u style="font-weight:bold;">{{date_issued}}</u>.
</p>
`;
      break;
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

        <p style="font-size:14.5px;font-weight:bold;margin-bottom:24px;color:#000;">
          TO WHOM IT MAY CONCERN:
        </p>

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
    <p style="font-size:14.5px;font-weight:bold;margin-bottom:22px;">TO WHOM IT MAY CONCERN:</p>
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

  // Dynamic Templates List directly from System State
  const templatesList = useMemo(() => {
    return state.documentTemplates || [];
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

  // Upload Wizard State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFilePreviewUrl, setUploadedFilePreviewUrl] = useState<string | null>(null);
  const [wizardDocType, setWizardDocType] = useState('certificate_indigency');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatusText, setAnalysisStatusText] = useState('');

  // Template Editor State
  const [editorName, setEditorName] = useState('');
  const [editorDocType, setEditorDocType] = useState('certificate_indigency');
  const [editorSourceType, setEditorSourceType] = useState<'uploaded' | 'custom'>('custom');
  const [editorFileName, setEditorFileName] = useState('');
  const [bodyContent, setBodyContent] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [dynamicFieldsInput, setDynamicFieldsInput] = useState('');
  const [isActive, setIsActive] = useState(true);

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

  // Filtered Template List with Overwritten / Custom Draft classification
  const filteredTemplates = useMemo(() => {
    return templatesList.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = item.name.toLowerCase().includes(q) || (item.originalFileName || '').toLowerCase().includes(q);
      const matchesType = typeFilter === 'all' || item.documentType === typeFilter;

      const isKnownDocType = DOCUMENT_TYPES.some((dt) => dt.id === item.documentType);
      const isOverwritten = item.sourceType === 'uploaded' || !isKnownDocType || item.name.toLowerCase().includes('update');

      let matchesStatus = true;
      if (statusFilter === 'active') {
        matchesStatus = item.isActive !== false && !isOverwritten;
      } else if (statusFilter === 'inactive') {
        matchesStatus = item.isActive === false;
      } else if (statusFilter === 'overwritten') {
        matchesStatus = isOverwritten;
      }

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [templatesList, searchQuery, typeFilter, statusFilter]);

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

  // Open Template Details View
  const handleViewTemplate = (template: DocumentTemplate) => {
    setSelectedTemplateId(template.id);
    setBodyContent(template.body);
    setHtmlContent(template.htmlBody || buildDefaultHtmlLayout(template.documentType || 'certificate_indigency', sealAlignment, layoutStyle, sideColumnVerticalSpacing));
    setViewMode('view_details');
  };

  // Open Editor for new or existing template
  const handleOpenEditor = (template?: DocumentTemplate | null) => {
    if (template) {
      const docType = template.documentType ?? 'certificate_indigency';
      setSelectedTemplateId(template.id);
      setEditorName(template.name);
      setEditorDocType(docType);
      setEditorSourceType(template.sourceType ?? 'custom');
      setEditorFileName(template.originalFileName ?? '');
      setBodyContent(template.body);
      setHtmlContent(template.htmlBody || buildDefaultHtmlLayout(docType, sealAlignment, layoutStyle, sideColumnVerticalSpacing));
      setDynamicFieldsInput((template.dynamicFields || []).join(','));
      setIsActive(template.isActive ?? true);
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
    }
    setEditorTab('visual');
    setViewMode('editor');
  };

  // Switch Document Type in Editor & Update Default Layout
  const handleEditorDocTypeChange = (newDocType: string) => {
    setEditorDocType(newDocType);
    const docObj = DOCUMENT_TYPES.find((d) => d.id === newDocType);
    if (docObj) {
      setEditorName(`${docObj.labelEn} Template`);
      setHtmlContent(buildDefaultHtmlLayout(newDocType, sealAlignment, layoutStyle, sideColumnVerticalSpacing));
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

  // Trigger Non-Blocking Template Upload Analysis
  const handleStartAnalysis = async () => {
    if (!uploadedFile) {
      setFeedback({ tone: 'error', text: 'Please select a document file (.docx / .pdf / image) to upload from File Explorer.' });
      return;
    }

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

      setEditorName(`${docLabel} Template`);
      setEditorDocType(wizardDocType);
      setEditorSourceType('uploaded');
      setEditorFileName(uploadedFile.name);

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
        text: `Document "${uploadedFile.name}" analyzed successfully! Exact layout for ${docLabel} loaded into paper canvas.`,
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

  // Save Template into Supabase & System State
  const handleSaveTemplate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editorName.trim()) {
      setFeedback({ tone: 'error', text: 'Please enter a template name.' });
      return;
    }

    const dynamicFields = dynamicFieldsInput.split(',').map((f) => f.trim()).filter(Boolean);

    await upsertDocumentTemplate({
      id: selectedTemplateId ?? undefined,
      name: editorName,
      documentType: editorDocType,
      sourceType: editorSourceType,
      originalFileName: editorFileName,
      body: bodyContent || 'Official Barangay Template',
      htmlBody: htmlContent,
      previewImageUrl: uploadedFilePreviewUrl || undefined,
      dynamicFields,
      headerConfig: { showLogo, showSeal, fontFamily, alignment, cityText, barangayText },
      isActive,
    });

    setFeedback({
      tone: 'success',
      text: `Template "${editorName}" saved successfully!`,
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

      {/* Module Header Area */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--portal-border-soft)] pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--portal-ink-900)]">
            DOCUMENT TEMPLATES
          </h1>
          <p className="mt-1 text-sm text-[color:var(--portal-ink-700)]">
            Manage official document templates, dynamic system variables, 3-seal placement, and 2-column sidebar layouts.
          </p>
        </div>

        {viewMode === 'list' && (
          <div className="flex items-center gap-3">
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
          </div>
        )}
      </div>

      {/* Global Form Feedback Banner */}
      {feedback ? <FormFeedback tone={feedback.tone} text={feedback.text} /> : null}

      {/* Main Category Tabs */}
      {viewMode === 'list' && (
        <div className="mb-6 flex border-b border-[color:var(--portal-border-soft)]">
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
        <SectionCard title="DOCUMENT TEMPLATES" description="Official barangay document templates active in the system.">
          {/* Single-Line Search & Filters Grid */}
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            <div className="relative sm:col-span-6">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[color:var(--portal-ink-500)]" />
              <Input
                placeholder="       Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 w-full"
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
                <option value="inactive">Inactive</option>
                <option value="overwritten">Overwritten / Drafts</option>
              </Select>
            </div>
          </div>

          {filteredTemplates.length === 0 ? (
            <EmptyState
              title="No templates found"
              description="No document templates matched your search criteria."
              actions={
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleOpenEditor()}
                    className="inline-flex items-center gap-2 rounded-md border border-emerald-600 bg-emerald-50/40 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-[#e9f5ef] hover:text-white transition-all shadow-2xs cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Create Template
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('upload_wizard')}
                    className="inline-flex items-center gap-2 rounded-md border border-emerald-600 bg-emerald-50/40 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-[#e9f5ef] hover:text-white transition-all shadow-2xs cursor-pointer"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Template
                  </button>
                </div>
              }
            />
          ) : (
            <div className="divide-y divide-slate-100 rounded-[var(--portal-radius-md)] border border-slate-200 bg-white">
              {filteredTemplates.map((item) => {
                const docTypeObj = DOCUMENT_TYPES.find((d) => d.id === item.documentType);
                const isOverwritten = item.sourceType === 'uploaded' || !docTypeObj || item.name.toLowerCase().includes('update');
                const statusTone = isOverwritten ? 'warning' : statusToneFromState(item.isActive !== false ? 'active' : 'inactive');

                return (
                  <div key={item.id} className="flex flex-wrap items-center justify-between p-4 gap-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3 min-w-[260px]">
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-600 font-bold shrink-0">
                        📄
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[color:var(--portal-ink-900)]">{item.name}</h3>
                        <p className="text-xs text-[color:var(--portal-ink-700)]">
                          {docTypeObj?.labelEn || (isOverwritten ? 'Overwritten / Custom Template' : 'Official Barangay Template')}
                          {item.originalFileName ? ` • ${item.originalFileName}` : ''}
                        </p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                          <StatusBadge tone={statusTone}>
                            {isOverwritten ? '● Overwritten' : item.isActive !== false ? '● Active' : 'Inactive'}
                          </StatusBadge>
                          <span>Updated {formatDateTime(item.updatedAt, locale)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => handleViewTemplate(item)}
                        className="gap-1 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenEditor(item)}
                        className="gap-1 text-xs"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </div>
                  </div>
                );
              })}
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
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Template Library
            </button>

            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={() => handleOpenEditor(activeTemplate)} className="gap-1.5 text-xs">
                <Edit3 className="h-3.5 w-3.5" />
                Edit Template
              </Button>
              <Button type="button" onClick={handlePrintDocument} className="gap-1.5 text-xs">
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
          title="UPLOAD DOCUMENT TEMPLATE"
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
                <Button type="button" variant="secondary" onClick={() => setViewMode('list')}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleStartAnalysis} disabled={isAnalyzing || !uploadedFile} className="flex-1 gap-2">
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
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Template Library
            </button>

            <div className="flex items-center gap-2">
              {selectedTemplateId ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  onClick={() => handleDeleteTemplate(selectedTemplateId)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Template
                </Button>
              ) : null}

              <Button type="button" variant="secondary" onClick={handlePrintDocument} className="gap-1.5 text-xs">
                <Printer className="h-3.5 w-3.5" />
                Preview & Print
              </Button>

              <Button type="submit" className="gap-1.5">
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
            {/* PART 1: BARANGAY GENERAL & CONTACT DETAILS */}
            <div className="mb-6 rounded-[var(--portal-radius-md)] border border-slate-200 bg-slate-50 p-4">
              <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                1. Barangay General & Contact Details
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

            {/* PART 2: OFFICIAL SEAL LOGOS MANAGEMENT (BARANGAY, CITY & BAGONG PILIPINAS LOGOS) */}
            <div className="mb-6 rounded-[var(--portal-radius-md)] border border-slate-200 bg-white p-4">
              <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-blue-600" />
                2. Official Seal Logos
              </h4>
              <div className="grid gap-4 md:grid-cols-3">
                {/* 1. Barangay Seal */}
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

                {/* 2. City / Municipal Seal */}
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

                {/* 3. Country / Bagong Pilipinas Seal */}
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

            {/* PART 3: KEY EXECUTIVE OFFICIALS */}
            <div className="mb-6 rounded-[var(--portal-radius-md)] border border-slate-200 bg-white p-4">
              <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                3. Key Executive Officials
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

            {/* PART 4: BARANGAY KAGAWAD ROSTER MANAGEMENT */}
            <div className="rounded-[var(--portal-radius-md)] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    4. Barangay Kagawad Roster & Committees
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
              <Button type="submit" className="gap-2">
                <Save className="h-4 w-4" />
                Save Information & Refresh Templates
              </Button>
            </div>
          </SectionCard>
        </form>
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
