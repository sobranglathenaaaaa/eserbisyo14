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
} from '@/lib/ocr/templates';

const INTAKE_FORM_BUILDERS: Record<string, () => string> = {
  [INDIGENCY_TEMPLATE_KEY]: buildIndigencyIntakeFormHtml,
  [BARANGAY_CERTIFICATE_TEMPLATE_KEY]: buildBarangayCertificateIntakeFormHtml,
  [LUPON_SUMMONS_TEMPLATE_KEY]: buildLuponSummonsIntakeFormHtml,
  [BUSINESS_PERMIT_TEMPLATE_KEY]: buildBusinessPermitIntakeFormHtml,
  [CONSTRUCTION_PERMIT_TEMPLATE_KEY]: buildConstructionPermitIntakeFormHtml,
};

export function buildOcrIntakeFormHtml(templateKey: string) {
  return (INTAKE_FORM_BUILDERS[templateKey] ?? buildIndigencyIntakeFormHtml)();
}
