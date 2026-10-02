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
      <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #111; margin-bottom: 4px;">
        ${escapeHtml(f.label)}${f.required ? ' <span>*</span>' : ''}
      </div>
      <div style="border: 1px solid #222; height: 32px; background: #fff;"></div>
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
    body { font-family: "Times New Roman", Georgia, serif; margin: 0; color: #111; background: #fff; }
    .sheet { border: 2px solid #111; padding: 20px 24px; box-sizing: border-box; }
    .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 16px; }
    .header p { margin: 2px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
    .header h2 { margin: 4px 0; font-size: 16px; color: #111; font-weight: bold; }
    .title-banner { background: #fff; border: 1px solid #222; padding: 8px; text-align: center; margin-bottom: 16px; }
    .title-banner h3 { margin: 0; font-size: 15px; color: #111; text-transform: uppercase; letter-spacing: 0.5px; }
    .instruction { font-size: 11px; color: #111; margin-top: 4px; }
    .fields-container { margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <p>Republic of the Philippines</p>
      <p style="font-weight: bold;">City of San Juan</p>
      <h2>BARANGAY PROGRESO</h2>
      <p style="font-weight: bold;">OFFICE OF THE PUNONG BARANGAY</p>
    </div>

    <div class="title-banner">
      <h3>${escapeHtml(title)} &mdash; OCR Walk-in Intake Form</h3>
      <div class="instruction">Mangyaring isulat nang MALINAW at MALALAKING LETRA (ALL CAPS) para mabasa ng OCR scanner.</div>
    </div>

    <div class="fields-container">
      ${fieldRows}
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
