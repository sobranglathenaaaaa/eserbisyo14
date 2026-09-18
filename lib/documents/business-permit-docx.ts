import 'server-only';

import fs from 'node:fs/promises';
import path from 'node:path';
import { buildBusinessPermitPrintableHtml } from '@/lib/documents/business-permit';
import type { CertificateFieldMap } from '@/lib/documents/indigency-certificate';

const TEMPLATE_FILE_CANDIDATES = [
  path.join(/*turbopackIgnore: true*/ process.cwd(), 'template', 'BUSINESS-PERMIT.docx'),
];

async function resolveTemplatePath() {
  for (const filePath of TEMPLATE_FILE_CANDIDATES) {
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      // Continue to next candidate.
    }
  }
  throw new Error('Business permit DOCX template not found. Expected template/BUSINESS-PERMIT.docx.');
}

export async function renderBusinessPermitFromDocx(
  doc: { residentName: string; dateIssued: string },
  fields: CertificateFieldMap,
): Promise<{
  docxBuffer: Buffer;
  printableHtml: string;
  templatePath: string;
}> {
  const templatePath = await resolveTemplatePath();
  const templateBuffer = await fs.readFile(templatePath);

  return {
    docxBuffer: templateBuffer,
    printableHtml: buildBusinessPermitPrintableHtml(doc, fields),
    templatePath,
  };
}
