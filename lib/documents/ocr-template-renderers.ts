import 'server-only';

import { renderBarangayCertificateFromDocx } from '@/lib/documents/barangay-certificate-docx';
import { renderBusinessPermitFromDocx } from '@/lib/documents/business-permit-docx';
import { renderConstructionPermitFromDocx } from '@/lib/documents/construction-permit-docx';
import type { CertificateFieldMap } from '@/lib/documents/indigency-certificate';
import { renderIndigencyCertificateFromDocx } from '@/lib/documents/indigency-docx';
import { renderLuponSummonsFromDocx } from '@/lib/documents/lupon-summons-docx';
import { getCategoryForDocType } from '@/lib/documents/document-catalog-constants';
import { stripPriceFromPurpose } from '@/lib/documents/official-template-builder';
import {
  BARANGAY_CERTIFICATE_TEMPLATE_KEY,
  BUSINESS_PERMIT_TEMPLATE_KEY,
  CONSTRUCTION_PERMIT_TEMPLATE_KEY,
  INDIGENCY_TEMPLATE_KEY,
  LUPON_SUMMONS_TEMPLATE_KEY,
  resolveTemplateForDocumentType,
} from '@/lib/ocr/templates';

type RenderedOcrDocument = {
  docxBuffer: Buffer;
  printableHtml: string;
  templatePath: string;
};

type OcrDocumentRenderer = (
  doc: { residentName: string; dateIssued: string },
  fields: CertificateFieldMap,
) => Promise<RenderedOcrDocument>;

type StoredDocumentTemplate = {
  id: string;
  name: string;
  body: string | null;
  dynamic_fields: string[] | null;
};

const RENDERERS_BY_TEMPLATE_KEY: Record<string, OcrDocumentRenderer> = {
  [INDIGENCY_TEMPLATE_KEY]: renderIndigencyCertificateFromDocx,
  [BARANGAY_CERTIFICATE_TEMPLATE_KEY]: renderBarangayCertificateFromDocx,
  [LUPON_SUMMONS_TEMPLATE_KEY]: renderLuponSummonsFromDocx,
  [BUSINESS_PERMIT_TEMPLATE_KEY]: renderBusinessPermitFromDocx,
  [CONSTRUCTION_PERMIT_TEMPLATE_KEY]: renderConstructionPermitFromDocx,
  barangay_certification: renderBarangayCertificateFromDocx,
  lupon_tagapamayapa: renderLuponSummonsFromDocx,
  business_clearance: renderBusinessPermitFromDocx,
  construction_clearances: renderConstructionPermitFromDocx,
};

