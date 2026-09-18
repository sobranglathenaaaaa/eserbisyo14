import 'server-only';

import fs from 'node:fs/promises';
import path from 'node:path';
import { buildLuponSummonsPrintableHtml } from '@/lib/documents/lupon-summons';
import type { CertificateFieldMap } from '@/lib/documents/indigency-certificate';

const TEMPLATE_FILE_CANDIDATES = [
  path.join(/*turbopackIgnore: true*/ process.cwd(), 'template', 'BLANK-LUPON-SUMMONS-KP2026.docx'),
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
  throw new Error('Lupon summons DOCX template not found. Expected template/BLANK-LUPON-SUMMONS-KP2026.docx.');
}

export async function renderLuponSummonsFromDocx(
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
    printableHtml: buildLuponSummonsPrintableHtml(doc, fields),
    templatePath,
  };
}
