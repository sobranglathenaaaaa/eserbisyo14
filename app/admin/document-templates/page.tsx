'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState, useRef } from 'react';
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Code,
  Edit3,
  Eye,
  FileText,
  Image as ImageIcon,
  Layout,
  ListOrdered,
  Plus,
  PlusCircle,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  Users,
  X,
  Layers,
  FileCheck,
  AlertCircle,
  DollarSign,
  HelpCircle,
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
  OFFICIAL_DOCUMENT_CATEGORIES,
  DEFAULT_OFFICIAL_TEMPLATES,
  OFFICIAL_WORD_TEMPLATES,
  DOCUMENT_TYPES_CATALOG_STORAGE_KEY,
  loadDocumentTypesCatalog,
  saveDocumentTypesCatalog,
  getCategoryForDocType,
  getCategoryLabel,
  type DocumentTypeCatalogItem,
} from '@/lib/documents/document-catalog-constants';
import { getBarangayOfficialSettings, saveBarangayOfficialSettings } from '@/lib/documents/barangay-settings';



const SYSTEM_DYNAMIC_TAGS = [
  { tag: '{{resident_name}}', fieldName: 'resident_name', label: 'Resident Full Name', category: 'resident' },
  { tag: '{{resident_address}}', fieldName: 'resident_address', label: 'Resident Home Address', category: 'resident' },
  { tag: '{{add_where}}', fieldName: 'add_where', label: 'Project / Activity Site Location (Kung saan gaganapin)', category: 'resident' },
  { tag: '{{purpose}}', fieldName: 'purpose', label: 'Specific Request Purpose', category: 'resident' },
  { tag: '{{date_issued}}', fieldName: 'date_issued', label: 'Full Date (e.g. ___ day of ______, 2026)', category: 'date' },
  { tag: '{{day}}', fieldName: 'day', label: 'Day of the Month (e.g. 9th / 9)', category: 'date' },
  { tag: '{{month}}', fieldName: 'month', label: 'Month Name (e.g. October)', category: 'date' },
  { tag: '{{year}}', fieldName: 'year', label: 'Year (e.g. 2026)', category: 'date' },
  { tag: '{{reference_number}}', fieldName: 'reference_number', label: 'Control / Reference Number', category: 'document' },
  { tag: '{{barangay_name}}', fieldName: 'barangay_name', label: 'Barangay Name', category: 'barangay' },
  { tag: '{{city}}', fieldName: 'city', label: 'City / Municipality Name', category: 'barangay' },
  { tag: '{{punong_barangay}}', fieldName: 'punong_barangay', label: 'Punong Barangay Full Name', category: 'officials' },
  { tag: '{{barangay_secretary}}', fieldName: 'barangay_secretary', label: 'Barangay Secretary Name', category: 'officials' },
  { tag: '{{barangay_treasurer}}', fieldName: 'barangay_treasurer', label: 'Barangay Treasurer Name', category: 'officials' },
  { tag: '{{kagawad_list}}', fieldName: 'kagawad_list', label: 'Dynamic Kagawad Roster & Committees', category: 'officials' },
  { tag: '{{complainant_name}}', fieldName: 'complainant_name', label: 'Complainant Full Name (Lupon)', category: 'lupon' },
  { tag: '{{case_number}}', fieldName: 'case_number', label: 'Barangay Case No. (Lupon)', category: 'lupon' },
  { tag: '{{date_filed}}', fieldName: 'date_filed', label: 'Date Filed (Lupon)', category: 'lupon' },
  { tag: '{{hearing_date_time}}', fieldName: 'hearing_date_time', label: 'Hearing Schedule Date & Time', category: 'lupon' },
  { tag: '{{business_name}}', fieldName: 'business_name', label: 'Business / Establishment Name', category: 'business' },
  { tag: '{{permit_type}}', fieldName: 'permit_type', label: 'Permit Type', category: 'business' },
  { tag: '{{barangay_address}}', fieldName: 'barangay_address', label: 'Barangay Office Address', category: 'barangay' },
  { tag: '{{barangay_email}}', fieldName: 'barangay_email', label: 'Barangay Official Email', category: 'barangay' },
  { tag: '{{barangay_phone}}', fieldName: 'barangay_phone', label: 'Barangay Contact Numbers', category: 'barangay' },
  { tag: '{{barangay_watermark}}', fieldName: 'barangay_watermark', label: 'Center Barangay Watermark Seal', category: 'seals' },
  { tag: '{{country_seal}}', fieldName: 'country_seal', label: 'Bagong Pilipinas / Country Seal', category: 'seals' },
  { tag: '{{city_seal}}', fieldName: 'city_seal', label: 'City / Municipal Seal', category: 'seals' },
  { tag: '{{barangay_seal}}', fieldName: 'barangay_seal', label: 'Barangay Official Seal', category: 'seals' },
  { tag: '{{official_seal}}', fieldName: 'official_seal', label: 'Official Seal Badge Text', category: 'seals' },
];

type KagawadItem = {
  id: string;
  name: string;
  committee: string;
};

type MultiPurposeSelectorProps = {
  label?: string;
  purposes: string[];
  selectedPurposes: string[];
  onChange: (newPurposes: string[]) => void;
  documentTypeName?: string;
  locale?: 'en' | 'fil';
};