export function resolvePrintableTemplateKey(
  templateKey: string | null | undefined,
  documentType: string | null | undefined,
) {
  // Custom Admin templates use their database ID as the key. Keep it intact
  // so renderOcrTemplateFromDocx can load the exact saved document body.
  if (templateKey) {
    return templateKey;
  }
  const resolved = resolveTemplateForDocumentType(documentType);
  return resolved && RENDERERS_BY_TEMPLATE_KEY[resolved.key] ? resolved.key : null;
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

function getTemplateMetadata(body: string | null) {
  if (!body) return null;
  const match = body.match(/<!-- TEMPLATE_META:([\s\S]*?) -->$/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as { documentType?: unknown; isActive?: unknown };
  } catch {
    return null;
  }
}

function isLikelyOcrIntakeTemplate(template: StoredDocumentTemplate) {
  return /\b(intake|ocr)\b/i.test(template.name);
}

function hasMarkedReason(value: string | undefined) {
  const normalized = (value ?? '').trim().toLowerCase();
  return Boolean(normalized && !['0', 'false', 'no', 'none', 'n/a'].includes(normalized));
}

const CHECKED_FIELD_TEMPLATE_ALIASES: Record<string, string[]> = {
  reasonGeneralCert: ['barangay certification', 'barangay certificate', 'general certification'],
  reasonIndigency: ['indigency'],
  reasonResidency: ['residency', 'resident certificate'],
  reasonGoodMoral: ['good moral'],
  reasonEmployment: ['employment'],
  reasonSchoolReference: ['school', 'scholarship'],
  reasonSrCitizenId: ['senior', 'sr citizen', 'pwd'],
  reasonSjHealthCard: ['health card', 'medical clearance'],
  reasonPoliceNbi: ['police', 'nbi', 'court clearance'],
  reasonPostalId: ['postal', 'passport', 'visa'],
  reasonBurialAssistance: ['burial'],
  reasonSssGsisPhilhealth: ['sss', 'gsis', 'philhealth'],
  reasonFinancialAssistance: ['financial assistance'],
  reasonMedicalAssistance: ['medical assistance'],
  reasonTransferResidence: ['transfer', 'residence transfer'],
  reasonNoOperation: ['no operation'],
  reasonNonResident: ['non-resident', 'non resident'],
  permitMayorsBusiness: ["mayor's business", 'business permit'],
  permitBuilding: ['building permit'],
  permitOccupancy: ['occupancy permit'],
  permitExcavation: ['excavation permit'],
  permitDemolition: ['demolition permit'],
  permitRenovationRepair: ['renovation', 'repair permit'],
  permitConstruction: ['construction permit'],
  permitHauling: ['hauling permit'],
  permitSignageBillboards: ['signage', 'billboard'],
};

function findCheckedAdminTemplate(
  templates: StoredDocumentTemplate[],
  fields: CertificateFieldMap,
) {
  const checkedField = Object.keys(CHECKED_FIELD_TEMPLATE_ALIASES).find((field) => hasMarkedReason(fields[field]));
  if (!checkedField) return null;
  const aliases = CHECKED_FIELD_TEMPLATE_ALIASES[checkedField];
  return templates.find((template) => {
    if (isLikelyOcrIntakeTemplate(template)) return false;
    const metadata = getTemplateMetadata(template.body);
    const haystack = `${metadata?.documentType ?? ''} ${template.name}`.toLowerCase();
    return aliases.some((alias) => haystack.includes(alias));
  }) ?? null;
}

function getStoredTemplateCategory(template: StoredDocumentTemplate) {
  const metadata = getTemplateMetadata(template.body);
  return getCategoryForDocType(
    typeof metadata?.documentType === 'string' ? metadata.documentType : null,
    template.name,
  );
}

export async function renderOcrTemplateFromDocx(
  templateKey: string,
  doc: { residentName: string; dateIssued: string },
  fields: CertificateFieldMap,
) {
  try {
    const { getSupabaseAdminClient } = await import('@/lib/supabase/admin');
    const admin = getSupabaseAdminClient();
    const { data: dbTemplates } = await admin
      .from('document_templates')
      .select('id, name, body, dynamic_fields')
      .order('updated_at', { ascending: false });
    const storedTemplates = ((dbTemplates ?? []) as StoredDocumentTemplate[]).filter((template) => {
      const metadata = getTemplateMetadata(template.body);
      return metadata?.isActive !== false;
    });

    const keyLower = templateKey.toLowerCase();
    const isLuponKey = keyLower.includes('lupon') || keyLower.includes('summons') || keyLower.includes('cfa') || keyLower.includes('notice');
    const exactDbTemplate = storedTemplates.find((template) => template.id === templateKey);
    const checkedTemplate = findCheckedAdminTemplate(storedTemplates, fields);
    const metadataDbTemplate = storedTemplates.find((template) => {
      const metadata = getTemplateMetadata(template.body);
      if (isLikelyOcrIntakeTemplate(template)) return false;
      if (metadata?.documentType === templateKey) return true;
      return (
        typeof metadata?.documentType === 'string' &&
        getStoredTemplateCategory(template) === getCategoryForDocType(templateKey)
      );
    });
    const customDbTemplate = checkedTemplate ?? exactDbTemplate ?? metadataDbTemplate ?? storedTemplates.find((t) => {
      if (!t.body || isLikelyOcrIntakeTemplate(t)) return false;
      const nameLower = (t.name || '').toLowerCase();
      if (isLuponKey) {
        if (keyLower.includes('cfa') && (nameLower.includes('cfa') || nameLower.includes('file action'))) return true;
        if (keyLower.includes('notice') && (nameLower.includes('notice') || nameLower.includes('reconciliation') || nameLower.includes('abiso'))) return true;
        if (keyLower.includes('summons') && (nameLower.includes('summons') || nameLower.includes('patawag'))) return true;
        return false;
      }
      if (keyLower.includes('indigency') && nameLower.includes('indigency')) return true;
      if (keyLower.includes('barangay_cert') && (nameLower.includes('barangay') || nameLower.includes('clearance'))) return true;
      if (keyLower.includes('business') && (nameLower.includes('business') || nameLower.includes('negosyo'))) return true;
      if (keyLower.includes('construction') && (nameLower.includes('construction') || nameLower.includes('pagpapatayo'))) return true;
      return nameLower.includes(keyLower);
    });

    const residentName = fields.residentName || doc.residentName || 'Resident';
    const address = fields.address || fields.residenceAddress || fields.residentAddressLine || 'Barangay Progreso, City of San Juan';
    const purpose = resolvePurposeFromReasons(fields);
    const dateIssued = doc.dateIssued || new Date().toISOString().slice(0, 10);

    const { renderDocumentTemplateHtml } = await import('@/lib/documents/official-template-builder');

    const templateToRender = customDbTemplate || {
      id: templateKey,
      name: checkedTemplate?.name || (templateKey.includes('indigency') ? 'Certificate of Indigency' : 'Barangay Certification'),
      documentType: templateKey,
      body: null,
    };

    const renderedBody = renderDocumentTemplateHtml(templateToRender, {
      ...fields,
      residentName,
      residentAddress: address,
      purpose,
      dateIssued,
    });

    const printableHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${templateToRender.name || 'Official Barangay Document'}</title>
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
      font-family: "Times New Roman", Times, serif;
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
    @media print {
      body { margin: 0; background: #fff; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="print-document-wrapper">
    ${renderedBody}
  </div>
</body>
</html>`;

    return {
      docxBuffer: Buffer.from(''),
      printableHtml,
      templatePath: customDbTemplate ? 'db://custom-template' : 'system://official-template',
    };
  } catch (error) {
    console.error('Error rendering OCR template, using official builder fallback:', error);
    const { renderDocumentTemplateHtml } = await import('@/lib/documents/official-template-builder');
    const residentName = fields.residentName || doc.residentName || 'Resident';
    const address = fields.address || fields.residenceAddress || fields.residentAddressLine || 'Barangay Progreso, City of San Juan';
    const purpose = resolvePurposeFromReasons(fields);
    const dateIssued = doc.dateIssued || new Date().toISOString().slice(0, 10);

    const renderedBody = renderDocumentTemplateHtml({ documentType: templateKey }, {
      ...fields,
      residentName,
      residentAddress: address,
      purpose,
      dateIssued,
    });

    return {
      docxBuffer: Buffer.from(''),
      printableHtml: `<!doctype html><html><head><meta charset="utf-8" /><title>Barangay Document</title><style>@page{size:A4 portrait;margin:4mm 6mm;}body{margin:0;font-family:"Times New Roman",Georgia,serif;}.print-document-wrapper{max-width:198mm;margin:0 auto;}</style></head><body><div class="print-document-wrapper">${renderedBody}</div></body></html>`,
      templatePath: 'system://official-fallback',
    };
  }
}
