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
  const renderer = RENDERERS_BY_TEMPLATE_KEY[templateKey];
  if (!renderer) {
    throw new Error(`Printable rendering is not configured for template "${templateKey}".`);
  }
  return renderer(doc, fields);
}
