import fs from 'node:fs';
import path from 'node:path';

const sourcePath = path.join(process.cwd(), 'app', 'resident', 'document-requests', 'page.tsx');
const source = fs.readFileSync(sourcePath, 'utf8');

if (source.includes("window.open('', '_blank', 'noopener,noreferrer")) {
  console.error('Resident printable documents must open a writable popup. Remove noopener/noreferrer from window.open().');
  process.exit(1);
}

if (!source.includes("window.open('', '_blank', 'width=980,height=1200')")) {
  console.error('Resident printable documents should open the same writable print-sized popup as staff issuance.');
  process.exit(1);
}
