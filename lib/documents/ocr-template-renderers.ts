import 'server-only';

import { renderBarangayCertificateFromDocx } from '@/lib/documents/barangay-certificate-docx';
import { renderBusinessPermitFromDocx } from '@/lib/documents/business-permit-docx';
import { renderConstructionPermitFromDocx } from '@/lib/documents/construction-permit-docx';
import type { CertificateFieldMap } from '@/lib/documents/indigency-certificate';
import { renderIndigencyCertificateFromDocx } from '@/lib/documents/indigency-docx';
import { renderLuponSummonsFromDocx } from '@/lib/documents/lupon-summons-docx';
import {
  BARANGAY_CERTIFICATE_TEMPLATE_KEY,
  BUSINESS_PERMIT_TEMPLATE_KEY,
  CONSTRUCTION_PERMIT_TEMPLATE_KEY,
  getOcrTemplateByKey,
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

const RENDERERS_BY_TEMPLATE_KEY: Record<string, OcrDocumentRenderer> = {
  [INDIGENCY_TEMPLATE_KEY]: renderIndigencyCertificateFromDocx,
  [BARANGAY_CERTIFICATE_TEMPLATE_KEY]: renderBarangayCertificateFromDocx,
  [LUPON_SUMMONS_TEMPLATE_KEY]: renderLuponSummonsFromDocx,
  [BUSINESS_PERMIT_TEMPLATE_KEY]: renderBusinessPermitFromDocx,
  [CONSTRUCTION_PERMIT_TEMPLATE_KEY]: renderConstructionPermitFromDocx,
};

export function resolvePrintableTemplateKey(
  templateKey: string | null | undefined,
  documentType: string | null | undefined,
) {
  if (templateKey && getOcrTemplateByKey(templateKey) && RENDERERS_BY_TEMPLATE_KEY[templateKey]) {
    return templateKey;
  }
  const resolved = resolveTemplateForDocumentType(documentType);
  return resolved && RENDERERS_BY_TEMPLATE_KEY[resolved.key] ? resolved.key : null;
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

    const keyLower = templateKey.toLowerCase();
    const customDbTemplate = (dbTemplates || []).find((t) => {
      if (t.id === templateKey) return true;
      if (t.body?.includes(`"documentType":"${templateKey}"`)) return true;
      const nameLower = (t.name || '').toLowerCase();
      if (keyLower.includes('indigency') && nameLower.includes('indigency')) return true;
      if (keyLower.includes('barangay_cert') && (nameLower.includes('barangay') || nameLower.includes('clearance'))) return true;
      if (keyLower.includes('lupon') && nameLower.includes('lupon')) return true;
      if (keyLower.includes('business') && (nameLower.includes('business') || nameLower.includes('negosyo'))) return true;
      if (keyLower.includes('construction') && (nameLower.includes('construction') || nameLower.includes('pagpapatayo'))) return true;
      return nameLower.includes(keyLower);
    });

    if (customDbTemplate?.body) {
      let cleanBody = customDbTemplate.body;
      const metaMatch = cleanBody.match(/<!-- TEMPLATE_META:([\s\S]*?) -->$/);
      if (metaMatch) {
        cleanBody = cleanBody.replace(/<!-- TEMPLATE_META:([\s\S]*?) -->$/, '').trim();
      }

      const residentName = fields.residentName || doc.residentName || 'Resident';
      const address = fields.address || fields.residenceAddress || 'Barangay Progreso, City of San Juan';
      const purpose = fields.purpose || fields.reasonText || 'Educational / Medical Assistance';
      const dateIssued = doc.dateIssued || new Date().toISOString().slice(0, 10);

      const punongBarangay = fields.punongBarangay || fields.punong_barangay || 'CESAR JR. H. STO. DOMINGO';
      const barangaySecretary = fields.barangaySecretary || fields.barangay_secretary || 'Ma. Theresa R. Dela Cruz';
      const barangayTreasurer = fields.barangayTreasurer || fields.barangay_treasurer || 'Saturnina C. Mirata';
      const barangayName = fields.barangayName || fields.barangay_name || 'BARANGAY PROGRESO';
      const city = fields.city || fields.cityName || 'City of San Juan';
      const kagawadList = fields.kagawadList || fields.kagawad_list || '';
      const referenceNumber = fields.referenceNumber || fields.reference_number || fields.barangayCaseNumber || '';

      const sealImgs = {
        country: '<img src="/images/indigency-template/bagong-pilipinas.png" alt="Country Seal" style="width:62px;height:62px;object-fit:contain;display:inline-block;" />',
        city: '<img src="/images/indigency-template/san-juan-seal.jpeg" alt="City Seal" style="width:62px;height:62px;object-fit:contain;display:inline-block;" />',
        barangay: '<img src="/images/indigency-template/barangay-progreso-seal.jpeg" alt="Barangay Seal" style="width:62px;height:62px;object-fit:contain;display:inline-block;" />',
        watermark: '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0.09;pointer-events:none;z-index:0;"><img src="/images/indigency-template/barangay-progreso-seal.jpeg" alt="Watermark" style="width:400px;height:400px;object-fit:contain;" /></div>',
      };

      let renderedText = cleanBody;
      renderedText = renderedText.replaceAll('{{resident_name}}', residentName);
      renderedText = renderedText.replaceAll('{{resident_address}}', address);
      renderedText = renderedText.replaceAll('{{purpose}}', purpose);
      renderedText = renderedText.replaceAll('{{date_issued}}', dateIssued);
      renderedText = renderedText.replaceAll('{{punong_barangay}}', punongBarangay);
      renderedText = renderedText.replaceAll('{{barangay_secretary}}', barangaySecretary);
      renderedText = renderedText.replaceAll('{{barangay_treasurer}}', barangayTreasurer);
      renderedText = renderedText.replaceAll('{{barangay_name}}', barangayName);
      renderedText = renderedText.replaceAll('{{city}}', city);
      renderedText = renderedText.replaceAll('{{kagawad_list}}', kagawadList);
      renderedText = renderedText.replaceAll('{{reference_number}}', referenceNumber);
      renderedText = renderedText.replaceAll('{{country_seal}}', sealImgs.country);
      renderedText = renderedText.replaceAll('{{city_seal}}', sealImgs.city);
      renderedText = renderedText.replaceAll('{{barangay_seal}}', sealImgs.barangay);
      renderedText = renderedText.replaceAll('{{barangay_watermark}}', sealImgs.watermark);
      renderedText = renderedText.replaceAll('{{barangay_address}}', fields.barangayAddress || fields.barangay_address || '#15 M. Cruz Street Barangay Progreso, San Juan City');
      renderedText = renderedText.replaceAll('{{barangay_email}}', fields.barangayEmail || fields.barangay_email || 'barangayprogreso@yahoo.com');
      renderedText = renderedText.replaceAll('{{barangay_phone}}', fields.barangayPhone || fields.barangay_phone || '(02)8727-5635 / (02)76258731');
      renderedText = renderedText.replaceAll('{{official_seal}}', '<div style="display:inline-block;border:2px solid #1e3a8a;color:#1e3a8a;padding:4px 10px;border-radius:9999px;font-weight:bold;font-size:10px;">[ OFFICIAL BARANGAY SEAL ]</div>');

      const defaultRenderer = RENDERERS_BY_TEMPLATE_KEY[templateKey];
      const baseResult = defaultRenderer ? await defaultRenderer(doc, fields) : null;

      const isFullHtmlDocument = renderedText.includes('<div') || renderedText.includes('<table');

      const printableHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${customDbTemplate.name}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    body { margin: 0; font-family: "Times New Roman", Georgia, serif; color: #000; background: #fff; }
    .print-wrapper { width: 100%; max-width: 850px; margin: 0 auto; box-sizing: border-box; }
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="print-wrapper">
    ${isFullHtmlDocument ? renderedText : `
    <div style="padding: 20mm;">
      <div style="text-align: center; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 24px;">
        <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0;">REPUBLIC OF THE PHILIPPINES</p>
        <p style="font-size: 12px; text-transform: uppercase; font-weight: bold; margin: 2px 0;">CITY OF SAN JUAN</p>
        <h2 style="margin: 4px 0; font-size: 16px;">BARANGAY PROGRESO</h2>
        <p style="font-size: 11px; font-weight: bold; margin: 0;">OFFICE OF THE PUNONG BARANGAY</p>
      </div>
      <div style="white-space: pre-wrap; line-height: 1.8; font-size: 14px;">${renderedText}</div>
    </div>`}
  </div>
</body>
</html>`;

      return {
        docxBuffer: baseResult?.docxBuffer ?? Buffer.from(''),
        printableHtml,
        templatePath: baseResult?.templatePath ?? 'db://custom-template',
      };
    }
  } catch {
    // Fall back seamlessly to default renderer
  }

  const renderer = RENDERERS_BY_TEMPLATE_KEY[templateKey];
  if (!renderer) {
    throw new Error(`Printable rendering is not configured for template "${templateKey}".`);
  }
  return renderer(doc, fields);
}