function MultiPurposeSelector({
  label,
  purposes,
  selectedPurposes,
  onChange,
  documentTypeName = 'Document',
  locale = 'fil',
}: MultiPurposeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const isFil = locale === 'fil';

  const defaultLabel = isFil
    ? 'Layunin'
    : 'Purpose';
  const displayLabel = label ?? defaultLabel;

  const filtered = purposes.filter((p) =>
    p.toLowerCase().includes(search.toLowerCase().trim())
  );

  const togglePurpose = (purpose: string) => {
    if (selectedPurposes.includes(purpose)) {
      onChange(selectedPurposes.filter((p) => p !== purpose));
    } else {
      onChange([...selectedPurposes, purpose]);
    }
  };

  return (
    <div className="grid min-w-0 gap-2 text-sm">
      {displayLabel && (
        <div className="flex items-center justify-between">
          <span className="font-medium text-[color:var(--text-900)]">
            {displayLabel}
          </span>
          {selectedPurposes.length > 0 && (
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {selectedPurposes.length} {isFil ? 'napili' : 'selected'}
            </span>
          )}
        </div>
      )}

      {/* Main Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-h-[40px] px-3 py-2 text-left rounded-[var(--portal-radius-md)] border bg-white shadow-2xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
          isOpen
            ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
            : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50/50'
        }`}
      >
        <div className="flex-1 flex flex-wrap gap-1.5 items-center">
          {selectedPurposes.length === 0 ? (
            <span className="text-sm text-slate-400 font-normal flex items-center gap-1.5">
              <Tag className="h-4 w-4 text-slate-400" />
              {isFil ? 'Pumili ng isa o higit pang layunin...' : 'Select one or more purposes...'}
            </span>
          ) : (
            selectedPurposes.map((p) => (
              <span
                key={p}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200/80 shadow-2xs"
              >
                <span className="max-w-[160px] truncate">{p}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePurpose(p);
                  }}
                  className="rounded-full hover:bg-emerald-200/70 p-0.5 text-emerald-600 hover:text-emerald-900 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </span>
              </span>
            ))
          )}
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
          <span className="text-xs font-medium text-slate-500">
            {isOpen ? (isFil ? 'Itago' : 'Hide') : (isFil ? 'Pumili' : 'Select')}
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-emerald-600' : ''
            }`}
          />
        </div>
      </button>

      {/* In-Flow Collapsible Purpose Drawer */}
      {isOpen && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs space-y-2.5">
          {/* Header Action Bar with Search */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-emerald-500">
              <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder={isFil ? 'Maghanap ng layunin...' : 'Search purposes...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs bg-transparent border-0 p-0 focus:outline-none focus:ring-0 placeholder:text-slate-400 text-slate-800"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-xs px-0.5">
              <span className="text-slate-500 font-medium">
                {filtered.length} {isFil ? 'layunin sa' : 'purposes under'} {documentTypeName}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onChange(purposes)}
                  className="text-emerald-700 hover:text-emerald-900 hover:underline font-semibold cursor-pointer text-xs"
                >
                  {isFil ? 'Piliin Lahat' : 'Select All'}
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-slate-500 hover:text-slate-800 hover:underline cursor-pointer text-xs"
                >
                  {isFil ? 'Alisin Lahat' : 'Clear All'}
                </button>
              </div>
            </div>
          </div>

          {/* List of Purposes */}
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">
                {isFil ? 'Walang nahanap na layunin.' : 'No purposes found.'}
              </p>
            ) : (
              filtered.map((purpose) => {
                const isSelected = selectedPurposes.includes(purpose);
                return (
                  <div
                    key={purpose}
                    onClick={() => togglePurpose(purpose)}
                    className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-950 font-medium border border-emerald-200'
                        : 'text-slate-700 hover:bg-slate-100/80 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 pr-2">
                      <div
                        className={`grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <span className="leading-snug">{purpose}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Done button */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {selectedPurposes.length} {isFil ? 'ng' : 'of'} {purposes.length} {isFil ? 'ang napili' : 'selected'}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              {isFil ? 'OK / Isara' : 'Done / Close'}
            </Button>
          </div>
        </div>
      )}

      {/* Multi-Template Automatic Preview Banner */}
      {selectedPurposes.length > 1 && (
        <div className="rounded-lg border border-emerald-200/80 bg-gradient-to-r from-emerald-50/90 to-teal-50/70 p-2.5 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>
              {isFil
                ? `Awtomatikong gagawa ng ${selectedPurposes.length} hiwalay na mga template:`
                : `Automatically generating ${selectedPurposes.length} separate templates:`}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {selectedPurposes.map((p) => (
              <span
                key={p}
                className="inline-block rounded bg-white/90 px-2 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200 shadow-2xs"
              >
                {documentTypeName} - {p}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Structured Template Document Content
export type TemplateStructuredContent = {
  docTitle: string;
  salutation: string;
  body: string;
  closingClause: string;
  signatoryName: string;
  signatoryTitle: string;
  sealNotice: string;
  footerNotice: string;
};

// Default Structured Content Catalog per Document Type
export function getDefaultTemplateStructure(docTypeKey: string): TemplateStructuredContent {
  const normalized = docTypeKey.toLowerCase();

  if (normalized.includes('indigency')) {
    return {
      docTitle: 'CERTIFICATE OF INDIGENCY',
      salutation: 'TO WHOM IT MAY CONCERN:',
      body: 'This is to certify that {{resident_name}} whose residence at {{resident_address}} is within the jurisdiction of {{barangay_name}}, {{city}} and belongs to the indigent families of this barangay. The barangay also certifies that their daily income is barely enough to meet their day-to-day needs.\n\nThis certification is being issued upon the request of Mr./Mrs./Ms. {{resident_name}} for {{purpose}}.',
      closingClause: 'Issued this {{date_issued}} at {{barangay_name}}, {{city}}.',
      signatoryName: '{{punong_barangay}}',
      signatoryTitle: 'Punong Barangay',
      sealNotice: 'Not Valid Without\nOfficial Seal',
      footerNotice: '**ALTERATION ON THIS PAGE WILL MAKE THIS CERTIFICATION VOID/INVALID**',
    };
  }

  if (normalized.includes('school_req') || normalized.includes('school')) {
    return {
      docTitle: 'BARANGAY CERTIFICATION',
      salutation: 'TO WHOM IT MAY CONCERN:',
      body: 'This is to certify that {{resident_name}}, of legal age, Filipino, whose residence is at {{resident_address}}, is a bona fide resident of {{barangay_name}}, {{city}}.\n\nBased on records and verification, the above-named individual is a law-abiding citizen with good moral standing in this community.\n\nThis certification is issued upon the request of {{resident_name}} for {{purpose}}.',
      closingClause: 'Issued this {{date_issued}} at {{barangay_name}}, {{city}}.',
      signatoryName: '{{punong_barangay}}',
      signatoryTitle: 'Punong Barangay',
      sealNotice: 'Not Valid Without\nOfficial Seal',
      footerNotice: '**ALTERATION ON THIS PAGE WILL MAKE THIS CERTIFICATION VOID/INVALID**',
    };
  }

  if (normalized.includes('pwd') || normalized.includes('senior')) {
    return {
      docTitle: 'BARANGAY CERTIFICATION',
      salutation: 'TO WHOM IT MAY CONCERN:',
      body: 'This is to certify that {{resident_name}}, whose residence at {{resident_address}}, is a bona fide and verified resident of {{barangay_name}}, {{city}}.\n\nThis office further certifies that the subject individual is eligible for registration and issuance of privileges under Republic Act No. 7277 / Republic Act No. 9994.\n\nIssued upon request of {{resident_name}} for {{purpose}}.',
      closingClause: 'Issued this {{date_issued}} at {{barangay_name}}, {{city}}.',
      signatoryName: '{{punong_barangay}}',
      signatoryTitle: 'Punong Barangay',
      sealNotice: 'Not Valid Without\nOfficial Seal',
      footerNotice: '**ALTERATION ON THIS PAGE WILL MAKE THIS CERTIFICATION VOID/INVALID**',
    };
  }

  if (normalized.includes('health')) {
    return {
      docTitle: 'BARANGAY CERTIFICATION',
      salutation: 'TO WHOM IT MAY CONCERN:',
      body: 'This is to certify that {{resident_name}} residing at {{resident_address}} is a bona fide resident of {{barangay_name}}, {{city}}.\n\nHe/She has undergone residency verification and has no derogatory record on file with this office.\n\nThis certification is issued upon the request of {{resident_name}} for {{purpose}}.',
      closingClause: 'Issued this {{date_issued}} at {{barangay_name}}, {{city}}.',
      signatoryName: '{{punong_barangay}}',
      signatoryTitle: 'Punong Barangay',
      sealNotice: 'Not Valid Without\nOfficial Seal',
      footerNotice: '**ALTERATION ON THIS PAGE WILL MAKE THIS CERTIFICATION VOID/INVALID**',
    };
  }

  if (normalized.includes('death')) {
    return {
      docTitle: 'BARANGAY DEATH CERTIFICATION',
      salutation: 'TO WHOM IT MAY CONCERN:',
      body: 'This is to certify that the late {{resident_name}}, during his/her lifetime, was a permanent resident of {{resident_address}} within {{barangay_name}}, {{city}}.\n\nThis further certifies that the subject individual passed away on {{date_issued}}.\n\nThis certification is being issued upon the request of his/her next-of-kin for {{purpose}}.',
      closingClause: 'Issued this {{date_issued}} at {{barangay_name}}, {{city}}.',
      signatoryName: '{{punong_barangay}}',
      signatoryTitle: 'Punong Barangay',
      sealNotice: 'Not Valid Without\nOfficial Seal',
      footerNotice: '**ALTERATION ON THIS PAGE WILL MAKE THIS CERTIFICATION VOID/INVALID**',
    };
  }

  if (normalized.includes('employment')) {
    return {
      docTitle: 'BARANGAY CERTIFICATION',
      salutation: 'TO WHOM IT MAY CONCERN:',
      body: 'This is to certify that {{resident_name}} whose residence at {{resident_address}} is within the jurisdiction of {{barangay_name}}, {{city}}.\n\nRECORD CHECK IN THIS OFFICE SHOWS THAT THE ABOVE-NAMED INDIVIDUAL HAS NO DEROGATORY AND/OR PENDING CRIMINAL RECORD FILED AGAINST HIM/HER AS OF THIS DATE.\n\nThis certification is being issued upon the request of {{resident_name}} for {{purpose}}.',
      closingClause: 'Issued this {{date_issued}} at {{barangay_name}}, {{city}}.',
      signatoryName: '{{punong_barangay}}',
      signatoryTitle: 'Punong Barangay',
      sealNotice: 'Not Valid Without\nOfficial Seal',
      footerNotice: '**ALTERATION ON THIS PAGE WILL MAKE THIS CERTIFICATION VOID/INVALID**',
    };
  }

  if (normalized.includes('police_nbi') || normalized.includes('court')) {
    return {
      docTitle: 'BARANGAY CLEARANCE',
      salutation: 'TO WHOM IT MAY CONCERN:',
      body: 'This is to certify that {{resident_name}} whose residence is at {{resident_address}} is a bona fide resident of {{barangay_name}}, {{city}}.\n\nRECORD CHECK SHOWS THAT HE/SHE HAS NO DEROGATORY RECORD ON FILE AS OF THIS DATE AND IS A LAW-ABIDING CITIZEN.\n\nIssued upon the request of {{resident_name}} for {{purpose}}.',
      closingClause: 'Issued this {{date_issued}} at {{barangay_name}}, {{city}}.',
      signatoryName: '{{punong_barangay}}',
      signatoryTitle: 'Punong Barangay',
      sealNotice: 'Not Valid Without\nOfficial Seal',
      footerNotice: '**ALTERATION ON THIS PAGE WILL MAKE THIS CERTIFICATION VOID/INVALID**',
    };
  }

  if (normalized.includes('passport') || normalized.includes('postal')) {
    return {
      docTitle: 'BARANGAY CERTIFICATION',
      salutation: 'TO WHOM IT MAY CONCERN:',
      body: 'This is to certify that {{resident_name}} residing at {{resident_address}} is a bona fide resident of {{barangay_name}}, {{city}}.\n\nThe undersigned officials attest that the bearer is a person of good moral character and has no derogatory record on file.\n\nIssued upon request for {{purpose}}.',
      closingClause: 'Issued this {{date_issued}} at {{barangay_name}}, {{city}}.',
      signatoryName: '{{punong_barangay}}',
      signatoryTitle: 'Punong Barangay',
      sealNotice: 'Not Valid Without\nOfficial Seal',
      footerNotice: '**ALTERATION ON THIS PAGE WILL MAKE THIS CERTIFICATION VOID/INVALID**',
    };
  }

  if (normalized.includes('overseas') || normalized.includes('visa')) {
    return {
      docTitle: 'BARANGAY CERTIFICATION',
      salutation: 'TO WHOM IT MAY CONCERN:',
      body: 'This is to certify that {{resident_name}} residing at {{resident_address}} is a bona fide resident of {{barangay_name}}, {{city}}.\n\nHe/She is verified to have no derogatory record in this barangay and is of good moral standing.\n\nIssued upon request for {{purpose}}.',
      closingClause: 'Issued this {{date_issued}} at {{barangay_name}}, {{city}}.',
      signatoryName: '{{punong_barangay}}',
      signatoryTitle: 'Punong Barangay',
      sealNotice: 'Not Valid Without\nOfficial Seal',
      footerNotice: '**ALTERATION ON THIS PAGE WILL MAKE THIS CERTIFICATION VOID/INVALID**',
    };
  }

  if (normalized.includes('no_operation')) {
    return {
      docTitle: 'CERTIFICATE OF NO OPERATION',
      salutation: 'TO WHOM IT MAY CONCERN:',
      body: 'This is to certify that according to the records and ocular inspection conducted by this office, the business entity registered under the name of {{resident_name}} with business address located at {{resident_address}}, {{barangay_name}}, {{city}}, is NOT IN OPERATION / HAS CEASED OPERATIONS.\n\nThis certification is being issued upon request for {{purpose}}.',
      closingClause: 'Issued this {{date_issued}} at {{barangay_name}}, {{city}}.',
      signatoryName: '{{punong_barangay}}',
      signatoryTitle: 'Punong Barangay',
      sealNotice: 'Not Valid Without\nOfficial Seal',
      footerNotice: '**ALTERATION ON THIS PAGE WILL MAKE THIS CERTIFICATION VOID/INVALID**',
    };
  }

  if (normalized.includes('transient') || normalized.includes('kasambahay') || normalized.includes('worker')) {
    return {
      docTitle: 'TRANSIENT WORKER CERTIFICATION',
      salutation: 'TO WHOM IT MAY CONCERN:',
      body: 'This is to certify that {{resident_name}} is an authorized transient employee / worker residing/stationed at {{resident_address}} within the jurisdiction of {{barangay_name}}, {{city}}.\n\nRECORD CHECK IN THIS OFFICE SHOWS THAT THE ABOVE-NAMED INDIVIDUAL HAS NO DEROGATORY RECORD IN THIS BARANGAY AS OF THIS DATE.\n\nThis certification is issued upon the request of {{resident_name}} for {{purpose}}.',
      closingClause: 'Issued this {{date_issued}} at {{barangay_name}}, {{city}}.',
      signatoryName: '{{punong_barangay}}',
      signatoryTitle: 'Punong Barangay',
      sealNotice: 'Not Valid Without\nOfficial Seal',
      footerNotice: '**ALTERATION ON THIS PAGE WILL MAKE THIS CERTIFICATION VOID/INVALID**',
    };
  }

  if (normalized.includes('cfa') || normalized.includes('file_action')) {
    return {
      docTitle: 'CERTIFICATE TO FILE ACTION',
      salutation: '',
      body: 'This is to certify that the dispute involving complainant {{complainant_name}} and respondent {{resident_name}} regarding {{purpose}} underwent conciliation proceedings before the Barangay Lupon.\n\nThat personal confrontation between parties failed to reach an amicable settlement. Therefore, the corresponding complaint for the dispute may now be filed in Court / competent government tribunal.',
      closingClause: 'Issued this {{date_issued}} at {{barangay_name}}, {{city}}.',
      signatoryName: '{{punong_barangay}}',
      signatoryTitle: 'Punong Barangay / Lupon Chairman',
      sealNotice: 'Official Seal',
      footerNotice: 'KP FORM NO. 20 - OFFICE OF THE LUPONG TAGAPAMAYAPA',
    };
  }

  if (normalized.includes('lupon') || normalized.includes('summons') || normalized.includes('patawag')) {
    return {
      docTitle: '= S U M M O N S =',
      salutation: 'TO: {{resident_name}} (Respondent/s)',
      body: 'You are hereby summoned to appear before me, in person together with your witness on the {{hearing_date_time}} then and there to answer to a complaint made before me, copy of which is attached hereto, for mediation/conciliation of your dispute with complainant/s.\n\nYou are hereby warned that if you refuse or willfully fail to appear in obedience to this summons, you may be barred from the filing of any counterclaim arising from said complaint.\n\nFAIL NOT or else face punishment as for contempt of court.',
      closingClause: 'Issued this {{date_issued}} at {{barangay_name}}, {{city}}.',
      signatoryName: '{{punong_barangay}}',
      signatoryTitle: 'Punong Barangay / Lupon Chairman',
      sealNotice: 'Official Lupon Seal',
      footerNotice: 'OFFICE OF THE LUPONG TAGAPAMAYAPA',
    };
  }

  if (
    normalized.includes('construction') ||
    normalized.includes('occupancy') ||
    normalized.includes('renovation') ||
    normalized.includes('expansion') ||
    normalized.includes('fencing') ||
    normalized.includes('excavation') ||
    normalized.includes('demolition')
  ) {
    return {
      docTitle: 'BARANGAY CLEARANCE',
      salutation: 'TO WHOM IT MAY CONCERN:',
      body: 'This is to certify that the Sangguniang Barangay of Progreso, {{city}} interposes no objection to the issuance of:\n\nMayor\'s Business Permit | Building Permit\nOccupancy Permit | Excavation Permit\nDemolition Permit | Renovation / Repair Permit\n[ ✓ ] Construction Permit ({{purpose}}) | Hauling Permit\nSignage / Billboards Permit | Others\n\nIN FAVOR OF:\n\nName of Owner: {{resident_name}}\nAddress of Owner: {{resident_address}}\n\nThis Certification is being issued upon the request of the above-named applicant for the aforementioned purpose ({{purpose}}).',
      closingClause: 'Given this {{date_issued}} at {{barangay_name}}, {{city}}, Metro Manila.',
      signatoryName: '{{punong_barangay}}',
      signatoryTitle: 'Punong Barangay',
      sealNotice: 'Not Valid Without\nOfficial Seal',
      footerNotice: '**ALTERATION ON THIS PAGE WILL MAKE THIS CLEARANCE VOID/INVALID**',
    };
  }

  if (normalized.includes('business')) {
    return {
      docTitle: 'BARANGAY BUSINESS CLEARANCE',
      salutation: '',
      body: `[CENTER]<u style="font-weight:bold;font-size:16px;">{{business_name}}</u>
(Name of Establishment)

is issued to

<u style="font-weight:bold;font-size:16px;">{{resident_name}}</u>
(Name of Owner)

With postal address at

<u style="font-weight:bold;font-size:15px;">{{resident_address}}, {{city}}</u>
(Postal Address)[/CENTER]

This clearance specifically covers the operation of the business enterprise ({{purpose}}).

This clearance is issued upon the request of the aforementioned name, provided that no law, city ordinance, or resolution shall be violated during the operation. For renewal applications, no renewal shall be granted if the business is found to be in violation of applicable rules.`,
      closingClause: 'Issued this {{date_issued}} at {{barangay_name}}, {{city}}.',
      signatoryName: '{{punong_barangay}}',
      signatoryTitle: 'Punong Barangay',
      sealNotice: 'Not Valid Without\nOfficial Seal',
      footerNotice: '**ALTERATION ON THIS PAGE WILL MAKE THIS CERTIFICATION VOID/INVALID**',
    };
  }

  if (normalized.includes('residency')) {
    return {
      docTitle: 'CERTIFICATE OF RESIDENCY',
      salutation: 'TO WHOM IT MAY CONCERN:',
      body: 'This is to certify that {{resident_name}} whose residence at {{resident_address}} is a verified permanent resident of {{barangay_name}}, {{city}}.\n\nThe barangay also certifies that he/she is a law-abiding citizen of good standing in this community.\n\nThis certification is being issued upon the request of {{resident_name}} for {{purpose}}.',
      closingClause: 'Issued this {{date_issued}} at {{barangay_name}}, {{city}}.',
      signatoryName: '{{punong_barangay}}',
      signatoryTitle: 'Punong Barangay',
      sealNotice: 'Not Valid Without\nOfficial Seal',
      footerNotice: '**ALTERATION ON THIS PAGE WILL MAKE THIS CERTIFICATION VOID/INVALID**',
    };
  }

  if (normalized.includes('good_moral')) {
    return {
      docTitle: 'CERTIFICATE OF GOOD MORAL CHARACTER',
      salutation: 'TO WHOM IT MAY CONCERN:',
      body: 'This is to certify that {{resident_name}} residing at {{resident_address}} is personally known to the undersigned officials as a person of good moral character.\n\nHe/She has no record of involvement in any unlawful activities in this barangay.\n\nThis certification is being issued upon request for {{purpose}}.',
      closingClause: 'Issued this {{date_issued}} at {{barangay_name}}, {{city}}.',
      signatoryName: '{{punong_barangay}}',
      signatoryTitle: 'Punong Barangay',
      sealNotice: 'Not Valid Without\nOfficial Seal',
      footerNotice: '**ALTERATION ON THIS PAGE WILL MAKE THIS CERTIFICATION VOID/INVALID**',
    };
  }

  if (
    normalized.includes('delivery') ||
    normalized.includes('hauling') ||
    normalized.includes('mixer') ||
    normalized.includes('debris') ||
    normalized.includes('sand_gravel') ||
    normalized.includes('heavy_equipment')
  ) {
    return {
      docTitle: 'DELIVERY & HAULING CLEARANCE',
      salutation: 'TO WHOM IT MAY CONCERN:',
      body: 'Barangay clearance is hereby granted to {{resident_name}} (residing at {{resident_address}}) for delivery / hauling operations at {{add_where}}, {{barangay_name}}, {{city}}.\n\nThis clearance covers hauling/transportation of materials/equipment as specified: {{purpose}}.\n\nSubject to strict adherence to barangay traffic, road safety, and waste disposal guidelines.',
      closingClause: 'Issued this {{date_issued}} at {{barangay_name}}, {{city}}.',
      signatoryName: '{{punong_barangay}}',
      signatoryTitle: 'Punong Barangay',
      sealNotice: 'Not Valid Without\nOfficial Seal',
      footerNotice: '**ALTERATION ON THIS PAGE WILL MAKE THIS CLEARANCE VOID/INVALID**',
    };
  }

  if (
    normalized.includes('special') ||
    normalized.includes('commercial') ||
    normalized.includes('shooting') ||
    normalized.includes('flyer') ||
    normalized.includes('cable') ||
    normalized.includes('promotional')
  ) {
    return {
      docTitle: 'SPECIAL & COMMERCIAL PERMIT',
      salutation: 'TO WHOM IT MAY CONCERN:',
      body: 'Special barangay clearance/permit is hereby granted to {{resident_name}} (residing at {{resident_address}}) for activity/operations at {{add_where}}, {{barangay_name}}, {{city}}.\n\nThis permit is valid for the specific purpose of: {{purpose}}.\n\nSubject to compliance with public safety, noise regulations, and existing barangay ordinances.',
      closingClause: 'Issued this {{date_issued}} at {{barangay_name}}, {{city}}.',
      signatoryName: '{{punong_barangay}}',
      signatoryTitle: 'Punong Barangay',
      sealNotice: 'Not Valid Without\nOfficial Seal',
      footerNotice: '**ALTERATION ON THIS PAGE WILL MAKE THIS PERMIT VOID/INVALID**',
    };
  }

  if (normalized.includes('clearance')) {
    return {
      docTitle: 'BARANGAY CLEARANCE',
      salutation: 'TO WHOM IT MAY CONCERN:',
      body: 'This is to certify that {{resident_name}} whose residence at {{resident_address}} is within the jurisdiction of {{barangay_name}}, {{city}}.\n\nRECORD CHECK IN THIS OFFICE SHOWS THAT THE ABOVE-NAMED INDIVIDUAL HAS NO DEROGATORY AND/OR PENDING CRIMINAL RECORD FILED AGAINST HIM/HER AS OF THIS DATE.\n\nThis certification is being issued upon the request of {{resident_name}} for {{purpose}}.',
      closingClause: 'Issued this {{date_issued}} at {{barangay_name}}, {{city}}.',
      signatoryName: '{{punong_barangay}}',
      signatoryTitle: 'Punong Barangay',
      sealNotice: 'Not Valid Without\nOfficial Seal',
      footerNotice: '**ALTERATION ON THIS PAGE WILL MAKE THIS CERTIFICATION VOID/INVALID**',
    };
  }

  // Default Barangay Certification
  return {
    docTitle: 'BARANGAY CERTIFICATION',
    salutation: 'TO WHOM IT MAY CONCERN:',
    body: 'This is to certify that {{resident_name}}, of legal age, Filipino, whose residence is at {{resident_address}}, is a bona fide resident of {{barangay_name}}, {{city}}.\n\nBased on records and verification, the above-named individual is a law-abiding citizen with good moral standing in this community.\n\nThis certification is issued upon the request of {{resident_name}} for {{purpose}}.',
    closingClause: 'Issued this {{date_issued}} at {{barangay_name}}, {{city}}.',
    signatoryName: '{{punong_barangay}}',
    signatoryTitle: 'Punong Barangay',
    sealNotice: 'Not Valid Without\nOfficial Seal',
    footerNotice: '**ALTERATION ON THIS PAGE WILL MAKE THIS CERTIFICATION VOID/INVALID**',
  };
}

// Default Plain Text Wording Catalog (Clean plain text without raw HTML tags)
function getDefaultPlainWording(docTypeKey: string): string {
  return getDefaultTemplateStructure(docTypeKey).body;
}

// Intelligent OCR / Upload Parser to extract Title, Salutation, Body, Closing, and Signatures from scanned text
export function parseExtractedDocumentText(
  extractedText: string,
  fallbackStruct: TemplateStructuredContent
): TemplateStructuredContent {
  const raw = (extractedText || '').trim();
  if (!raw || raw.length < 20) {
    return fallbackStruct;
  }

  // 1. Clean line noise from OCR (remove leading/trailing symbols, pipes '|', and strip excess whitespace)
  const rawLines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/^[|\s:;.-]+/, '').replace(/[|\s:;.-]+$/, '').trim())
    .filter((l) => l.length > 0);

  // Filter out sidebar Kagawad/Committee rosters if OCR captured the 2-column sidebar list
  const filteredLines = rawLines.filter((line) => {
    const lower = line.toLowerCase();
    const isSidebarNoise =
      lower.includes('sangguniang barangay') ||
      lower.includes('committee on') ||
      lower.includes('sk chairperson') ||
      lower.includes('barangay sec') ||
      lower.includes('barangay treas') ||
      (lower.includes('hon.') && (lower.includes('kagawad') || lower.includes('member')));
    return !isSidebarNoise;
  });

  const fullText = filteredLines.join('\n');

  // 2. Extract Document Title
  let docTitle = fallbackStruct.docTitle;
  const titlePatterns = [
    /=\s*S\s*U\s*M\s*M\s*O\s*N\s*S\s*=|SUMMONS/i,
    /CERTIFICATE\s+TO\s+FILE\s+ACTION/i,
    /NOTICE\s+OF\s+HEARING|RECONCILIATION\s+NOTICE/i,
    /CERTIFICATE\s+OF\s+INDIGENCY/i,
    /CERTIFICATE\s+OF\s+RESIDENCY/i,
    /CERTIFICATE\s+OF\s+NO\s+OPERATION/i,
    /BARANGAY\s+DEATH\s+CERTIFICATION/i,
    /TRANSIENT\s+WORKER\s+CERTIFICATION/i,
    /BARANGAY\s+BUSINESS\s+CLEARANCE|BUSINESS\s+PERMIT|BUSINESS\s+CLEARANCE/i,
    /SPECIAL\s+(&|AND)?\s*COMMERCIAL\s+PERMIT|SPECIAL\s+PERMIT/i,
    /DELIVERY\s+(&|AND)?\s*HAULING\s+CLEARANCE|HAULING\s+CLEARANCE/i,
    /BARANGAY\s+CLEARANCE/i,
    /BARANGAY\s+CERTIFICATION/i,
  ];
  for (const pat of titlePatterns) {
    const match = fullText.match(pat);
    if (match) {
      const matchedStr = match[0].toUpperCase().replace(/\s+/g, ' ');
      docTitle = matchedStr.includes('SUMMONS') ? '= S U M M O N S =' : matchedStr;
      break;
    }
  }

  // 3. Extract Salutation
  let salutation = fallbackStruct.salutation;
  const isLuponDoc = fullText.toLowerCase().includes('lupon') || fullText.toLowerCase().includes('summons') || fullText.toLowerCase().includes('patawag');
  const salutationMatch = fullText.match(/(TO\s+WHOM\s+IT\s+MAY\s+CONCERN\s*:?|GREETINGS\s*:?|NOTICE\s*:?|TO\s*:[\s\S]*?(?=You\s+are|Fail\s+not|$))/i);
  if (isLuponDoc) {
    salutation = 'TO: {{resident_name}} (Respondent/s)';
  } else if (salutationMatch) {
    salutation = salutationMatch[0].toUpperCase();
  }

  // 4. Extract Closing Clause / Issued this...
  let closingClause = fallbackStruct.closingClause;
  const closingMatch = fullText.match(/(Issued\s+this[\s\S]*?(?=\n\s*\n|\n[A-Z\s]{4,}|\nHon|\nPunong|$))/i);
  if (closingMatch) {
    closingClause = closingMatch[0].replace(/\n+/g, ' ').trim();
  }

  // 5. Extract Signatory Name & Title
  let signatoryName = fallbackStruct.signatoryName;
  let signatoryTitle = fallbackStruct.signatoryTitle;
  const sigMatch = fullText.match(/(HON\.?\s+[A-Z\s\.\-]{3,50}|[A-Z\s\.\-]{4,50})\s*\n\s*(Punong\s+Barangay|Barangay\s+Captain|Barangay\s+Chairman|Presiding\s+Officer)/i);
  if (sigMatch) {
    signatoryName = sigMatch[1].trim();
    signatoryTitle = sigMatch[2].trim();
  }

  // 6. Extract Main Body Paragraphs (Everything between Salutation / Header and Closing / Signatory)
  let bodyStartIndex = 0;
  if (salutationMatch && salutationMatch.index !== undefined) {
    bodyStartIndex = salutationMatch.index + salutationMatch[0].length;
  } else {
    const certMatch = fullText.match(/(This\s+is\s+to\s+certify[\s\S]*)/i);
    if (certMatch && certMatch.index !== undefined) {
      bodyStartIndex = certMatch.index;
    }
  }

  let bodyEndIndex = fullText.length;
  if (closingMatch && closingMatch.index !== undefined && closingMatch.index > bodyStartIndex) {
    bodyEndIndex = closingMatch.index;
  } else if (sigMatch && sigMatch.index !== undefined && sigMatch.index > bodyStartIndex) {
    bodyEndIndex = sigMatch.index;
  }

  let rawBody = fullText.slice(bodyStartIndex, bodyEndIndex).trim();

  // If no clear boundaries, clean raw text directly
  if (!rawBody || rawBody.length < 20) {
    rawBody = fullText;
  }

  // Convert raw scanned lines into proper paragraph blocks
  const bodyParagraphs = rawBody
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 5);

  let formattedBody = bodyParagraphs.length > 0 ? bodyParagraphs.join('\n\n') : rawBody;

  // 7. Auto-detect blank fields/underscores and map to dynamic system tags generically:
  // - Labeled Form Fields: "Name of Owner: [blank]" -> "Name of Owner: {{resident_name}}"
  formattedBody = formattedBody.replace(
    /((?:Name\s+of\s+(?:Owner|Applicant|Grantee|Bearer|Resident)|Owner(?:'s)?\s+Name|Applicant\s+Name)\s*:\s*)[_.\-\s]{2,}/gi,
    '$1{{resident_name}}'
  );

  // - Labeled Site Location / Activity Location: "Location / Site Address / Project Location: [blank]" -> "Location: {{add_where}}"
  formattedBody = formattedBody.replace(
    /((?:Location|Project\s+Location|Site\s+Address|Place\s+of\s+(?:Activity|Work|Operation)|Delivery\s+Location|Excavation\s+Site)\s*:\s*)[_.\-\s]{2,}/gi,
    '$1{{add_where}}'
  );

  // - Activity / Operation / Work at [blank] -> "operations at {{add_where}}"
  formattedBody = formattedBody.replace(
    /((?:operations|activity|project|construction|delivery|excavation|shooting)\s+at(?:\s+located\s+at)?\s+)[_.\-]{2,}/gi,
    '$1{{add_where}}'
  );

  // - Labeled Address Fields: "Address of Owner: [blank]" -> "Address of Owner: {{resident_address}}"
  formattedBody = formattedBody.replace(
    /((?:Address\s+of\s+(?:Owner|Applicant|Grantee|Bearer|Resident)|Owner(?:'s)?\s+Address|Applicant\s+Address|Postal\s+Address)\s*:\s*)[_.\-\s]{2,}/gi,
    '$1{{resident_address}}'
  );

  // - Labeled Establishment Fields: "Name of Establishment: [blank]" -> "Name of Establishment: {{business_name}}"
  formattedBody = formattedBody.replace(
    /((?:Name\s+of\s+Establishment|Business\s+Name|Establishment\s+Name)\s*:\s*)[_.\-\s]{2,}/gi,
    '$1{{business_name}}'
  );

  // - Parenthesized purpose: "for the aforementioned purpose ( [blank] )" -> "for the aforementioned purpose ({{purpose}})"
  formattedBody = formattedBody.replace(
    /((?:for\s+(?:the\s+)?aforementioned\s+purpose|for\s+purpose|for)\s*\(\s*)[_.\-\s]{2,}(\s*\))/gi,
    '$1{{purpose}}$2'
  );

  // - "upon the request of [blank] for [blank]" -> "upon the request of {{resident_name}} for {{purpose}}"
  formattedBody = formattedBody.replace(
    /(upon\s+the\s+request\s+of\s+(?:(?:Mr\.\/Mrs\.\/Ms\.|Mr\.|Mrs\.|Ms\.)\s*)?)[_.\-\s]{3,}\s+(for\s+)[_.\-\s]{3,}/gi,
    '$1{{resident_name}} $2{{purpose}}'
  );

  // - Replace blanks after "request of [blank]" with {{resident_name}}
  formattedBody = formattedBody.replace(
    /(upon\s+(?:the\s+)?request\s+(?:of\s+)?(?:(?:Mr\.\/Mrs\.\/Ms\.|Mr\.|Mrs\.|Ms\.)\s*)?)[_.\-]{2,}/gi,
    '$1{{resident_name}}'
  );

  // - Replace blanks after "for [blank]" with {{purpose}}
  formattedBody = formattedBody.replace(
    /(\bfor\s+)[_.\-]{2,}(\s*[.,;]|\s+|$)/gi,
    '$1{{purpose}}$2'
  );

  // - Replace blanks after "certify that [blank]" with {{resident_name}}
  formattedBody = formattedBody.replace(
    /(certify\s+that\s+(?:(?:Mr\.\/Mrs\.\/Ms\.|Mr\.|Mrs\.|Ms\.)\s*)?)[_.\-]{2,}/gi,
    '$1{{resident_name}}'
  );

  // - Replace blanks after "residence at [blank]" with {{resident_address}}
  formattedBody = formattedBody.replace(
    /(residen(?:ce(?:\s+is)?|ding)\s+at\s+)[_.\-]{2,}/gi,
    '$1{{resident_address}}'
  );

  // - Replace blanks after "Issued this [blank]" with {{date_issued}}
  formattedBody = formattedBody.replace(
    /(Issued\s+this\s+)[_.\-]{2,}/gi,
    '$1{{date_issued}}'
  );

  return {
    docTitle,
    salutation,
    body: formattedBody || fallbackStruct.body,
    closingClause,
    signatoryName,
    signatoryTitle,
    sealNotice: fallbackStruct.sealNotice,
    footerNotice: fallbackStruct.footerNotice,
  };
}

// Category & Layout-Aware Default HTML Builder (Formats structured plain text into authentic paper canvas)
function buildDefaultHtmlLayout(
  docTypeKey: string,
  sealAlignment: 'side_by_side' | 'centered' | 'stacked' = 'centered',
  layoutStyle: 'single_column' | 'two_column_sidebar' = 'two_column_sidebar',
  sideColumnVerticalSpacing: 'compact' | 'standard' | 'spacious' = 'standard',
  customBodyWording?: string,
  customDocTitle?: string,
  customSalutation?: string,
  customClosingClause?: string,
  customSignatoryName?: string,
  customSignatoryTitle?: string,
  customFooterNotice?: string,
  customSealNotice?: string
): string {
  const fallback = getDefaultTemplateStructure(docTypeKey);

  const finalDocTitle =
    customDocTitle !== undefined && customDocTitle.trim().length > 0
      ? customDocTitle.trim()
      : fallback.docTitle;

  const finalSalutation =
    customSalutation !== undefined
      ? customSalutation.trim()
      : fallback.salutation;

  const finalBody =
    customBodyWording !== undefined && customBodyWording.trim().length > 0
      ? customBodyWording
      : fallback.body;

  const finalClosingClause =
    customClosingClause !== undefined
      ? customClosingClause.trim()
      : fallback.closingClause;

  const finalSignatoryName =
    customSignatoryName !== undefined && customSignatoryName.trim().length > 0
      ? customSignatoryName.trim()
      : fallback.signatoryName;

  const finalSignatoryTitle =
    customSignatoryTitle !== undefined && customSignatoryTitle.trim().length > 0
      ? customSignatoryTitle.trim()
      : fallback.signatoryTitle;

  const finalSealNotice =
    customSealNotice !== undefined && customSealNotice.trim().length > 0
      ? customSealNotice.trim()
      : fallback.sealNotice;

  const finalFooterNotice =
    customFooterNotice !== undefined && customFooterNotice.trim().length > 0
      ? customFooterNotice.trim()
      : fallback.footerNotice;

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

  // Convert plain body wording paragraphs into clean canvas-formatted HTML
  const paragraphs = finalBody
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const bodyWordingHtml = paragraphs
    .map((p) => {
      // If paragraph contains [center]...[/center] or <center>...</center>
      if (
        p.includes('[center]') ||
        p.includes('[CENTER]') ||
        p.includes('<center>') ||
        p.includes('text-align:center') ||
        p.startsWith('<div style="text-align:center')
      ) {
        let clean = p
          .replace(/\[center\]/gi, '<div style="text-align:center;margin:12px 0;line-height:1.9;">')
          .replace(/\[\/center\]/gi, '</div>')
          .replace(/<center>/gi, '<div style="text-align:center;margin:12px 0;line-height:1.9;">')
          .replace(/<\/center>/gi, '</div>')
          .replace(/\n/g, '<br />');
        return `<div style="text-align:center;margin-bottom:18px;line-height:1.9;">${clean}</div>`;
      }

      // If the paragraph is already raw HTML structure
      if (p.startsWith('<div') || p.startsWith('<table') || p.startsWith('<ul') || p.startsWith('<ol') || p.startsWith('<p')) {
        return p;
      }

      const withBr = p.replace(/\n/g, '<br />');
      return `<p style="font-size:14.5px;line-height:2.2;text-indent:42px;margin-bottom:24px;text-align:justify;color:#000;">${withBr}</p>`;
    })
    .join('\n');

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

    let luponSubtitle = isCfa
      ? '(KP FORM #20 - KATIBAYAN UPANG MAKADULOG SA HUKUMAN)'
      : isNotice
      : '(KP FORM #9 - PATAWAG)';

    const effectiveTitle =
      finalDocTitle && !finalDocTitle.toUpperCase().includes('BARANGAY CLEARANCE') && !finalDocTitle.toUpperCase().includes('BARANGAY CERTIFICATION')
        ? finalDocTitle
        : isCfa
        ? 'CERTIFICATE TO FILE ACTION'
        : isNotice
        ? 'NOTICE OF HEARING / RECONCILIATION NOTICE'
        : '= S U M M O N S =';

    const bodyHasCaptionBox =
      finalBody.toLowerCase().includes('case no') ||
      finalBody.toLowerCase().includes('complainant') ||
      finalBody.includes('-against-') ||
      finalBody.includes('- against -');

    const bodyHasTitle =
      finalBody.toLowerCase().includes('=summons=') ||
      finalBody.toLowerCase().includes('= summons =') ||
      finalBody.toLowerCase().includes('patawag') ||
      finalBody.toLowerCase().includes('certificate to file action') ||
      finalBody.toLowerCase().includes('kp form');

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
        ${effectiveTitle}
      </h2>
      <p style="font-size:12px;font-weight:bold;color:#475569;margin:4px 0 0 0;text-transform:uppercase;letter-spacing:1px;">
        ${luponSubtitle}
      </p>
    </div>` : ''}

    ${finalSalutation && !finalSalutation.toUpperCase().includes('TO WHOM IT MAY CONCERN') ? `
    <div style="margin-bottom:16px;font-size:15px;line-height:1.5;">
      <strong>${finalSalutation}</strong>
    </div>` : ''}

    ${bodyWordingHtml}

    ${finalClosingClause ? `
    <p style="font-size:14.5px;margin-top:24px;margin-bottom:28px;color:#000;">
      ${finalClosingClause}
    </p>` : ''}
  </div>

  <!-- SIGNATURE & FOOTER -->
  <div style="position:relative;z-index:2;margin-top:auto;">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px;">
      <div style="font-size:10.5px;font-weight:bold;font-style:italic;color:#333;line-height:1.25;white-space:pre-line;">
        ${finalSealNotice}
      </div>

      <div style="text-align:center;min-width:240px;">
        <p style="font-size:15.5px;font-weight:bold;border-bottom:1px solid #000;padding-bottom:4px;margin:0;color:#000;">
          ${finalSignatoryName}
        </p>
        <p style="font-size:13px;font-weight:bold;margin:4px 0 0 0;color:#000;">
          ${finalSignatoryTitle}
        </p>
      </div>
    </div>

    ${finalFooterNotice ? `
    <div style="border-top:1px solid #000;padding-top:6px;text-align:center;">
      <p style="font-size:9.5px;font-weight:bold;color:#000;margin:0;text-transform:uppercase;letter-spacing:0.3px;">
        ${finalFooterNotice}
      </p>
    </div>` : ''}

    <!-- FOOTER ADDRESS -->
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
    
    <!-- LEFT SIDEBAR: BARANGAY OFFICIALS & KAGAWAD ROSTER -->
    <div style="width:235px;min-width:235px;border-right:2px solid #000;padding:${sidebarPadding};text-align:center;font-size:13.5px;display:flex;flex-direction:column;justify-content:${sidebarJustify};background:transparent;box-sizing:border-box;">
      
      <div>
        <!-- PUNONG BARANGAY -->
        <div style="margin-bottom:${punongPbMargin};">
          <p style="font-size:15.5px;font-weight:bold;margin:0;color:#000;text-transform:uppercase;">
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
          ${finalDocTitle}
        </h2>

        ${finalSalutation ? `
        <p style="font-size:14.5px;font-weight:bold;margin-bottom:24px;color:#000;">
          ${finalSalutation}
        </p>` : ''}

        ${bodyWordingHtml}

        ${finalClosingClause ? `
        <p style="font-size:14.5px;margin-top:24px;margin-bottom:28px;color:#000;">
          ${finalClosingClause}
        </p>` : ''}
      </div>

      <!-- BOTTOM SIGNATURE & OFFICIAL NOTICE SECTION -->
      <div style="position:relative;z-index:2;margin-top:auto;padding-top:32px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px;">
          <div style="font-size:10.5px;font-weight:bold;font-style:italic;color:#333;line-height:1.25;white-space:pre-line;">
            ${finalSealNotice}
          </div>

          <div style="text-align:center;min-width:220px;">
            <p style="font-size:14.5px;font-weight:bold;margin:0;color:#000;">
              ${finalSignatoryName}
            </p>
            <p style="font-size:12px;font-weight:bold;margin:3px 0 0 0;color:#000;">
              ${finalSignatoryTitle}
            </p>
          </div>
        </div>

        <!-- WARNING FOOTER BAR -->
        ${finalFooterNotice ? `
        <div style="border-top:1px solid #000;padding-top:6px;text-align:center;">
          <p style="font-size:9.5px;font-weight:bold;color:#000;margin:0;text-transform:uppercase;letter-spacing:0.3px;">
            ${finalFooterNotice}
          </p>
        </div>` : ''}
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
      ${finalDocTitle}
    </h2>
    ${finalSalutation ? `<p style="font-size:14.5px;font-weight:bold;margin-bottom:22px;">${finalSalutation}</p>` : ''}
    ${bodyWordingHtml}
    ${finalClosingClause ? `<p style="font-size:14.5px;margin-top:24px;margin-bottom:28px;">${finalClosingClause}</p>` : ''}
  </div>

  <div style="position:relative;z-index:2;margin-top:auto;">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:40px;margin-bottom:24px;">
      <div style="font-size:10.5px;font-weight:bold;font-style:italic;color:#333;white-space:pre-line;">
        ${finalSealNotice}
      </div>
      <div style="text-align:center;min-width:220px;">
        <p style="font-size:14.5px;font-weight:bold;margin:0;color:#000;">
          ${finalSignatoryName}
        </p>
        <p style="font-size:12px;font-weight:bold;margin:3px 0 0 0;color:#000;">
          ${finalSignatoryTitle}
        </p>
      </div>
    </div>
    ${finalFooterNotice ? `
    <div style="border-top:1px solid #000;padding-top:6px;text-align:center;margin-bottom:12px;">
      <p style="font-size:9.5px;font-weight:bold;color:#000;margin:0;text-transform:uppercase;letter-spacing:0.3px;">
        ${finalFooterNotice}
      </p>
    </div>` : ''}
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
  const isFil = locale === 'fil';
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


  // Main Category Navigation: 'library' | 'document_types_purposes' | 'barangay_officials'
  const [mainTab, setMainTab] = useState<'library' | 'document_types_purposes' | 'barangay_officials'>('library');

  // Document Types & Purposes Catalog State
  const [docTypesCatalog, setDocTypesCatalog] = useState<DocumentTypeCatalogItem[]>([]);
  const [docTypeSearchQuery, setDocTypeSearchQuery] = useState('');
  const [docTypeCategoryFilter, setDocTypeCategoryFilter] = useState('all');
  const [docTypeStatusFilter, setDocTypeStatusFilter] = useState('all');
  const [docTypePage, setDocTypePage] = useState(1);
  const docTypesPerPage = 8;

  // Add / Edit Document Type Modal State
  const [docTypeModalOpen, setDocTypeModalOpen] = useState(false);
  const [editingDocTypeId, setEditingDocTypeId] = useState<string | null>(null);
  const [editDocTypeName, setEditDocTypeName] = useState('');
  const [editDocTypeCategory, setEditDocTypeCategory] = useState('barangay_certification');
  const [editDocTypePrice, setEditDocTypePrice] = useState<string>('0');
  const [editDocTypePricingNote, setEditDocTypePricingNote] = useState('');
  const [editDocTypeDescription, setEditDocTypeDescription] = useState('');
  const [editDocTypePurposes, setEditDocTypePurposes] = useState<string[]>([]);
  const [newPurposeInput, setNewPurposeInput] = useState('');

  // Quick Purpose Inline Inputs (Map of docTypeId -> input string)
  const [quickAddPurposeMap, setQuickAddPurposeMap] = useState<Record<string, string>>({});

  // Delete Document Type Confirmation Modal
  const [deleteDocTypeModal, setDeleteDocTypeModal] = useState<{
    isOpen: boolean;
    item: DocumentTypeCatalogItem;
  } | null>(null);

  // Load Catalog on Mount and listen for custom updates
  useEffect(() => {
    const loaded = loadDocumentTypesCatalog();
    setDocTypesCatalog(loaded);

    const handleUpdated = (e: Event) => {
      const customEv = e as CustomEvent<DocumentTypeCatalogItem[]>;
      if (customEv.detail && Array.isArray(customEv.detail)) {
        setDocTypesCatalog(customEv.detail);
      } else {
        setDocTypesCatalog(loadDocumentTypesCatalog());
      }
    };

    window.addEventListener('eserbisyo:document-types-updated', handleUpdated);
    window.addEventListener('eserbisyo:document-types-catalog-updated', handleUpdated);
    return () => {
      window.removeEventListener('eserbisyo:document-types-updated', handleUpdated);
      window.removeEventListener('eserbisyo:document-types-catalog-updated', handleUpdated);
    };
  }, []);

  // Filtered Document Types Catalog
  const filteredDocTypes = useMemo(() => {
    return docTypesCatalog.filter((item) => {
      const q = docTypeSearchQuery.toLowerCase().trim();
      const itemPurposes = item.purposes || [];
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        itemPurposes.some((p) => p.toLowerCase().includes(q)) ||
        (item.categoryLabel || '').toLowerCase().includes(q);

      const matchesCat =
        docTypeCategoryFilter === 'all' ||
        item.categoryId === docTypeCategoryFilter ||
        (item.categoryLabel && item.categoryLabel.toLowerCase() === docTypeCategoryFilter.toLowerCase());

      let matchesStatus = true;
      if (docTypeStatusFilter === 'active') {
        matchesStatus = item.isActive !== false;
      } else if (docTypeStatusFilter === 'inactive') {
        matchesStatus = item.isActive === false;
      } else if (docTypeStatusFilter === 'custom') {
        matchesStatus = Boolean(item.isCustom);
      }

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [docTypesCatalog, docTypeSearchQuery, docTypeCategoryFilter, docTypeStatusFilter]);

  const docTypePageCount = Math.max(1, Math.ceil(filteredDocTypes.length / docTypesPerPage));
  const paginatedDocTypes = useMemo(() => {
    const start = (docTypePage - 1) * docTypesPerPage;
    return filteredDocTypes.slice(start, start + docTypesPerPage);
  }, [filteredDocTypes, docTypePage]);

  // Document Type Modal Handlers
  const handleOpenAddDocType = () => {
    setEditingDocTypeId(null);
    setEditDocTypeName('');
    setEditDocTypeCategory('barangay_certification');
    setEditDocTypePrice('0');
    setEditDocTypePricingNote('');
    setEditDocTypeDescription('');
    setEditDocTypePurposes([]);
    setNewPurposeInput('');
    setDocTypeModalOpen(true);
  };

  const handleOpenEditDocType = (item: DocumentTypeCatalogItem) => {
    setEditingDocTypeId(item.id);
    setEditDocTypeName(item.name);
    setEditDocTypeCategory(item.categoryId || getCategoryForDocType(item.id, item.name));
    setEditDocTypePrice(String(item.price ?? 0));
    setEditDocTypePricingNote(item.pricingNote || '');
    setEditDocTypeDescription(item.description || '');
    setEditDocTypePurposes([...(item.purposes || [])]);
    setNewPurposeInput('');
    setDocTypeModalOpen(true);
  };

  const handleAddPurposeToEditList = (purposeText?: string) => {
    const text = (purposeText !== undefined ? purposeText : newPurposeInput).trim();
    if (!text) return;
    if (editDocTypePurposes.includes(text)) {
      setFeedback({
        tone: 'info',
        text: isFil ? 'Nasa listahan na ang layunin na ito.' : 'This purpose is already in the list.',
      });
      return;
    }
    setEditDocTypePurposes((prev) => [...prev, text]);
    setNewPurposeInput('');
  };

  const handleRemovePurposeFromEditList = (index: number) => {
    setEditDocTypePurposes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveDocTypeModal = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!editDocTypeName.trim()) {
      setFeedback({
        tone: 'error',
        text: isFil ? 'Pakilagay ang pangalan ng uri ng dokumento.' : 'Please provide a document type name.',
      });
      return;
    }

    const priceNum = Math.max(0, parseFloat(editDocTypePrice) || 0);
    const categoryLabel = getCategoryLabel(editDocTypeCategory);

    let updatedCatalog: DocumentTypeCatalogItem[];
    if (editingDocTypeId) {
      // Update existing
      updatedCatalog = docTypesCatalog.map((item) => {
        if (item.id === editingDocTypeId) {
          return {
            ...item,
            name: editDocTypeName.trim(),
            categoryId: editDocTypeCategory,
            categoryLabel,
            price: priceNum,
            pricingNote: editDocTypePricingNote.trim() || undefined,
            description: editDocTypeDescription.trim() || undefined,
            purposes: editDocTypePurposes,
            isCustom: true,
          };
        }
        return item;
      });
      setFeedback({
        tone: 'success',
        text: isFil
          ? `Matagumpay na na-update ang uri ng dokumentong "${editDocTypeName}"!`
          : `Document type "${editDocTypeName}" updated successfully!`,
      });
    } else {
      // Create new
      const newId = `custom_dt_${Date.now()}`;
      const newItem: DocumentTypeCatalogItem = {
        id: newId,
        name: editDocTypeName.trim(),
        categoryId: editDocTypeCategory,
        categoryLabel,
        price: priceNum,
        pricingNote: editDocTypePricingNote.trim() || undefined,
        description: editDocTypeDescription.trim() || undefined,
        purposes: editDocTypePurposes,
        isActive: true,
        isCustom: true,
      };
      updatedCatalog = [newItem, ...docTypesCatalog];
      setFeedback({
        tone: 'success',
        text: isFil
          ? `Matagumpay na naidagdag ang uri ng dokumentong "${editDocTypeName}"!`
          : `Document type "${editDocTypeName}" added successfully!`,
      });
    }

    setDocTypesCatalog(updatedCatalog);
    saveDocumentTypesCatalog(updatedCatalog);
    setDocTypeModalOpen(false);
  };

  // Inline Quick Add Purpose
  const handleQuickAddPurpose = (docTypeId: string) => {
    const text = (quickAddPurposeMap[docTypeId] || '').trim();
    if (!text) return;

    const updated = docTypesCatalog.map((item) => {
      if (item.id === docTypeId) {
        const currentPurposes = item.purposes || [];
        if (currentPurposes.includes(text)) return item;
        return {
          ...item,
          purposes: [...currentPurposes, text],
          isCustom: true,
        };
      }
      return item;
    });

    setDocTypesCatalog(updated);
    saveDocumentTypesCatalog(updated);
    setQuickAddPurposeMap((prev) => ({ ...prev, [docTypeId]: '' }));
    setFeedback({
      tone: 'success',
      text: isFil ? `Matagumpay na naidagdag ang layunin na "${text}"!` : `Purpose "${text}" added successfully!`,
    });
  };

  // Inline Remove Purpose
  const handleRemovePurposeFromCard = (docTypeId: string, purposeIndex: number) => {
    const targetDoc = docTypesCatalog.find((d) => d.id === docTypeId);
    const targetPurposes = targetDoc?.purposes || [];
    const removedName = targetPurposes[purposeIndex] || '';

    const updated = docTypesCatalog.map((item) => {
      if (item.id === docTypeId) {
        const currentPurposes = item.purposes || [];
        return {
          ...item,
          purposes: currentPurposes.filter((_, i) => i !== purposeIndex),
          isCustom: true,
        };
      }
      return item;
    });

    setDocTypesCatalog(updated);
    saveDocumentTypesCatalog(updated);
    setFeedback({
      tone: 'info',
      text: isFil ? `Natanggal ang layuning "${removedName}".` : `Purpose "${removedName}" removed.`,
    });
  };

  // Toggle Active/Inactive
  const handleToggleDocTypeActive = (docTypeId: string) => {
    const updated = docTypesCatalog.map((item) => {
      if (item.id === docTypeId) {
        const nextActive = item.isActive === false ? true : false;
        return { ...item, isActive: nextActive, isCustom: true };
      }
      return item;
    });
    setDocTypesCatalog(updated);
    saveDocumentTypesCatalog(updated);
  };

  // Delete Document Type
  const handleDeleteDocType = (docTypeId: string) => {
    const target = docTypesCatalog.find((d) => d.id === docTypeId);
    const updated = docTypesCatalog.filter((item) => item.id !== docTypeId);
    setDocTypesCatalog(updated);
    saveDocumentTypesCatalog(updated);
    setDeleteDocTypeModal(null);
    setFeedback({
      tone: 'success',
      text: isFil
        ? `Matagumpay na natanggal ang uri ng dokumentong "${target?.name || ''}".`
        : `Document type "${target?.name || ''}" deleted successfully.`,
    });
  };

  // Reset to Defaults
  const handleResetDocTypesToDefaults = () => {
    const confirmMsg = isFil
      ? 'Sigurado ka bang nais mong i-reset ang lahat ng uri ng dokumento at layunin sa opisyal na default ng system?'
      : 'Are you sure you want to reset all document types and purposes to official system defaults? Custom changes will be restored.';
    if (!window.confirm(confirmMsg)) return;
    try {
      window.localStorage.removeItem(DOCUMENT_TYPES_CATALOG_STORAGE_KEY);
    } catch {}
    const defaults = loadDocumentTypesCatalog();
    setDocTypesCatalog(defaults);
    saveDocumentTypesCatalog(defaults);
    setFeedback({
      tone: 'success',
      text: isFil
        ? 'Matagumpay na na-reset ang catalog sa opisyal na default!'
        : 'Document types and purposes catalog reset to official defaults successfully!',
    });
  };

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
  const [wizardPurposes, setWizardPurposes] = useState<string[]>([]);
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
  const [editorDocType, setEditorDocType] = useState('barangay_certification');
  const [editorPurposes, setEditorPurposes] = useState<string[]>([]);
  const [editorSourceType, setEditorSourceType] = useState<'uploaded' | 'custom' | 'official'>('custom');
  const [editorFileName, setEditorFileName] = useState('');
  const [bodyContent, setBodyContent] = useState('');
  const [editorDocTitle, setEditorDocTitle] = useState('BARANGAY CERTIFICATION');
  const [editorSalutation, setEditorSalutation] = useState('TO WHOM IT MAY CONCERN:');
  const [editorClosingClause, setEditorClosingClause] = useState('Issued this {{date_issued}} at {{barangay_name}}, {{city}}.');
  const [editorSignatoryName, setEditorSignatoryName] = useState('{{punong_barangay}}');
  const [editorSignatoryTitle, setEditorSignatoryTitle] = useState('Punong Barangay');
  const [editorSealNotice, setEditorSealNotice] = useState('Not Valid Without\nOfficial Seal');
  const [editorFooterNotice, setEditorFooterNotice] = useState('**ALTERATION ON THIS PAGE WILL MAKE THIS CERTIFICATION VOID/INVALID**');
  const [showExtraFields, setShowExtraFields] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const [dynamicFieldsInput, setDynamicFieldsInput] = useState('');
  const [customVariables, setCustomVariables] = useState<string[]>([]);
  const [newCustomVarName, setNewCustomVarName] = useState('');
  const [variableSearch, setVariableSearch] = useState('');
  const [varCategoryFilter, setVarCategoryFilter] = useState<string>('all');
  const [isActive, setIsActive] = useState(true);
  const [editorIsOverwritten, setEditorIsOverwritten] = useState(false);

  const filteredSystemTags = useMemo(() => {
    return SYSTEM_DYNAMIC_TAGS.filter((t) => {
      const matchesCat = varCategoryFilter === 'all' || t.category === varCategoryFilter;
      if (!matchesCat) return false;
      if (!variableSearch.trim()) return true;
      const q = variableSearch.toLowerCase().trim();
      return (
        t.tag.toLowerCase().includes(q) ||
        t.label.toLowerCase().includes(q) ||
        t.fieldName.toLowerCase().includes(q)
      );
    });
  }, [variableSearch, varCategoryFilter]);

  // Editor Display Mode Tab: 'visual' | 'html' | 'text' | 'original_upload'
  const [editorTab, setEditorTab] = useState<'visual' | 'html' | 'text' | 'original_upload'>('visual');

  // Styling, Seals & Layout Config
  const [showLogo, setShowLogo] = useState(true);
  const [showSeal, setShowSeal] = useState(true);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('center');

  const initialBarangaySettings = getBarangayOfficialSettings();

  // 3-Seal Media State (Country, City, Barangay)
  const [countryLogoUrl, setCountryLogoUrl] = useState<string>(initialBarangaySettings.countryLogoUrl);
  const [cityLogoUrl, setCityLogoUrl] = useState<string>(initialBarangaySettings.cityLogoUrl);
  const [barangayLogoUrl, setBarangayLogoUrl] = useState<string>(initialBarangaySettings.barangayLogoUrl);

  // Seal Arrangement Options: 'side_by_side' | 'centered' | 'stacked'
  const [sealAlignment, setSealAlignment] = useState<'side_by_side' | 'centered' | 'stacked'>('centered');

  // Document Layout Style Options: 'single_column' | 'two_column_sidebar'
  const [layoutStyle, setLayoutStyle] = useState<'single_column' | 'two_column_sidebar'>('two_column_sidebar');

  // Side Column Vertical Spacing Customization (Compact / Standard / Spacious)
  const [sideColumnVerticalSpacing, setSideColumnVerticalSpacing] = useState<'compact' | 'standard' | 'spacious'>('standard');

  // Interactive Barangay General & Contact Information State
  const [cityText, setCityText] = useState(initialBarangaySettings.cityName);
  const [barangayText, setBarangayText] = useState(initialBarangaySettings.barangayName);
  const [barangayAddress, setBarangayAddress] = useState(initialBarangaySettings.barangayAddress);
  const [barangayEmail, setBarangayEmail] = useState(initialBarangaySettings.barangayEmail);
  const [barangayPhone, setBarangayPhone] = useState(initialBarangaySettings.barangayPhone);

  // Key Executive Officials State
  const [punongBarangay, setPunongBarangay] = useState(initialBarangaySettings.punongBarangay);
  const [barangaySecretary, setBarangaySecretary] = useState(initialBarangaySettings.barangaySecretary);
  const [barangayTreasurer, setBarangayTreasurer] = useState(initialBarangaySettings.barangayTreasurer);

  // Dynamic Kagawad list matching Barangay Council
  const [kagawadList, setKagawadList] = useState<KagawadItem[]>(initialBarangaySettings.kagawadList);

  // Feedback banner
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Filtered Template List with clean Status and Category classification
  const filteredTemplates = useMemo(() => {
    return templatesList.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = item.name.toLowerCase().includes(q) || (item.originalFileName || '').toLowerCase().includes(q);
      const matchesType =
        typeFilter === 'all' ||
        item.documentType === typeFilter ||
        docTypesCatalog.some(
          (dt) => dt.id === typeFilter && (dt.id === item.documentType || dt.name.toLowerCase() === item.name.toLowerCase())
        );

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
  }, [templatesList, searchQuery, typeFilter, statusFilter, docTypesCatalog]);

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

  // Auto-clean any legacy "(Multiple: X purposes)" template into individual distinct templates
  useEffect(() => {
    const multiTemplates = templatesList.filter((t) => t.name.includes('(Multiple:'));
    if (multiTemplates.length > 0) {
      multiTemplates.forEach(async (multiTpl) => {
        const docCat = docTypesCatalog.find((d) => d.id === multiTpl.documentType) || docTypesCatalog[0];
        const docName = docCat?.name || 'Barangay Document';
        const purposes = docCat?.purposes && docCat.purposes.length > 0 ? docCat.purposes : ['General Purpose'];
        
        for (const p of purposes) {
          const separateName = `${docName} - ${p}`;
          const alreadyExists = templatesList.some((t) => t.name.toLowerCase() === separateName.toLowerCase());
          if (!alreadyExists) {
            await upsertDocumentTemplate({
              ...multiTpl,
              id: undefined,
              name: separateName,
              body: multiTpl.body,
              htmlBody: multiTpl.htmlBody,
              dynamicFields: multiTpl.dynamicFields,
              headerConfig: multiTpl.headerConfig,
              isActive: multiTpl.isActive ?? true,
            });
          }
        }
        await deleteDocumentTemplate(multiTpl.id);
      });
    }
  }, [templatesList, docTypesCatalog]);

  // Auto-repair any template with corrupted OCR text (e.g. from previous raw OCR uploads)
  useEffect(() => {
    const corruptedTemplates = templatesList.filter((t) => {
      const b = (t.body || '') + (t.htmlBody || '');
      return (
        b.includes('Thisistocerdfy') ||
        b.includes('RacawAD') ||
        b.includes('Salayon ry that') ||
        b.includes('sr Gn') ||
        b.includes('se rotons') ||
        b.includes('indigent facilis') ||
        b.includes('Daerst5') ||
        b.includes('tegat purpose')
      );
    });

    if (corruptedTemplates.length > 0) {
      corruptedTemplates.forEach(async (corrupted) => {
        const docKey = corrupted.name.toLowerCase().includes('indigen')
          ? 'indigency'
          : corrupted.name.toLowerCase().includes('residency')
          ? 'residency'
          : corrupted.name.toLowerCase().includes('no operation') || corrupted.name.toLowerCase().includes('no_operation')
          ? 'no_operation'
          : (corrupted.documentType || 'barangay_certification');
        const struct = getDefaultTemplateStructure(docKey);
        const cleanHtml = buildDefaultHtmlLayout(
          corrupted.documentType || 'barangay_certification',
          sealAlignment,
          layoutStyle,
          sideColumnVerticalSpacing,
          struct.body,
          struct.docTitle,
          struct.salutation,
          struct.closingClause,
          struct.signatoryName,
          struct.signatoryTitle,
          struct.footerNotice,
          struct.sealNotice
        );
        await upsertDocumentTemplate({
          ...corrupted,
          body: struct.body,
          htmlBody: cleanHtml,
          headerConfig: {
            ...corrupted.headerConfig,
            docTitle: struct.docTitle,
            salutation: struct.salutation,
            closingClause: struct.closingClause,
            signatoryName: struct.signatoryName,
            signatoryTitle: struct.signatoryTitle,
            footerNotice: struct.footerNotice,
            sealNotice: struct.sealNotice,
          },
        });
      });
    }
  }, [templatesList, sealAlignment, layoutStyle, sideColumnVerticalSpacing]);

  // Selected Template Object for Details/Edit
  const activeTemplate = useMemo(() => {
    if (selectedTemplateId) {
      return templatesList.find((t) => t.id === selectedTemplateId) ?? null;
    }
    return null;
  }, [selectedTemplateId, templatesList]);

  // Resolved Plain Text Document Preview String
  const liveRenderedPreviewText = useMemo(() => {
    let text = `${editorDocTitle}\n\n${editorSalutation ? `${editorSalutation}\n\n` : ''}${bodyContent || activeTemplate?.body || ''}\n\n${editorClosingClause ? `${editorClosingClause}\n\n` : ''}${editorSignatoryName}\n${editorSignatoryTitle}\n\n${editorFooterNotice}`;

    const formattedKagawadList = kagawadList
      .filter((k) => k.name.trim().length > 0)
      .map((k) => `• ${k.name}${k.committee ? ` (${k.committee})` : ''}`)
      .join('\n');

    const currentYear = new Date().getFullYear();
    const sampleData: Record<string, string> = {
      resident_name: '________________________',
      resident_address: '________________________________________',
      purpose: '________________________',
      day: '________',
      month: '________________',
      year: `${currentYear}`,
      date_issued: `________ day of ________________, ${currentYear}`,
      reference_number: '____________________',
      complainant_name: '________________________',
      case_number: '____________________',
      date_filed: '____________________',
      hearing_date_time: `________ day of ________________, ${currentYear} at ________ o'clock`,
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
  }, [bodyContent, editorDocTitle, editorSalutation, editorClosingClause, editorSignatoryName, editorSignatoryTitle, editorFooterNotice, activeTemplate, dynamicFieldsInput, barangayText, cityText, punongBarangay, barangaySecretary, barangayTreasurer, kagawadList, barangayAddress, barangayEmail, barangayPhone]);

  // Resolved Rich HTML Document Preview String (Substituting All Dynamic Variables from System Inputs)
  const liveRenderedPreviewHtml = useMemo(() => {
    let html = buildDefaultHtmlLayout(
      editorDocType || activeTemplate?.documentType || 'barangay_certification',
      sealAlignment,
      layoutStyle,
      sideColumnVerticalSpacing,
      bodyContent || activeTemplate?.body || '',
      editorDocTitle,
      editorSalutation,
      editorClosingClause,
      editorSignatoryName,
      editorSignatoryTitle,
      editorFooterNotice,
      editorSealNotice
    );

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
    // Dynamic Substitution Object mapping system variables to active system inputs:
    // - Officials & administrative names (City, Barangay, Punong Barangay, etc.) render naturally without unnecessary underlines.
    // - Variable placeholders (Resident Name, Address, Purpose, Day, Month, etc.) render clean inline underlines without awkward justification gaps.
    const sampleData: Record<string, string> = {
      resident_name: '<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>',
      resident_address: '<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>',
      purpose: '<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>',
      day: '<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>',
      month: '<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>',
      year: `${currentYear}`,
      date_issued: `<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u> day of <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>, ${currentYear}`,
      reference_number: '<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>',
      complainant_name: '<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>',
      case_number: '<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>',
      date_filed: '<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>',
      hearing_date_time: `<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u> day of <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>, ${currentYear} at <u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u> o'clock`,
      business_name: '<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>',
      permit_type: 'Construction Permit',
      barangay_name: barangayText.trim() || 'BARANGAY PROGRESO',
      city: cityText.trim() || 'City Of San Juan',
      punong_barangay: punongBarangay.trim() || 'CESAR JR. H. STO. DOMINGO',
      barangay_secretary: barangaySecretary.trim() || 'Ma. Theresa R. Dela Cruz',
      barangay_treasurer: barangayTreasurer.trim() || 'Saturnina C. Mirata',
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

    const fields = [...dynamicFieldsInput.split(',').map((f) => f.trim()).filter(Boolean), ...customVariables];
    fields.forEach((field) => {
      const replacement = sampleData[field] ?? sampleData[field.toLowerCase()] ?? `<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>`;
      html = html.replaceAll(`{{${field}}}`, replacement);
    });

    Object.entries(sampleData).forEach(([key, val]) => {
      html = html.replaceAll(`{{${key}}}`, val);
    });

    // Replace any remaining custom {{variables}} in the text with clean underlines
    html = html.replace(/\{\{([a-zA-Z0-9_-]+)\}\}/g, (_match, varKey) => {
      const val = sampleData[varKey] ?? sampleData[varKey.toLowerCase()];
      if (val !== undefined) return val;
      return '<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>';
    });

    // Clean up any double/nested <u> tags
    html = html.replace(/<u\b[^>]*>\s*(<u\b[^>]*>[\s\S]*?<\/u>)\s*<\/u>/gi, '$1');

    // If template does not contain any watermark element, inject it dynamically into the document
    if (!html.includes('Barangay Seal Watermark') && !html.includes('doc-watermark')) {
      if (html.includes('<!-- MAIN CONTENT LAYER (Z-INDEX 2) -->')) {
        html = html.replace('<!-- MAIN CONTENT LAYER (Z-INDEX 2) -->', `${dynamicWatermarkHtml}\n<!-- MAIN CONTENT LAYER (Z-INDEX 2) -->`);
      } else {
        html = `${dynamicWatermarkHtml}\n${html}`;
      }
    }

    return html;
  }, [bodyContent, editorDocTitle, editorSalutation, editorClosingClause, editorSignatoryName, editorSignatoryTitle, editorFooterNotice, editorSealNotice, activeTemplate, editorDocType, cityLogoUrl, barangayLogoUrl, countryLogoUrl, sealAlignment, layoutStyle, sideColumnVerticalSpacing, dynamicFieldsInput, barangayText, cityText, punongBarangay, barangaySecretary, barangayTreasurer, kagawadList, barangayAddress, barangayEmail, barangayPhone]);

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
      const docType = template.documentType ?? 'barangay_certification';
      const isLupon = docType.includes('lupon') || docType.includes('summons') || docType.includes('patawag');
      const targetLayout = isLupon ? 'single_column' : 'two_column_sidebar';
      setLayoutStyle(targetLayout);
      setSelectedTemplateId(template.id);
      setEditorName(template.name);
      setEditorDocType(docType);

      // Auto-match Purpose from Document Types Catalog
      const docCatalogItem = docTypesCatalog.find((d) => d.id === docType);
      const matchedPurposes = (docCatalogItem?.purposes || []).filter((p) =>
        template.name.toLowerCase().includes(p.toLowerCase())
      );
      setEditorPurposes(matchedPurposes);

      setEditorSourceType(template.sourceType ?? 'custom');
      setEditorFileName(template.originalFileName ?? '');
      
      const struct = getDefaultTemplateStructure(
        template.name.toLowerCase().includes('indigen')
          ? 'indigency'
          : template.name.toLowerCase().includes('residency')
          ? 'residency'
          : template.name.toLowerCase().includes('no operation') || template.name.toLowerCase().includes('no_operation')
          ? 'no_operation'
          : docType
      );

      const isCorrupted =
        (template.body && (
          template.body.includes('Thisistocerdfy') ||
          template.body.includes('RacawAD') ||
          template.body.includes('Salayon ry that') ||
          template.body.includes('sr Gn') ||
          template.body.includes('se rotons') ||
          template.body.includes('indigent facilis') ||
          template.body.includes('Daerst5')
        )) ||
        (template.htmlBody && (
          template.htmlBody.includes('Thisistocerdfy') ||
          template.htmlBody.includes('RacawAD')
        ));

      const safeDocTitle = isCorrupted
        ? struct.docTitle
        : (template.headerConfig?.docTitle ?? struct.docTitle);
      const safeBody = isCorrupted
        ? struct.body
        : (template.body !== undefined && template.body !== '' ? template.body : struct.body);

      setEditorDocTitle(safeDocTitle);
      setEditorSalutation(template.headerConfig?.salutation ?? struct.salutation);
      setBodyContent(safeBody);
      setEditorClosingClause(template.headerConfig?.closingClause ?? struct.closingClause);
      setEditorSignatoryName(template.headerConfig?.signatoryName ?? struct.signatoryName);
      setEditorSignatoryTitle(template.headerConfig?.signatoryTitle ?? struct.signatoryTitle);
      setEditorFooterNotice(template.headerConfig?.footerNotice ?? struct.footerNotice);
      setEditorSealNotice(template.headerConfig?.sealNotice ?? struct.sealNotice);

      setDynamicFieldsInput((template.dynamicFields || []).join(','));
      const systemFieldNames = new Set(SYSTEM_DYNAMIC_TAGS.map((t) => t.fieldName));
      const extractedCustom = Array.from(
        new Set((template.dynamicFields || []).filter((f) => !systemFieldNames.has(f)))
      );
      setCustomVariables(extractedCustom);
      setNewCustomVarName('');
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
      const defaultDocType = docTypesCatalog[0]?.id || 'barangay_certification';
      const docObj = docTypesCatalog.find((d) => d.id === defaultDocType);
      const struct = getDefaultTemplateStructure(defaultDocType);
      setSelectedTemplateId(null);
      setEditorName(`${docObj?.name || 'Barangay Certification'} Template`);
      setEditorDocType(defaultDocType);
      setEditorPurposes([]);
      setEditorSourceType('custom');
      setEditorFileName('');
      setEditorDocTitle(struct.docTitle);
      setEditorSalutation(struct.salutation);
      setBodyContent(struct.body);
      setEditorClosingClause(struct.closingClause);
      setEditorSignatoryName(struct.signatoryName);
      setEditorSignatoryTitle(struct.signatoryTitle);
      setEditorFooterNotice(struct.footerNotice);
      setEditorSealNotice(struct.sealNotice);
      setDynamicFieldsInput('resident_name,resident_address,purpose,date_issued,punong_barangay');
      setCustomVariables([]);
      setNewCustomVarName('');
      setIsActive(true);
      setEditorIsOverwritten(false);
    }
    setEditorTab('visual');
    setViewMode('editor');
  };

  // Switch Document Type in Editor & Update Default Layout & Purposes
  const handleEditorDocTypeChange = (newDocType: string) => {
    setEditorDocType(newDocType);
    const isLupon = newDocType.includes('lupon') || newDocType.includes('summons') || newDocType.includes('patawag');
    const targetLayout = isLupon ? 'single_column' : 'two_column_sidebar';
    setLayoutStyle(targetLayout);
    setEditorPurposes([]);
    const docObj = docTypesCatalog.find((d) => d.id === newDocType);
    const struct = getDefaultTemplateStructure(newDocType);
    if (docObj) {
      setEditorName(`${docObj.name} Template`);
    }
    setEditorDocTitle(struct.docTitle);
    setEditorSalutation(struct.salutation);
    setBodyContent(struct.body);
    setEditorClosingClause(struct.closingClause);
    setEditorSignatoryName(struct.signatoryName);
    setEditorSignatoryTitle(struct.signatoryTitle);
    setEditorFooterNotice(struct.footerNotice);
    setEditorSealNotice(struct.sealNotice);
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
    const struct = getDefaultTemplateStructure(editorDocType);
    setEditorDocTitle(struct.docTitle);
    setEditorSalutation(struct.salutation);
    setBodyContent(struct.body);
    setEditorClosingClause(struct.closingClause);
    setEditorSignatoryName(struct.signatoryName);
    setEditorSignatoryTitle(struct.signatoryTitle);
    setEditorFooterNotice(struct.footerNotice);
    setEditorSealNotice(struct.sealNotice);
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
      if (type === 'country') {
        setCountryLogoUrl(url);
        saveBarangayOfficialSettings({ countryLogoUrl: url });
      } else if (type === 'city') {
        setCityLogoUrl(url);
        saveBarangayOfficialSettings({ cityLogoUrl: url });
      } else {
        setBarangayLogoUrl(url);
        saveBarangayOfficialSettings({ barangayLogoUrl: url, watermarkLogoUrl: url });
      }
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

    const docTypeObj = docTypesCatalog.find((d) => d.id === wizardDocType);
    const docLabel = docTypeObj?.name || 'Barangay Document';

    // Check if a template for the exact same purpose/name already exists
    const targetPurpose = wizardPurposes.length === 1 ? wizardPurposes[0] : null;
    const existing = templatesList.find((t) => {
      if (targetPurpose && t.name.toLowerCase().includes(targetPurpose.toLowerCase())) {
        return true;
      }
      if (wizardPurposes.length === 0 && t.name.trim().toLowerCase() === `${docLabel} Template`.toLowerCase()) {
        return true;
      }
      return false;
    });

    if (existing) {
      // Prompt user whether to override or create as new
      setOverwriteModal({
        isOpen: true,
        existingTemplate: existing,
      });
      return;
    }

    // Proceed directly if no matching template found
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

      const docTypeObj = docTypesCatalog.find((d) => d.id === wizardDocType);
      const docLabel = docTypeObj?.name || 'Barangay Document';

      // Intelligent Detection of Document Purpose and Title
      const combinedDocHints = `${wizardDocType} ${wizardPurposes.join(' ')} ${fileName} ${extractedText}`.toLowerCase();
      
      let effectiveDocKey = wizardDocType;
      let detectedTitle = '';

      if (combinedDocHints.includes('indigen') || combinedDocHints.includes('indigent')) {
        effectiveDocKey = 'indigency';
        detectedTitle = 'CERTIFICATE OF INDIGENCY';
      } else if (combinedDocHints.includes('no_operation') || combinedDocHints.includes('no operation')) {
        effectiveDocKey = 'no_operation';
        detectedTitle = 'CERTIFICATE OF NO OPERATION';
      } else if (combinedDocHints.includes('residency') || combinedDocHints.includes('resident')) {
        effectiveDocKey = 'residency';
        detectedTitle = 'CERTIFICATE OF RESIDENCY';
      } else if (combinedDocHints.includes('death')) {
        effectiveDocKey = 'death';
        detectedTitle = 'BARANGAY DEATH CERTIFICATION';
      } else if (combinedDocHints.includes('pwd') || combinedDocHints.includes('senior')) {
        effectiveDocKey = 'pwd';
        detectedTitle = 'BARANGAY CERTIFICATION';
      } else if (combinedDocHints.includes('health')) {
        effectiveDocKey = 'health';
        detectedTitle = 'BARANGAY CERTIFICATION';
      } else if (combinedDocHints.includes('employment') || combinedDocHints.includes('job')) {
        effectiveDocKey = 'employment';
        detectedTitle = 'BARANGAY CERTIFICATION';
      } else if (combinedDocHints.includes('police') || combinedDocHints.includes('nbi') || combinedDocHints.includes('court')) {
        effectiveDocKey = 'police_nbi';
        detectedTitle = 'BARANGAY CLEARANCE';
      } else if (combinedDocHints.includes('cfa') || combinedDocHints.includes('file_action')) {
        effectiveDocKey = 'cfa';
        detectedTitle = 'CERTIFICATE TO FILE ACTION';
      } else if (combinedDocHints.includes('lupon') || combinedDocHints.includes('summons') || combinedDocHints.includes('patawag')) {
        effectiveDocKey = 'lupon';
        detectedTitle = '= S U M M O N S =';
      } else if (combinedDocHints.includes('business')) {
        effectiveDocKey = 'business';
        detectedTitle = 'BARANGAY BUSINESS CLEARANCE';
      }

      const fallbackStruct = getDefaultTemplateStructure(effectiveDocKey);
      const parsedOcrStruct = parseExtractedDocumentText(extractedText, fallbackStruct);
      const effectiveDocTitle = detectedTitle || parsedOcrStruct.docTitle;

      // Auto-assign matching purposes if Indigency or specific purpose was detected
      let effectivePurposes = [...wizardPurposes];
      if (effectivePurposes.length === 0 && effectiveDocKey === 'indigency') {
        effectivePurposes = ['Certificate of Indigency'];
      }

      setSelectedTemplateId(targetTemplateId);
      setEditorDocType(wizardDocType);
      setEditorPurposes(effectivePurposes);
      if (effectivePurposes.length === 1) {
        setEditorName(`${docLabel} - ${effectivePurposes[0]}`);
      } else {
        setEditorName(customTemplateName || `${docLabel} - ${effectiveDocTitle}`);
      }
      setEditorSourceType('uploaded');
      setEditorFileName(uploadedFile.name);
      setEditorIsOverwritten(Boolean(targetTemplateId));

      setEditorDocTitle(effectiveDocTitle);
      setEditorSalutation(parsedOcrStruct.salutation);
      setEditorClosingClause(parsedOcrStruct.closingClause);
      setEditorSignatoryName(parsedOcrStruct.signatoryName);
      setEditorSignatoryTitle(parsedOcrStruct.signatoryTitle);
      setEditorFooterNotice(parsedOcrStruct.footerNotice);
      setEditorSealNotice(parsedOcrStruct.sealNotice);

      // Set authentic parsed body text from uploaded/OCR scanned document
      const cleanedBody = parsedOcrStruct.body;
      setBodyContent(cleanedBody);

      if (extractedHtml && extractedHtml.trim().length > 20 && fileExt === 'docx') {
        setHtmlContent(extractedHtml);
      } else {
        setHtmlContent(
          buildDefaultHtmlLayout(
            wizardDocType,
            sealAlignment,
            layoutStyle,
            sideColumnVerticalSpacing,
            cleanedBody,
            effectiveDocTitle,
            parsedOcrStruct.salutation,
            parsedOcrStruct.closingClause,
            parsedOcrStruct.signatoryName,
            parsedOcrStruct.signatoryTitle,
            parsedOcrStruct.footerNotice,
            parsedOcrStruct.sealNotice
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
          : `Document "${uploadedFile.name}" analyzed successfully! Loaded ${effectiveDocTitle} with verified dynamic tags.`,
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

  // Save Template into Supabase & System State with Multi-Purpose Support
  const handleSaveTemplate = async (
    event?: FormEvent<HTMLFormElement>,
    overwriteConfirmed = false,
    saveAsNewCopy = false,
    customOverrideTargetId?: string
  ) => {
    if (event) event.preventDefault();

    const docCatalogItem = docTypesCatalog.find((d) => d.id === editorDocType);
    const docName = docCatalogItem?.name || 'Barangay Document';

    // If multiple purposes are selected: generate separate individual template file for each purpose
    if (editorPurposes.length > 1) {
      const dynamicFields = dynamicFieldsInput.split(',').map((f) => f.trim()).filter(Boolean);
      let count = 0;

      // If an existing single bundle template existed, remove it so it doesn't linger as a duplicate
      if (selectedTemplateId) {
        await deleteDocumentTemplate(selectedTemplateId).catch(() => {});
      }

      for (const purpose of editorPurposes) {
        const templateName = `${docName} - ${purpose}`;
        const autoCompiledHtml = buildDefaultHtmlLayout(
          editorDocType,
          sealAlignment,
          layoutStyle,
          sideColumnVerticalSpacing,
          bodyContent,
          editorDocTitle,
          editorSalutation,
          editorClosingClause,
          editorSignatoryName,
          editorSignatoryTitle,
          editorFooterNotice,
          editorSealNotice
        );
        await upsertDocumentTemplate({
          name: templateName,
          documentType: editorDocType,
          sourceType: editorSourceType,
          originalFileName: editorFileName,
          body: bodyContent || getDefaultPlainWording(editorDocType),
          htmlBody: autoCompiledHtml,
          previewImageUrl: uploadedFilePreviewUrl || undefined,
          dynamicFields,
          headerConfig: {
            showLogo,
            showSeal,
            fontFamily,
            alignment,
            cityText,
            barangayText,
            docTitle: editorDocTitle,
            salutation: editorSalutation,
            closingClause: editorClosingClause,
            signatoryName: editorSignatoryName,
            signatoryTitle: editorSignatoryTitle,
            footerNotice: editorFooterNotice,
            sealNotice: editorSealNotice,
          },
          isActive,
          isOverwritten: false,
        });
        count++;
      }

      setFeedback({
        tone: 'success',
        text: isFil
          ? `Matagumpay na nakagawa ng ${count} hiwalay na mga template file (bawat isa ay may sariling pangalan at layunin)!`
          : `Successfully saved ${count} separate templates for each selected purpose!`,
      });
      setViewMode('list');
      return;
    }

    if (!editorName.trim()) {
      setFeedback({
        tone: 'error',
        text: isFil ? 'Pakilagay ang pangalan ng template.' : 'Please enter a template name.',
      });
      return;
    }

    // Check if saving a new template that conflicts with an existing one with the exact same name
    if (!selectedTemplateId && !overwriteConfirmed && !saveAsNewCopy) {
      const conflicting = templatesList.find(
        (t) => t.name.trim().toLowerCase() === editorName.trim().toLowerCase()
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
    const autoCompiledHtml = buildDefaultHtmlLayout(
      editorDocType,
      sealAlignment,
      layoutStyle,
      sideColumnVerticalSpacing,
      bodyContent,
      editorDocTitle,
      editorSalutation,
      editorClosingClause,
      editorSignatoryName,
      editorSignatoryTitle,
      editorFooterNotice,
      editorSealNotice
    );

    await upsertDocumentTemplate({
      id: targetId ?? undefined,
      name: finalName,
      documentType: editorDocType,
      sourceType: editorSourceType,
      originalFileName: editorFileName,
      body: bodyContent || getDefaultPlainWording(editorDocType),
      htmlBody: autoCompiledHtml,
      previewImageUrl: uploadedFilePreviewUrl || undefined,
      dynamicFields,
      headerConfig: {
        showLogo,
        showSeal,
        fontFamily,
        alignment,
        cityText,
        barangayText,
        docTitle: editorDocTitle,
        salutation: editorSalutation,
        closingClause: editorClosingClause,
        signatoryName: editorSignatoryName,
        signatoryTitle: editorSignatoryTitle,
        footerNotice: editorFooterNotice,
        sealNotice: editorSealNotice,
      },
      isActive,
      isOverwritten: shouldMarkOverwritten,
    });

    setOverwriteSaveModal(null);
    setFeedback({
      tone: 'success',
      text: shouldMarkOverwritten
        ? isFil
          ? `Ang template na "${finalName}" ay na-save at ito na ang aktibong overridden template sa system.`
          : `Template "${finalName}" has been saved and is now the active overridden template for the system.`
        : isFil
        ? `Matagumpay na na-save ang template na "${finalName}"!`
        : `Template "${finalName}" saved successfully!`,
    });
    setViewMode('list');
  };

  // Delete Template permanently
  const handleDeleteTemplate = async (idToDelete: string) => {
    await deleteDocumentTemplate(idToDelete);
    setFeedback({
      tone: 'success',
      text: isFil ? 'Matagumpay na natanggal ang template.' : 'Template deleted successfully.',
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
    saveBarangayOfficialSettings({
      cityName: cityText.trim(),
      barangayName: barangayText.trim(),
      barangayAddress: barangayAddress.trim(),
      barangayEmail: barangayEmail.trim(),
      barangayPhone: barangayPhone.trim(),
      punongBarangay: punongBarangay.trim(),
      barangaySecretary: barangaySecretary.trim(),
      barangayTreasurer: barangayTreasurer.trim(),
      kagawadList,
      countryLogoUrl,
      cityLogoUrl,
      barangayLogoUrl,
    });
    setFeedback({
      tone: 'success',
      text: isFil
        ? 'Matagumpay na na-update ang impormasyon ng barangay at mga opisyal! Na-refresh ang lahat ng dynamic template variables.'
        : 'Barangay & Official Information updated successfully! Dynamic template variables refreshed across all documents.',
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

  // Add Custom Variable
  const handleAddCustomVariable = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const raw = newCustomVarName.trim();
    if (!raw) return;
    const cleanVar = raw
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^_+|_+$/g, '');

    if (!cleanVar) return;
    const tag = `{{${cleanVar}}}`;

    if (!customVariables.includes(cleanVar)) {
      setCustomVariables((prev) => Array.from(new Set([...prev, cleanVar])));
    }

    if (!dynamicFieldsInput.includes(cleanVar)) {
      setDynamicFieldsInput((prev) => (prev ? `${prev},${cleanVar}` : cleanVar));
    }

    handleInsertTag(tag, cleanVar);
    setNewCustomVarName('');
    setFeedback({
      tone: 'success',
      text: isFil
        ? `Matagumpay na naidagdag ang custom variable na "${tag}"!`
        : `Custom variable "${tag}" added and inserted!`,
    });
  };

  // Remove Custom Variable
  const handleRemoveCustomVariable = (varName: string) => {
    setCustomVariables((prev) => prev.filter((v) => v !== varName));
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
            {isFil ? `Aklatan ng Template (${templatesList.length})` : `Template Library (${templatesList.length})`}
          </button>

          <button
            type="button"
            onClick={() => setMainTab('document_types_purposes')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              mainTab === 'document_types_purposes'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ListOrdered className="h-4 w-4" />
            {isFil ? `Mga Uri ng Dokumento at Layunin (${docTypesCatalog.length})` : `Document Types & Purposes (${docTypesCatalog.length})`}
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
            {isFil ? 'Impormasyon ng Barangay at Opisyal' : 'Barangay & Official Information'}
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 1: TEMPLATE LIBRARY LIST                                             */}
      {/* ========================================================================= */}
      {viewMode === 'list' && mainTab === 'library' && (
        <SectionCard
          title={isFil ? 'Mga Template ng Dokumento' : 'Document Templates'}
          description={isFil ? 'Mga opisyal na template ng dokumento ng barangay na aktibo sa system.' : 'Official barangay document templates active in the system.'}
          actions={
            <>
              <button
                type="button"
                onClick={() => setViewMode('upload_wizard')}
                className="inline-flex items-center gap-2 rounded-md border border-emerald-600 bg-emerald-50/40 px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all shadow-2xs cursor-pointer"
              >
                <Upload className="h-4 w-4" />
                {isFil ? 'Mag-upload ng Template' : 'Upload Template'}
              </button>
              <button
                type="button"
                onClick={() => handleOpenEditor()}
                className="inline-flex items-center gap-2 rounded-md border border-emerald-600 bg-emerald-50/40 px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all shadow-2xs cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                {isFil ? 'Gumawa ng Template' : 'Create Template'}
              </button>
            </>
          }
        >

          {/* Single-Line Search & Filters Grid */}
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            <div className="relative sm:col-span-6">
              <Input
                placeholder={isFil ? 'Maghanap ng template...' : 'Search templates...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full"
              />
            </div>

            <div className="sm:col-span-3">
              <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-10 w-full">
                <option value="all">{isFil ? 'Lahat ng Uri ng Dokumento' : 'All Document Types'}</option>
                {docTypesCatalog.map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="sm:col-span-3">
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 w-full">
                <option value="all">{isFil ? 'Lahat ng Katayuan' : 'All Status'}</option>
                <option value="active">{isFil ? 'Aktibo' : 'Active'}</option>
                <option value="overwritten">{isFil ? 'Na-overwrite' : 'Overwritten'}</option>
                <option value="custom">{isFil ? 'Custom / Na-upload' : 'Custom / Uploaded'}</option>
                <option value="inactive">{isFil ? 'Hindi Aktibo' : 'Inactive'}</option>
              </Select>
            </div>
          </div>

          {filteredTemplates.length === 0 ? (
            <EmptyState
              title={isFil ? 'Walang nahanap na template' : 'No templates found'}
              description={isFil ? 'Walang template ng dokumento na tumugma sa iyong paghahanap.' : 'No document templates matched your search criteria.'}
            />
          ) : (
            <div className="overflow-hidden bg-white">
              <Table className="w-full min-w-[900px] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[35%] px-4 text-center text-sm normal-case tracking-normal text-[color:var(--portal-ink-700)]">
                      {isFil ? 'Template' : 'Template'}
                    </TableHead>
                    <TableHead className="w-[25%] px-4 text-center text-sm normal-case tracking-normal text-[color:var(--portal-ink-700)]">
                      {isFil ? 'Uri ng Dokumento' : 'Document type'}
                    </TableHead>
                    <TableHead className="w-[12%] px-4 text-center text-sm normal-case tracking-normal text-[color:var(--portal-ink-700)]">
                      {isFil ? 'Katayuan' : 'Status'}
                    </TableHead>
                    <TableHead className="w-[13%] px-4 text-center text-sm normal-case tracking-normal text-[color:var(--portal-ink-700)]">
                      {isFil ? 'Huling Na-update' : 'Updated'}
                    </TableHead>
                    <TableHead className="w-[15%] px-4 text-center text-sm normal-case tracking-normal text-[color:var(--portal-ink-700)]">
                      {isFil ? 'Aksyon' : 'Actions'}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
              {paginatedTemplates.map((item) => {
                const itemDocType = item.documentType || '';
                const docTypeObj = docTypesCatalog.find(
                  (d) =>
                    (itemDocType && d.id === itemDocType) ||
                    (itemDocType && d.name.toLowerCase() === itemDocType.toLowerCase()) ||
                    (itemDocType && d.categoryId === itemDocType)
                );
                const isUploaded = item.sourceType === 'uploaded';
                const isCustom = item.sourceType === 'custom' || !docTypesCatalog.some((dt) => dt.id === itemDocType);
                const typeLabel = docTypeObj?.name || (isUploaded ? (isFil ? 'Na-upload na (.docx) Template' : 'Uploaded (.docx) Template') : isCustom ? (isFil ? 'Custom na Template' : 'Custom Template') : (isFil ? 'Dokumento ng Barangay' : 'Barangay Document'));
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
                              {isFil ? 'Na-overwrite' : 'Overwritten'}
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
                        {isOverwritten ? (isFil ? 'Na-overwrite' : 'Overwritten') : isActive ? (isFil ? 'Aktibo' : 'Active') : (isFil ? 'Hindi Aktibo' : 'Inactive')}
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
                        {isFil ? 'I-edit' : 'Edit'}
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
                  {isFil
                    ? `Ipinapakita ang ${filteredTemplates.length === 0 ? 0 : (templatePage - 1) * templatesPerPage + 1}–${Math.min(templatePage * templatesPerPage, filteredTemplates.length)} sa ${filteredTemplates.length} mga template`
                    : `Showing ${filteredTemplates.length === 0 ? 0 : (templatePage - 1) * templatesPerPage + 1}–${Math.min(templatePage * templatesPerPage, filteredTemplates.length)} of ${filteredTemplates.length} templates`}
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
                    {isFil ? 'Nakaraan' : 'Previous'}
                  </Button>
                  <span className="min-w-16 text-center text-xs font-semibold text-[color:var(--portal-ink-700)]">
                    {templatePage} {isFil ? 'sa' : 'of'} {templatePageCount}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setTemplatePage((page) => Math.min(templatePageCount, page + 1))}
                    disabled={templatePage === templatePageCount}
                    className="border-slate-300 bg-white text-xs text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                  >
                    {isFil ? 'Susunod' : 'Next'}
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
              {isFil ? 'Bumalik sa Aklatan ng Template' : 'Back to Template Library'}
            </Button>

            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={() => handleOpenEditor(activeTemplate)} className="gap-1.5 text-xs">
                <Edit3 className="h-3.5 w-3.5" />
                {isFil ? 'I-edit ang Template' : 'Edit Template'}
              </Button>
              <Button type="button" variant="ghost" onClick={handlePrintDocument} className="gap-1.5 border border-emerald-600 bg-white text-xs text-emerald-700 shadow-sm transition-all hover:bg-emerald-600 hover:text-white hover:shadow-md">
                <Printer className="h-3.5 w-3.5" />
                {isFil ? 'Silipin at I-print' : 'Preview & Print'}
              </Button>
            </div>
          </div>

          <SectionCard
            title={activeTemplate.name}
            description={`${isFil ? 'Opisyal na Template ng Barangay' : 'Official Barangay Template'} • ${activeTemplate.isActive !== false ? (isFil ? 'Aktibo' : 'Active') : (isFil ? 'Hindi Aktibo' : 'Inactive')} • ${isFil ? 'Huling na-update:' : 'Last updated'} ${formatDateTime(activeTemplate.updatedAt, locale)}`}
          >
            <div className="grid gap-6 lg:grid-cols-[minmax(300px,1fr)_minmax(0,1.5fr)]">
              {/* Left Column: Template Information */}
              <div className="space-y-4 rounded-[var(--portal-radius-md)] border border-slate-200 bg-slate-50 p-5 text-xs no-print">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">
                  {isFil ? 'Impormasyon ng Template' : 'Template Information'}
                </h4>

                <div>
                  <p className="text-xs font-medium text-slate-500">
                    {isFil ? 'Uri ng Dokumento' : 'Document Type'}
                  </p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {DOCUMENT_TYPES.find((d) => d.id === activeTemplate.documentType)?.labelEn || activeTemplate.name}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500">
                    {isFil ? 'Pinagmulan' : 'Source'}
                  </p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {activeTemplate.sourceType === 'uploaded'
                      ? (isFil ? 'Na-upload na Template' : 'Uploaded Template')
                      : (isFil ? 'Custom na Template' : 'Custom Built Template')}
                  </p>
                </div>

                {activeTemplate.originalFileName && (
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      {isFil ? 'File Reference' : 'File Reference'}
                    </p>
                    <p className="text-sm font-mono text-emerald-800 font-medium mt-0.5">{activeTemplate.originalFileName}</p>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200">
                  <p className="text-xs font-semibold text-slate-800 mb-2">
                    {isFil
                      ? `Naka-configure na Dynamic Variables (${activeTemplate.dynamicFields?.length || 0}):`
                      : `Configured Dynamic Variables (${activeTemplate.dynamicFields?.length || 0}):`}
                  </p>
                  <div className="space-y-1.5">
                    {(activeTemplate.dynamicFields || []).map((field) => {
                      const tagObj = SYSTEM_DYNAMIC_TAGS.find((t) => t.fieldName === field);
                      return (
                        <div key={field} className="flex items-center justify-between rounded-md bg-white p-2 border border-slate-200 shadow-2xs">
                          <span className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">{`{{${field}}}`}</span>
                          <span className="text-xs text-slate-600 font-medium">{tagObj?.label || 'Dynamic Field'}</span>
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
                  {isFil ? 'AUTHENTIC DOCUMENT CANVAS (1-TO-1 SILIP)' : 'AUTHENTIC DOCUMENT CANVAS (1-TO-1 EXACT PREVIEW)'}
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
          title={isFil ? 'Mag-upload ng Template ng Dokumento' : 'Upload Document Template'}
          description={
            isFil
              ? 'Pumili ng opisyal na file (.docx / PDF / image) mula sa File Explorer. Awtomatikong babasahin ng system ang layout, formatting, at dynamic fields para sa napiling kategorya ng dokumento.'
              : 'Select an official document file (.docx / PDF / image) from File Explorer. System will parse layout, formatting, and dynamic fields for the selected document type category.'
          }
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <FieldLabel label={isFil ? 'Uri ng Dokumento' : 'Document Type'}>
                <Select
                  value={wizardDocType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWizardDocType(val);
                    setWizardPurposes([]);
                  }}
                >
                  {docTypesCatalog.map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {dt.name}
                    </option>
                  ))}
                </Select>
              </FieldLabel>

              <MultiPurposeSelector
                purposes={docTypesCatalog.find((d) => d.id === wizardDocType)?.purposes || []}
                selectedPurposes={wizardPurposes}
                onChange={(updated) => setWizardPurposes(updated)}
                documentTypeName={docTypesCatalog.find((d) => d.id === wizardDocType)?.name || 'Document'}
                locale={locale}
              />

              {/* File Drop & Selection Card */}
              <div className="rounded-[var(--portal-radius-md)] border-2 border-dashed border-blue-200 bg-blue-50/50 p-6 text-center transition-all hover:border-blue-400">
                {!uploadedFile ? (
                  <>
                    <Upload className="mx-auto h-10 w-10 text-blue-500" />
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {isFil ? 'Pumili ng dokumento mula sa File Explorer' : 'Select document from File Explorer'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {isFil ? 'Suportado ang mga .DOCX, .PDF, .PNG, .JPG, .WEBP na file' : 'Supports .DOCX, .PDF, .PNG, .JPG, .WEBP files'}
                    </p>

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
                            {(uploadedFile.size / 1024).toFixed(1)} KB • {isFil ? 'Naka-load sa File Explorer' : 'Updated in File Explorer'}
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={handleClearSelectedFile}
                        className="text-red-600 hover:bg-red-50 text-xs px-2"
                        title={isFil ? 'Alisin o pumili ng ibang file' : 'Remove or select another file'}
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
                        <CheckCircle2 className="h-3.5 w-3.5" /> {isFil ? 'Handa na ang File' : 'File Ready'}
                      </span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-600 font-medium hover:underline cursor-pointer"
                      >
                        {isFil ? 'Pumili ng ibang file...' : 'Choose updated file...'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button type="button" variant="ghost" onClick={() => setViewMode('list')}>
                  {isFil ? 'Kanselahin' : 'Cancel'}
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
                      {isFil ? 'Kinukuha ang Layout ng Dokumento...' : 'Analyzing Document Layout...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      {isFil ? 'Suriin ang Layout ng Template' : 'Run Template Analysis'}
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
                  <h4 className="mt-3 text-sm font-bold text-slate-900">
                    {isFil ? 'Handa na ang Pagkuha ng Layout' : 'Category-Specific Layout Extraction Ready'}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
                    {isFil
                      ? `Awtomatikong babasahin ng system ang layout ng dokumento para sa ${DOCUMENT_TYPES.find(d => d.id === wizardDocType)?.labelEn || 'napiling kategorya'}.`
                      : `The system will read the uploaded file layout and build the exact document format for ${DOCUMENT_TYPES.find(d => d.id === wizardDocType)?.labelEn || 'selected category'}.`}
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
              {isFil ? 'Bumalik sa Aklatan ng Template' : 'Back to Template Library'}
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
                  {isFil ? 'Tanggalin ang Template' : 'Delete Template'}
                </Button>
              ) : null}

              <Button type="button" variant="ghost" onClick={handlePrintDocument} className="gap-1.5 border border-emerald-600 bg-white text-xs text-emerald-700 shadow-sm transition-all hover:bg-emerald-600 hover:text-white hover:shadow-md">
                <Printer className="h-3.5 w-3.5" />
                {isFil ? 'Silipin at I-print' : 'Preview & Print'}
              </Button>

              <Button type="submit" variant="ghost" className="gap-1.5 border border-emerald-600 bg-white text-emerald-700 shadow-sm transition-all hover:bg-emerald-600 hover:text-white hover:shadow-md">
                <Save className="h-4 w-4" />
                {isFil ? 'I-save ang Template' : 'Save Template'}
              </Button>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[330px_minmax(0,1fr)]">
            {/* LEFT SIDEBAR: ELEMENTS, DYNAMIC & CUSTOM VARIABLES, AND FORMATTING SETTINGS */}
            <div className="space-y-4">
              {/* SECTION 1: TEMPLATE ELEMENTS */}
              <div className="space-y-3 rounded-[var(--portal-radius-md)] border border-slate-200 bg-slate-50 p-4 text-xs shadow-2xs">
                <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  <Layout className="h-4 w-4 text-emerald-600" />
                  {isFil ? '1. Mga Elemento ng Template' : '1. Template Elements'}
                </h4>

                <div className="space-y-3">
                  <FieldLabel label={isFil ? 'Uri ng Dokumento' : 'Document Type'}>
                    <Select
                      value={editorDocType}
                      onChange={(e) => handleEditorDocTypeChange(e.target.value)}
                    >
                      {docTypesCatalog.map((dt) => (
                        <option key={dt.id} value={dt.id}>
                          {dt.name}
                        </option>
                      ))}
                    </Select>
                  </FieldLabel>

                  <MultiPurposeSelector
                    purposes={docTypesCatalog.find((d) => d.id === editorDocType)?.purposes || []}
                    selectedPurposes={editorPurposes}
                    onChange={(updated) => {
                      setEditorPurposes(updated);
                      const docObj = docTypesCatalog.find((d) => d.id === editorDocType);
                      if (updated.length === 1) {
                        setEditorName(`${docObj?.name || 'Document'} - ${updated[0]}`);
                      } else {
                        setEditorName(`${docObj?.name || 'Document'} Template`);
                      }
                    }}
                    documentTypeName={docTypesCatalog.find((d) => d.id === editorDocType)?.name || 'Document'}
                    locale={locale}
                  />

                  <FieldLabel label={isFil ? 'Pangalan ng Template' : 'Template Name'}>
                    <Input
                      placeholder={isFil ? 'hal. Barangay Certification - School Requirement' : 'e.g. Barangay Certification - School Requirement'}
                      value={editorName}
                      onChange={(e) => setEditorName(e.target.value)}
                      required
                    />
                  </FieldLabel>
                </div>
              </div>

              {/* SECTION 2: DYNAMIC SYSTEM & CUSTOM VARIABLES */}
              <div className="space-y-3 rounded-[var(--portal-radius-md)] border border-slate-200 bg-slate-50 p-4 text-xs shadow-2xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    {isFil ? '2. Mga Dynamic Variable' : '2. Dynamic Variables'}
                  </h4>
                  <span className="text-[11px] font-medium text-slate-500">
                    {SYSTEM_DYNAMIC_TAGS.length + customVariables.length} {isFil ? 'tag' : 'tags'}
                  </span>
                </div>

                {/* Custom Variable Creator Box */}
                <div className="rounded-lg border border-emerald-200/90 bg-emerald-50/60 p-3 space-y-2">
                  <label className="block text-xs font-semibold text-emerald-950">
                    {isFil ? '+ Magdagdag ng Custom Variable:' : '+ Add Custom Variable:'}
                  </label>
                  <div className="flex gap-1.5">
                    <Input
                      type="text"
                      placeholder={isFil ? 'hal. ctc_no, or_no, status...' : 'e.g. ctc_no, or_no, status...'}
                      value={newCustomVarName}
                      onChange={(e) => setNewCustomVarName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomVariable();
                        }
                      }}
                      className="text-xs h-8 bg-white border-emerald-300 focus-visible:ring-emerald-500"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddCustomVariable}
                      disabled={!newCustomVarName.trim()}
                      className="h-8 px-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium shrink-0 gap-1 cursor-pointer shadow-2xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {isFil ? 'Idagdag' : 'Add'}
                    </Button>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-tight">
                    {isFil
                      ? 'Awtomatikong magiging {{tag}} at puwedeng i-click para ilagay sa dokumento.'
                      : 'Will become a clickable {{tag}} to insert into your document.'}
                  </p>
                </div>

                {/* Custom Variables Pills */}
                {customVariables.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-xs font-semibold text-slate-700">
                      {isFil ? 'Mga Custom Variable Mo:' : 'Your Custom Variables:'}
                    </p>
                    <div className="flex flex-wrap gap-1 max-h-[110px] overflow-y-auto">
                      {Array.from(new Set(customVariables)).map((cv, idx) => (
                        <div
                          key={`custom-var-${cv}-${idx}`}
                          className="group inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-300 px-2 py-0.5 font-mono text-xs text-amber-900 shadow-2xs hover:bg-amber-100 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => handleInsertTag(`{{${cv}}}`, cv)}
                            className="cursor-pointer font-medium hover:underline"
                            title={isFil ? 'I-click upang ilagay sa dokumento' : 'Click to insert into document'}
                          >
                            {`{{${cv}}}`}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomVariable(cv)}
                            className="text-amber-700 hover:text-red-600 transition-colors ml-0.5 cursor-pointer"
                            title={isFil ? 'Tanggalin' : 'Remove'}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* System Variables List */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-700">
                      {isFil ? 'System Dynamic Variables:' : 'System Variables:'}
                    </p>
                    <span className="text-[11px] text-slate-400">
                      {filteredSystemTags.length} {isFil ? 'magagamit' : 'available'}
                    </span>
                  </div>

                  {/* Quick Search for Variables */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={isFil ? 'Maghanap ng variable...' : 'Search variable...'}
                      value={variableSearch}
                      onChange={(e) => setVariableSearch(e.target.value)}
                      className="w-full text-xs rounded-md border border-slate-200 bg-white px-2.5 pr-7 py-1.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-400 text-slate-800"
                    />
                    {variableSearch && (
                      <button
                        type="button"
                        onClick={() => setVariableSearch('')}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Quick Category Chips */}
                  <div className="flex flex-wrap gap-1">
                    {[
                      { id: 'all', label: isFil ? 'Lahat' : 'All' },
                      { id: 'resident', label: isFil ? 'Residente' : 'Resident' },
                      { id: 'date', label: isFil ? 'Petsa' : 'Date' },
                      { id: 'officials', label: isFil ? 'Opisyal' : 'Officials' },
                      { id: 'lupon', label: 'Lupon' },
                      { id: 'business', label: isFil ? 'Negosyo' : 'Business' },
                      { id: 'seals', label: isFil ? 'Seal' : 'Seals' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setVarCategoryFilter(cat.id)}
                        className={`px-2 py-0.5 rounded text-[10.5px] font-medium transition-colors cursor-pointer ${
                          varCategoryFilter === cat.id
                            ? 'bg-emerald-700 text-white shadow-2xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Variables List */}
                  <div className="flex flex-col gap-1 max-h-[230px] overflow-y-auto pr-1 scrollbar-thin">
                    {filteredSystemTags.length === 0 ? (
                      <p className="py-3 text-center text-xs text-slate-400">
                        {isFil ? 'Walang nahanap na variable.' : 'No variables found.'}
                      </p>
                    ) : (
                      filteredSystemTags.map((st) => (
                        <button
                          key={st.tag}
                          type="button"
                          onClick={() => handleInsertTag(st.tag, st.fieldName)}
                          className="group text-left rounded-md bg-white p-1.5 text-xs border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 hover:shadow-2xs flex items-center justify-between gap-2 transition-all cursor-pointer"
                          title={`${st.label} - ${isFil ? 'I-click para ilagay' : 'Click to insert'}`}
                        >
                          <span className="font-mono text-[11px] font-semibold text-emerald-800 bg-emerald-50/90 px-1.5 py-0.5 rounded border border-emerald-200/80 group-hover:bg-emerald-100 group-hover:border-emerald-300 shrink-0">
                            {st.tag}
                          </span>
                          <span className="text-[11px] text-slate-600 truncate flex-1 text-right group-hover:text-emerald-950 font-medium">
                            {st.label}
                          </span>
                          <Plus className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:text-emerald-700 shrink-0 transition-opacity" />
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 3: FORMATTING & LAYOUT SETTINGS (Moved underneath in sidebar!) */}
              <div className="space-y-3 rounded-[var(--portal-radius-md)] border border-slate-200 bg-slate-50 p-4 text-xs shadow-2xs">
                <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  <Settings className="h-4 w-4 text-slate-600" />
                  {isFil ? '3. Settings sa Formatting' : '3. Formatting Settings'}
                </h4>

                <div className="space-y-3 bg-white p-3 rounded-lg border border-slate-200">
                  <FieldLabel label={isFil ? 'Font Family' : 'Font Family'}>
                    <Select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
                      <option value="Arial">Arial</option>
                      <option value="Bookman Old Style">Bookman Old Style</option>
                      <option value="Times New Roman">Times New Roman</option>
                    </Select>
                  </FieldLabel>

                  <FieldLabel label={isFil ? 'Alignment ng Header' : 'Header Alignment'}>
                    <Select value={alignment} onChange={(e) => setAlignment(e.target.value as 'left' | 'center' | 'right')}>
                      <option value="center">{isFil ? 'Nasa Gitna (Centered)' : 'Centered'}</option>
                      <option value="left">{isFil ? 'Nasa Kaliwa (Left Aligned)' : 'Left Aligned'}</option>
                    </Select>
                  </FieldLabel>

                  <FieldLabel label={isFil ? 'Ayos ng mga Seal / Logo' : 'Seal Placement Arrangement'}>
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
                      <option value="centered">{isFil ? '3 Seal sa Gitna sa Itaas (Progreso Style)' : '3 Seals Centered Top Row (Barangay Progreso Style)'}</option>
                      <option value="side_by_side">{isFil ? 'Magkatabi (Kaliwa at Kanang Seal)' : 'Side-by-Side (Left & Right Seals)'}</option>
                      <option value="stacked">{isFil ? 'Naka-patong na Vertical Seal' : 'Stacked Vertical Seals'}</option>
                    </Select>
                  </FieldLabel>

                  <FieldLabel label={isFil ? 'Layout at Sidebar ng Dokumento' : 'Document Structure & Sidebar Layout'}>
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
                      <option value="two_column_sidebar">{isFil ? '2-Column Layout (May Kagawad Sidebar sa Kaliwa)' : '2-Column Layout (With Left Kagawad Roster Sidebar)'}</option>
                      <option value="single_column">{isFil ? 'Standard 1-Column Layout' : 'Standard 1-Column Layout'}</option>
                    </Select>
                  </FieldLabel>

                  {layoutStyle === 'two_column_sidebar' && (
                    <FieldLabel label={isFil ? 'Vertical Spacing ng Sidebar' : 'Side Column Vertical Spacing'}>
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
                        <option value="compact">{isFil ? 'Compact (Kalahating Pahina ~50%)' : 'Compact (Half Page Length ~50%)'}</option>
                        <option value="standard">{isFil ? 'Standard (3/4 ng Pahina ~75%)' : 'Standard (3/4 Page Length ~75%)'}</option>
                        <option value="spacious">{isFil ? 'Spacious (Buong Pahina 100%)' : 'Extra Spacious (Full Page Length 100%)'}</option>
                      </Select>
                    </FieldLabel>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT MAIN AREA: DOCUMENT WORDINGS & EXPANDED EXACT PAPER CANVAS */}
            <div className="space-y-4 min-w-0">
              {/* Clean Document Content Editor */}
              <div className="rounded-[var(--portal-radius-md)] border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      {isFil ? 'Nilalaman ng Dokumento (Document Content)' : 'Document Content'}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isFil
                        ? 'I-type ang mga salita ng dokumento at gamitin ang mga dynamic variable sa kaliwang sidebar.'
                        : 'Type or edit document wording and use the dynamic variables from the left sidebar.'}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                    {isFil ? 'Naka-sync sa Canvas' : 'Live Synced'}
                  </span>
                </div>

                {/* Main Body Textarea */}
                <div className="space-y-1">
                  <Textarea
                    value={bodyContent}
                    onChange={(e) => setBodyContent(e.target.value)}
                    placeholder={isFil ? 'I-type ang nilalaman ng dokumento dito...' : 'Type document body content here...'}
                    className="min-h-[150px] font-sans text-xs leading-relaxed text-slate-900 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                    rows={6}
                  />
                </div>

                {/* Simple Collapsible Drawer for Optional Details (Title, Salutation, Signatory, Warnings) */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowExtraFields((prev) => !prev)}
                    className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100/90 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Settings className="h-3.5 w-3.5 text-slate-500" />
                      {isFil
                        ? 'I-customize ang Pamagat, Pagbati, at Pipirma'
                        : 'Customize Title, Salutation & Signatory (Optional)'}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
                        showExtraFields ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {showExtraFields && (
                    <div className="mt-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50/60 space-y-3 text-xs">
                      {/* Row 1: Title & Salutation */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FieldLabel label={isFil ? 'Pamagat ng Dokumento' : 'Document Title / Heading'}>
                          <Input
                            value={editorDocTitle}
                            onChange={(e) => setEditorDocTitle(e.target.value)}
                            placeholder={isFil ? 'hal. CERTIFICATE OF INDIGENCY' : 'e.g. CERTIFICATE OF INDIGENCY'}
                            className="font-bold text-xs uppercase bg-white"
                          />
                        </FieldLabel>

                        <FieldLabel label={isFil ? 'Pagbati / Tatanggap' : 'Salutation / Recipient Line'}>
                          <Input
                            value={editorSalutation}
                            onChange={(e) => setEditorSalutation(e.target.value)}
                            placeholder={isFil ? 'hal. TO WHOM IT MAY CONCERN:' : 'e.g. TO WHOM IT MAY CONCERN:'}
                            className="font-semibold text-xs bg-white"
                          />
                        </FieldLabel>
                      </div>

                      {/* Row 2: Closing Statement */}
                      <FieldLabel label={isFil ? 'Pangwakas na Pahayag / Petsa at Lugar' : 'Closing / Issuance Statement'}>
                        <Input
                          value={editorClosingClause}
                          onChange={(e) => setEditorClosingClause(e.target.value)}
                          placeholder={isFil ? 'hal. Issued this {{date_issued}} at {{barangay_name}}, {{city}}.' : 'e.g. Issued this {{date_issued}} at {{barangay_name}}, {{city}}.'}
                          className="text-xs bg-white"
                        />
                      </FieldLabel>

                      {/* Row 3: Signatory & Seal Notes */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <FieldLabel label={isFil ? 'Pangalan ng Pipirma' : 'Signatory Name'}>
                          <Input
                            value={editorSignatoryName}
                            onChange={(e) => setEditorSignatoryName(e.target.value)}
                            placeholder="{{punong_barangay}}"
                            className="font-semibold text-xs bg-white"
                          />
                        </FieldLabel>

                        <FieldLabel label={isFil ? 'Posisyon / Titulo' : 'Signatory Position'}>
                          <Input
                            value={editorSignatoryTitle}
                            onChange={(e) => setEditorSignatoryTitle(e.target.value)}
                            placeholder="Punong Barangay"
                            className="text-xs bg-white"
                          />
                        </FieldLabel>

                        <FieldLabel label={isFil ? 'Opisyal na Selyo' : 'Seal Note'}>
                          <Input
                            value={editorSealNotice}
                            onChange={(e) => setEditorSealNotice(e.target.value)}
                            placeholder="Not Valid Without Official Seal"
                            className="text-xs bg-white"
                          />
                        </FieldLabel>

                        <FieldLabel label={isFil ? 'Babala sa Alterasyon' : 'Alteration Warning'}>
                          <Input
                            value={editorFooterNotice}
                            onChange={(e) => setEditorFooterNotice(e.target.value)}
                            placeholder="**ALTERATION WILL MAKE THIS VOID**"
                            className="text-xs bg-white"
                          />
                        </FieldLabel>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span>
                    {isFil
                      ? 'I-click ang mga dynamic variable sa kaliwa para awtomatikong mailagay sa dokumento.'
                      : 'Click any variable on the left to insert it directly into your document.'}
                  </span>
                </p>
              </div>

              {/* Canvas Preview Header & Tabs */}
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-1.5 rounded-t-lg">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditorTab('visual')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                      editorTab === 'visual'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {isFil ? 'Eksaktong Papel (Canvas Live Preview)' : 'Exact Paper Canvas (Live Preview)'}
                  </button>

                  {uploadedFilePreviewUrl && (
                    <button
                      type="button"
                      onClick={() => setEditorTab('original_upload')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                        editorTab === 'original_upload'
                          ? 'bg-amber-600 text-white font-bold shadow-xs'
                          : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      {isFil ? 'Orihinal na File' : 'Original Uploaded File'}
                    </button>
                  )}
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => handleRegenerateLayout(sealAlignment, layoutStyle, sideColumnVerticalSpacing)}
                  className="text-[11px] h-6 px-2 text-blue-600 gap-1 cursor-pointer"
                  title={isFil ? 'I-reset ang salita sa opisyal na default ng kategorya' : 'Reset wording to official category default'}
                >
                  <RotateCcw className="h-3 w-3" /> {isFil ? 'I-reset ang Wording' : 'Reset Wording'}
                </Button>
              </div>

              {editorTab === 'original_upload' && uploadedFilePreviewUrl && (
                <div className="rounded-[var(--portal-radius-md)] border border-slate-300 bg-slate-100 p-4 text-center">
                  <p className="text-xs font-bold text-slate-700 mb-3">
                    {isFil ? 'SILIP SA ORIHINAL NA NA-UPLOAD NA FILE' : 'ORIGINAL UPLOADED FILE VIEW'}
                  </p>
                  <img
                    src={uploadedFilePreviewUrl}
                    alt="Original Uploaded File"
                    className="mx-auto max-h-[550px] object-contain border border-slate-300 shadow-md rounded"
                  />
                </div>
              )}

              {/* Exact Paper Canvas Rendered Preview */}
              {editorTab === 'visual' && (
                <div
                  className="rounded-xs border border-slate-300 bg-white p-8 shadow-xl text-slate-900 min-h-[500px]"
                  style={{
                    fontFamily: fontFamily === 'Times New Roman' ? '"Times New Roman", Times, serif' : fontFamily === 'Arial' ? 'Arial, sans-serif' : '"Bookman Old Style", Georgia, serif',
                    textAlign: alignment,
                  }}
                >
                  <div
                    className="w-full text-slate-900 leading-relaxed [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-2"
                    dangerouslySetInnerHTML={{ __html: liveRenderedPreviewHtml }}
                  />
                </div>
              )}
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* COMBINED TAB 2: DOCUMENT TYPES & PURPOSES MANAGEMENT                      */}
      {/* ========================================================================= */}
      {viewMode === 'list' && mainTab === 'document_types_purposes' && (
        <SectionCard
          title={isFil ? 'MGA URI NG DOKUMENTO AT LAYUNIN' : 'DOCUMENT TYPES & PURPOSES'}
          description={
            isFil
              ? 'Pamahalaan ang mga uri ng dokumento, bayarin, at mga kaukulang layunin na pipiliin ng mga residente sa portal at ng mga staff.'
              : 'Manage document types, fees, and connected target purposes available for residents in the portal and staff issuance.'
          }
          actions={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetDocTypesToDefaults}
                className="gap-1.5 border-slate-300 bg-white text-xs text-slate-700 hover:border-slate-400 hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                {isFil ? 'I-reset' : 'Reset'}
              </Button>
              <button
                type="button"
                onClick={handleOpenAddDocType}
                className="inline-flex items-center gap-2 rounded-md border border-emerald-600 bg-emerald-50/40 px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all shadow-2xs cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                {isFil ? 'Magdagdag ng Uri ng Dokumento' : 'Add Document Type'}
              </button>
            </div>
          }
        >
          {/* Single-Line Search & Filter Bar */}
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            <div className="relative sm:col-span-8">
              <Input
                placeholder={isFil ? 'Maghanap ng uri ng dokumento o layunin...' : 'Search document type or purpose...'}
                value={docTypeSearchQuery}
                onChange={(e) => setDocTypeSearchQuery(e.target.value)}
                className="h-10 w-full"
              />
            </div>

            <div className="sm:col-span-4">
              <Select
                value={docTypeStatusFilter}
                onChange={(e) => setDocTypeStatusFilter(e.target.value)}
                className="h-10 w-full"
              >
                <option value="all">{isFil ? 'Lahat ng Uri ng Dokumento' : 'All Document Types'}</option>
                <option value="active">{isFil ? 'Aktibo Lamang' : 'Active Only'}</option>
                <option value="custom">{isFil ? 'Custom Lamang' : 'Custom Added Only'}</option>
                <option value="inactive">{isFil ? 'Hindi Aktibo Lamang' : 'Inactive Only'}</option>
              </Select>
            </div>
          </div>

          {/* Clean Table View */}
          {filteredDocTypes.length === 0 ? (
            <EmptyState
              title={isFil ? 'Walang nahanap na uri ng dokumento' : 'No document types found'}
              description={isFil ? 'Walang nahanap na uri ng dokumento o layunin na tumutugma sa search.' : 'No document types or purposes matched your search criteria.'}
            />
          ) : (
            <div className="overflow-hidden bg-white rounded-lg border border-[color:var(--portal-border-soft)]">
              <Table className="w-full min-w-[850px] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[38%] px-4 text-left text-sm font-semibold text-[color:var(--portal-ink-700)]">
                      {isFil ? 'Uri ng Dokumento' : 'Document Type'}
                    </TableHead>
                    <TableHead className="w-[48%] px-4 text-left text-sm font-semibold text-[color:var(--portal-ink-700)]">
                      {isFil ? 'Mga Layunin' : 'Connected Purposes'}
                    </TableHead>
                    <TableHead className="w-[14%] px-4 text-center text-sm font-semibold text-[color:var(--portal-ink-700)]">
                      {isFil ? 'Aksyon' : 'Actions'}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDocTypes.map((item) => {
                    const purposes = item.purposes || [];

                    return (
                      <TableRow key={item.id} className="transition-colors hover:bg-[color:var(--portal-surface-1)]">
                        <TableCell className="px-4 py-3 align-top">
                          <p className="font-bold text-sm text-[color:var(--portal-ink-900)]">{item.name}</p>
                          {item.description ? (
                            <p className="text-xs text-[color:var(--portal-ink-700)] mt-0.5 line-clamp-2">
                              {item.description}
                            </p>
                          ) : null}
                          <p className="text-[11px] font-semibold text-emerald-700 mt-1">
                            {item.price === 0 || !item.price ? (isFil ? 'Libre' : 'Free') : `₱${item.price.toFixed(2)}`}
                            {item.pricingNote ? ` • ${item.pricingNote}` : ''}
                          </p>
                        </TableCell>

                        <TableCell className="px-4 py-3 align-top">
                          <div className="space-y-2">
                            {/* Purposes Tag List */}
                            <div className="flex flex-wrap gap-1">
                              {purposes.length === 0 ? (
                                <span className="text-xs text-slate-400 italic">
                                  {isFil ? 'Walang naka-set na layunin' : 'No purposes configured'}
                                </span>
                              ) : (
                                purposes.map((p, pIdx) => (
                                  <span
                                    key={`${item.id}-p-${pIdx}`}
                                    className="inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs text-blue-900 font-medium"
                                  >
                                    <span>{p}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemovePurposeFromCard(item.id, pIdx)}
                                      className="text-blue-400 hover:text-red-600 transition-colors"
                                      title={isFil ? 'Tanggalin ang layunin' : 'Remove purpose'}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </span>
                                ))
                              )}
                            </div>

                            {/* Inline Add Purpose */}
                            <div className="flex items-center gap-1.5 pt-1">
                              <Input
                                placeholder={isFil ? 'Magdagdag ng layunin...' : 'Add purpose...'}
                                value={quickAddPurposeMap[item.id] || ''}
                                onChange={(e) =>
                                  setQuickAddPurposeMap((prev) => ({
                                    ...prev,
                                    [item.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleQuickAddPurpose(item.id);
                                  }
                                }}
                                className="h-7 text-xs bg-white"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => handleQuickAddPurpose(item.id)}
                                disabled={!(quickAddPurposeMap[item.id] || '').trim()}
                                className="h-7 px-2 text-xs text-blue-700 hover:bg-blue-50 shrink-0"
                              >
                                <Plus className="h-3 w-3 mr-0.5" />
                                {isFil ? 'Idagdag' : 'Add'}
                              </Button>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="px-4 py-3 align-top text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenEditDocType(item)}
                              className="h-8 px-2.5 text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 gap-1"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              {isFil ? 'I-edit' : 'Edit'}
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteDocTypeModal({ isOpen: true, item })}
                              className="h-8 px-2.5 text-xs border border-red-200 bg-red-50/60 text-red-700 hover:bg-red-600 hover:text-white hover:border-red-600 gap-1 transition-all"
                              title={isFil ? 'Tanggalin ang Uri ng Dokumento' : 'Delete Document Type'}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {isFil ? 'Tanggalin' : 'Delete'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex flex-col gap-3 border-t border-[color:var(--portal-border-soft)] px-4 py-3 text-sm text-[color:var(--portal-ink-700)] sm:flex-row sm:items-center sm:justify-between">
                <p>
                  {isFil
                    ? `Ipinapakita ang ${filteredDocTypes.length === 0 ? 0 : (docTypePage - 1) * docTypesPerPage + 1}–${Math.min(docTypePage * docTypesPerPage, filteredDocTypes.length)} sa ${filteredDocTypes.length}`
                    : `Showing ${filteredDocTypes.length === 0 ? 0 : (docTypePage - 1) * docTypesPerPage + 1}–${Math.min(docTypePage * docTypesPerPage, filteredDocTypes.length)} of ${filteredDocTypes.length}`}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setDocTypePage((page) => Math.max(1, page - 1))}
                    disabled={docTypePage === 1}
                    className="border-slate-300 bg-white text-xs text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                  >
                    {isFil ? 'Nakaraan' : 'Previous'}
                  </Button>
                  <span className="min-w-16 text-center text-xs font-semibold text-[color:var(--portal-ink-700)]">
                    {docTypePage} {isFil ? 'sa' : 'of'} {docTypePageCount}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setDocTypePage((page) => Math.min(docTypePageCount, page + 1))}
                    disabled={docTypePage === docTypePageCount}
                    className="border-slate-300 bg-white text-xs text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                  >
                    {isFil ? 'Susunod' : 'Next'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {/* ========================================================================= */}
      {/* COMBINED TAB 3: BARANGAY & OFFICIAL INFORMATION MANAGEMENT                */}
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
                  <p className="text-xs font-semibold text-slate-800">Barangay Official Seal</p>
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
                  <p className="text-xs font-semibold text-slate-800">City / Municipal Seal</p>
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
                  <p className="text-xs font-semibold text-slate-800">Bagong Pilipinas / National Seal</p>
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
                    {isFil ? 'Talaan ng mga Kagawad at Komite' : 'Barangay Kagawad Roster & Committees'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {isFil
                      ? 'Magdagdag, mag-edit, o magtanggal ng mga Kagawad at kanilang mga komite para sa 2-Column Sidebar Layout.'
                      : 'Add, edit, or remove Kagawad members and their assigned committees for the dynamic 2-Column Sidebar Layout.'}
                  </p>
                </div>

                <Button type="button" size="sm" variant="secondary" onClick={handleAddKagawad} className="gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  {isFil ? 'Magdagdag ng Kagawad' : 'Add Kagawad'}
                </Button>
              </div>

              {kagawadList.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-500">
                  {isFil
                    ? 'Walang nakalistang Kagawad. I-click ang "+ Magdagdag ng Kagawad" upang maglagay.'
                    : 'No Kagawads added yet. Click "+ Add Kagawad" to add council members.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {kagawadList.map((k, index) => (
                    <div key={k.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
                      <span className="text-xs font-bold font-mono text-slate-400 min-w-[24px]">#{index + 1}</span>
                      <div className="flex-1 min-w-[200px]">
                        <Input
                          placeholder={isFil ? 'Buong Pangalan ng Kagawad' : 'Kagawad Full Name'}
                          value={k.name}
                          onChange={(e) => handleUpdateKagawad(k.id, 'name', e.target.value)}
                          className="text-xs"
                        />
                      </div>
                      <div className="flex-1 min-w-[220px]">
                        <Input
                          placeholder={isFil ? 'Komite / Tungkulin (hal. Peace and Order/BADAC)' : 'Committee / Assignment (e.g. Peace and Order/BADAC)'}
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
                {isFil ? 'I-save ang Impormasyon at I-refresh ang mga Template' : 'Save Information & Refresh Templates'}
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
                <h3 className="font-bold text-slate-900 text-base">
                  {isFil ? 'Palitan ang Umiiral na Template?' : 'Override Existing Template?'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isFil ? 'Mayroon nang naka-save na template para sa kategoryang ito.' : 'A template already exists for this category.'}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-700 mb-6 leading-relaxed">
              {isFil ? (
                <>
                  Mayroon nang aktibong template para sa <strong className="text-slate-900">{DOCUMENT_TYPES.find(d => d.id === wizardDocType)?.labelEn}</strong> na pinangalanang <span className="font-semibold text-blue-700">"{overwriteModal.existingTemplate.name}"</span>.
                  <br /><br />
                  Nais mo ba itong <strong>i-override / palitan</strong> ang kasalukuyang template, o i-save bilang <strong>panibagong custom template</strong>?
                </>
              ) : (
                <>
                  There is already an active template for <strong className="text-slate-900">{DOCUMENT_TYPES.find(d => d.id === wizardDocType)?.labelEn}</strong> named <span className="font-semibold text-blue-700">"{overwriteModal.existingTemplate.name}"</span>.
                  <br /><br />
                  Would you like to <strong>override / replace</strong> the current active template, or save as a <strong>new separate custom template</strong>?
                </>
              )}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOverwriteModal(null)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer"
              >
                {isFil ? 'Kanselahin' : 'Cancel'}
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
                {isFil ? 'I-save bilang Bagong Template' : 'Save as New Template'}
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
                {isFil ? 'Palitan ang Kasalukuyang Template' : 'Override Existing Template'}
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
                <h3 className="font-bold text-slate-900 text-base">
                  {isFil ? 'I-overwrite ang Umiiral na Template?' : 'Overwrite Existing Template?'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isFil ? 'Mayroon nang template na may kaparehong pangalan o uri.' : 'A template with the same name or type already exists.'}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-700 mb-6 leading-relaxed">
              {isFil ? (
                <>
                  Mayroon nang umiiral na template na pinangalanang <strong className="text-blue-700 font-semibold">"{overwriteSaveModal.conflictingTemplate.name}"</strong>.
                  <br /><br />
                  Nais mo ba itong <strong>i-overwrite / palitan</strong> upang ito na ang maging aktibong template na gagamitin sa buong system (Staff OCR & Document Requests), o i-save bilang <strong>panibagong hiwalay na template</strong>?
                </>
              ) : (
                <>
                  There is already an existing template named <strong className="text-blue-700 font-semibold">"{overwriteSaveModal.conflictingTemplate.name}"</strong>.
                  <br /><br />
                  Would you like to <strong>overwrite / replace</strong> it so this becomes the active template used across the system, or save as a <strong>new separate template</strong>?
                </>
              )}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOverwriteSaveModal(null)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer"
              >
                {isFil ? 'Kanselahin' : 'Cancel'}
              </button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleSaveTemplate(undefined, false, true)}
                className="w-full sm:w-auto text-xs"
              >
                {isFil ? 'I-save bilang Bagong Kopya' : 'Save as New Copy'}
              </Button>
              <Button
                type="button"
                onClick={() => void handleSaveTemplate(undefined, true, false)}
                className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs gap-1.5"
              >
                {isFil ? 'Oo, I-overwrite ang Template' : 'Yes, Overwrite Template'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Document Type Modal */}
      {docTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-100 text-blue-700 font-bold shrink-0">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingDocTypeId
                      ? (isFil ? 'I-edit ang Uri ng Dokumento at Layunin' : 'Edit Document Type & Purposes')
                      : (isFil ? 'Magdagdag ng Bagong Uri ng Dokumento' : 'Add New Document Type')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isFil
                      ? 'I-set ang detalye, presyo, at mga layunin para sa dokumentong ito.'
                      : 'Set details, pricing, and allowed purposes for this document type.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDocTypeModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveDocTypeModal} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel label={isFil ? 'Pangalan ng Uri ng Dokumento *' : 'Document Type Name *'}>
                    <Input
                      required
                      placeholder={isFil ? 'hal. Barangay Certification, Business Clearance, Construction Clearances...' : 'e.g. Barangay Certification, Business Clearance, Construction Clearances...'}
                      value={editDocTypeName}
                      onChange={(e) => setEditDocTypeName(e.target.value)}
                    />
                  </FieldLabel>
                </div>

                <div className="sm:col-span-1">
                  <FieldLabel label={isFil ? 'Karaniwang Bayad / Presyo (₱)' : 'Standard Price / Fee (₱)'}>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={isFil ? '0.00 (Ilagay ang 0 para Libre)' : '0.00 (Enter 0 for Free)'}
                      value={editDocTypePrice}
                      onChange={(e) => setEditDocTypePrice(e.target.value)}
                    />
                  </FieldLabel>
                </div>

                <div className="sm:col-span-1">
                  <FieldLabel label={isFil ? 'Tala sa Presyo / Exemption (Opsyonal)' : 'Pricing Note / Exemption (Optional)'}>
                    <Input
                      placeholder={isFil ? 'hal. Libre para sa First Time Jobseekers o Senior Citizens' : 'e.g. Free for First Time Jobseekers or Senior Citizens'}
                      value={editDocTypePricingNote}
                      onChange={(e) => setEditDocTypePricingNote(e.target.value)}
                    />
                  </FieldLabel>
                </div>

                <div className="sm:col-span-2">
                  <FieldLabel label={isFil ? 'Paglalarawan (Opsyonal)' : 'Description (Optional)'}>
                    <Textarea
                      placeholder={isFil ? 'Maikling paliwanag kung saan ginagamit ang dokumento o kung sino ang maaaring mag-apply...' : 'Brief description explaining where this document is used or who can apply...'}
                      value={editDocTypeDescription}
                      onChange={(e) => setEditDocTypeDescription(e.target.value)}
                      rows={2}
                    />
                  </FieldLabel>
                </div>
              </div>

              {/* Dynamic Purposes Editor Section */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                    <Tag className="h-4 w-4 text-emerald-600" />
                    {isFil ? `Listahan ng mga Layunin (${editDocTypePurposes.length})` : `Purposes / Layunin List (${editDocTypePurposes.length})`}
                  </label>
                  <span className="text-xs text-slate-500">
                    {isFil ? 'Pwedeng dagdagan, i-edit, o tanggalin' : 'Can be added, edited, or removed'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  {isFil
                    ? 'Ang mga layuning ito ang lalabas na clickable options para sa mga residente sa Resident Request Portal at Staff OCR Issuance.'
                    : 'These purposes will appear as selectable options for residents in the portal and for staff document issuance.'}
                </p>

                {/* Add Purpose Field */}
                <div className="flex items-center gap-2 mb-3">
                  <Input
                    placeholder={isFil ? 'Mag-type ng bagong layunin (hal. School Enrollment, Medical Assistance)...' : 'Type new purpose (e.g. School Enrollment, Medical Assistance, Bank Loan)...'}
                    value={newPurposeInput}
                    onChange={(e) => setNewPurposeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPurposeToEditList();
                      }
                    }}
                    className="text-xs"
                  />
                  <Button
                    type="button"
                    onClick={() => handleAddPurposeToEditList()}
                    disabled={!newPurposeInput.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 text-xs px-3"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {isFil ? 'Magdagdag ng Layunin' : 'Add Purpose'}
                  </Button>
                </div>

                {/* Quick Add Suggestion Pills */}
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-400">
                    {isFil ? 'Mabilisang Suhestiyon:' : 'Quick Suggestions:'}
                  </span>
                  {[
                    isFil ? 'Pangangailangan sa Trabaho / Job Application' : 'Local Employment / Job Application',
                    isFil ? 'Pangangailangan sa Paaralan / Scholarship' : 'School Requirement / Scholarship',
                    isFil ? 'Tulong Medikal / Hospitalization' : 'Medical / Hospitalization Assistance',
                    isFil ? 'Tulong Pinansyal (AICS / DSWD)' : 'Financial Assistance (AICS / DSWD)',
                    isFil ? 'Pagbubukas ng Bank Account / Loan' : 'Bank Account Opening / Loan',
                    isFil ? 'Aplikasyon ng DFA Passport / Visa' : 'DFA Passport / Visa Application',
                    isFil ? 'Aplikasyon ng Valid ID / Postal ID' : 'Valid ID / Postal ID Application',
                    isFil ? 'Koneksyon ng Kuryente / Tubig (Utilities)' : 'Utility Connection (Water / Power)',
                    isFil ? 'Affidavit of Loss / Legal Purpose' : 'Affidavit of Loss / Legal Purpose',
                    isFil ? 'Pangkalahatang Legal na Layunin' : 'General Legal Purpose',
                  ].map((sug) => {
                    const isAlreadyAdded = editDocTypePurposes.includes(sug);
                    return (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => handleAddPurposeToEditList(sug)}
                        disabled={isAlreadyAdded}
                        className={`rounded-full px-2 py-0.5 text-[11px] transition-colors border ${
                          isAlreadyAdded
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300 cursor-pointer'
                        }`}
                      >
                        + {sug}
                      </button>
                    );
                  })}
                </div>

                {/* Current Purposes List */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 max-h-48 overflow-y-auto space-y-1.5">
                  {editDocTypePurposes.length === 0 ? (
                    <div className="text-center py-3 text-xs text-slate-400 italic">
                      {isFil
                        ? 'Walang nakalagay na layunin. Mag-type sa itaas o pumili sa Mabilisang Suhestiyon.'
                        : 'No purposes configured yet. Type above or click from Quick Suggestions.'}
                    </div>
                  ) : (
                    editDocTypePurposes.map((p, idx) => (
                      <div
                        key={`modal-p-${idx}`}
                        className="flex items-center justify-between rounded-md bg-white border border-slate-200 px-3 py-1.5 text-xs shadow-2xs group"
                      >
                        <span className="font-medium text-slate-800 flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                          {p}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemovePurposeFromEditList(idx)}
                          className="rounded p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title={isFil ? 'Tanggalin ang layunin' : 'Remove purpose'}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between gap-2.5 pt-4 border-t border-slate-100">
                <div>
                  {editingDocTypeId ? (
                    <button
                      type="button"
                      onClick={() => {
                        const existingItem = docTypesCatalog.find((d) => d.id === editingDocTypeId);
                        if (existingItem) {
                          setDocTypeModalOpen(false);
                          setDeleteDocTypeModal({ isOpen: true, item: existingItem });
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:text-white hover:bg-red-600 border border-red-200 rounded-md transition-all cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {isFil ? 'Tanggalin ang Uri ng Dokumento' : 'Delete Document Type'}
                    </button>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDocTypeModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer"
                  >
                    {isFil ? 'Kanselahin' : 'Cancel'}
                  </button>
                  <Button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 px-4"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {isFil ? 'I-save ang Uri ng Dokumento at Layunin' : 'Save Document Type & Purposes'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Document Type Confirmation Modal */}
      {deleteDocTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-red-100 text-red-700 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {isFil ? 'Tanggalin ang Uri ng Dokumento?' : 'Delete Document Type?'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isFil ? 'Sigurado ka bang nais mong tanggalin ang uri ng dokumentong ito?' : 'Are you sure you want to delete this document type?'}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-700 mb-6 leading-relaxed">
              {isFil ? (
                <>
                  Tatanggalin ang <strong className="text-slate-900 font-bold">"{deleteDocTypeModal.item.name}"</strong> at lahat ng {deleteDocTypeModal.item.purposes?.length || 0} naka-configure na layunin nito. Hindi na ito makikita ng mga residente sa kanilang document request form.
                </>
              ) : (
                <>
                  This will remove <strong className="text-slate-900 font-bold">"{deleteDocTypeModal.item.name}"</strong> and all {deleteDocTypeModal.item.purposes?.length || 0} configured purposes. Residents will no longer be able to select this in document requests.
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteDocTypeModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer"
              >
                {isFil ? 'Kanselahin' : 'Cancel'}
              </button>
              <Button
                type="button"
                onClick={() => handleDeleteDocType(deleteDocTypeModal.item.id)}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isFil ? 'Oo, Tanggalin ang Uri ng Dokumento' : 'Yes, Delete Document Type'}
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
