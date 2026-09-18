import 'server-only';

import fs from 'node:fs/promises';
import path from 'node:path';
import { buildConstructionPermitPrintableHtml } from '@/lib/documents/construction-permit';
import type { CertificateFieldMap } from '@/lib/documents/indigency-certificate';

const TEMPLATE_FILE_CANDIDATES = [
  path.join(/*turbopackIgnore: true*/ process.cwd(), 'template', 'CONSTRUCTION-PERMIT.docx'),
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
  throw new Error('Construction permit DOCX template not found. Expected template/CONSTRUCTION-PERMIT.docx.');
}

export async function renderConstructionPermitFromDocx(
  doc: { residentName: string; dateIssued: string },
  fields: CertificateFieldMap,
): Promise<{
  docxBuffer: Buffer;
  printableHtml: string;
  templatePath: string;
}> {
  const templatePath = await resolveTemplatePath();
  const templateBuffer = await fs.readFile(/*turbopackIgnore: true*/ templatePath);

  return {
    docxBuffer: templateBuffer,
    printableHtml: buildConstructionPermitPrintableHtml(doc, fields),
    templatePath,
  };
}
