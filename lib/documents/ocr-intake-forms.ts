import { buildBarangayCertificateIntakeFormHtml } from '@/lib/documents/barangay-certificate-intake-form';
import { buildBusinessPermitIntakeFormHtml } from '@/lib/documents/business-permit';
import { buildConstructionPermitIntakeFormHtml } from '@/lib/documents/construction-permit';
import { buildIndigencyIntakeFormHtml } from '@/lib/documents/indigency-certificate';
import { buildLuponSummonsIntakeFormHtml } from '@/lib/documents/lupon-summons';
import {
  BARANGAY_CERTIFICATE_TEMPLATE_KEY,
  BUSINESS_PERMIT_TEMPLATE_KEY,
  CONSTRUCTION_PERMIT_TEMPLATE_KEY,
  INDIGENCY_TEMPLATE_KEY,
  LUPON_SUMMONS_TEMPLATE_KEY,
  type OcrTemplateDefinition,
} from '@/lib/ocr/templates';

const INTAKE_FORM_BUILDERS: Record<string, () => string> = {
  [INDIGENCY_TEMPLATE_KEY]: buildIndigencyIntakeFormHtml,
  [BARANGAY_CERTIFICATE_TEMPLATE_KEY]: buildBarangayCertificateIntakeFormHtml,
  [LUPON_SUMMONS_TEMPLATE_KEY]: buildLuponSummonsIntakeFormHtml,
  [BUSINESS_PERMIT_TEMPLATE_KEY]: buildBusinessPermitIntakeFormHtml,
  [CONSTRUCTION_PERMIT_TEMPLATE_KEY]: buildConstructionPermitIntakeFormHtml,
};

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildDynamicIntakeFormHtml(template: {
  name: string;
  intakeFields: Array<{ key: string; label: string; required?: boolean }>;
}) {
  const title = template.name || 'Official Document Intake Form';
  const fields = template.intakeFields.length > 0
    ? template.intakeFields
    : [
        { key: 'residentName', label: 'Resident Full Name', required: true },
        { key: 'address', label: 'Resident Address', required: true },
        { key: 'purpose', label: 'Purpose of Request', required: true },
        { key: 'issuedDate', label: 'Date (YYYY-MM-DD)', required: true },
      ];

  const fieldRows = fields
    .map(
      (f) => `
    <div style="margin-bottom: 12px;">
      <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #1e3a8a; margin-bottom: 4px;">
        ${escapeHtml(f.label)}${f.required ? ' <span style="color:#b91c1c;">*</span>' : ''}
      </div>
      <div style="border: 1.5px solid #334155; border-radius: 4px; height: 32px; background: #fff;"></div>
    </div>`
    )
    .join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} - OCR Intake Form</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    body { font-family: "Times New Roman", Georgia, serif; margin: 0; color: #0f172a; background: #fff; }
    .sheet { border: 2px solid #0f172a; padding: 20px 24px; box-sizing: border-box; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 16px; }
    .header p { margin: 2px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
    .header h2 { margin: 4px 0; font-size: 16px; color: #1e3a8a; font-weight: bold; }
    .title-banner { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px; text-align: center; margin-bottom: 16px; border-radius: 4px; }
    .title-banner h3 { margin: 0; font-size: 15px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
    .instruction { font-size: 11px; color: #475569; margin-top: 4px; }
    .fields-container { margin-bottom: 16px; }
    .footer-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px; padding-top: 12px; border-top: 1px dashed #94a3b8; }
    .sig-block { text-align: center; font-size: 11px; }
    .sig-line { border-bottom: 1px solid #0f172a; margin-top: 36px; margin-bottom: 4px; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <p>Republic of the Philippines</p>
      <p style="font-weight: bold;">City of San Juan</p>
      <h2>BARANGAY PROGRESO</h2>
      <p style="font-weight: bold; color: #475569;">OFFICE OF THE PUNONG BARANGAY</p>
    </div>

    <div class="title-banner">
      <h3>${escapeHtml(title)} &mdash; OCR Walk-in Intake Form</h3>
      <div class="instruction">Mangyaring isulat nang MALINAW at PATAPOS (ALL CAPS) para mabasa ng OCR scanner.</div>
    </div>

    <div class="fields-container">
      ${fieldRows}
    </div>

    <div class="footer-signatures">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div>Pangalan at Lagda ng Humihiling (Resident Signature)</div>
      </div>
      <div class="sig-block">
        <div class="sig-line"></div>
        <div>Barangay Staff / Receiving Officer</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function buildOcrIntakeFormHtml(templateKey: string, dynamicTemplate?: OcrTemplateDefinition | { name: string; intakeFields: Array<{ key: string; label: string; required?: boolean }> }) {
  if (INTAKE_FORM_BUILDERS[templateKey]) {
    return INTAKE_FORM_BUILDERS[templateKey]();
  }
  if (dynamicTemplate) {
    return buildDynamicIntakeFormHtml(dynamicTemplate);
  }
  return buildIndigencyIntakeFormHtml();
}
