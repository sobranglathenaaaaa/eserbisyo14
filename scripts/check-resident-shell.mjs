import fs from 'node:fs';
import path from 'node:path';

const appResidentDir = path.resolve(process.cwd(), 'app', 'resident');
const residentDashboardPath = path.resolve(appResidentDir, 'dashboard', 'page.tsx');
const violations = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.tsx')) {
      continue;
    }

    const source = fs.readFileSync(fullPath, 'utf8');
    if (source.includes('PortalShell')) {
      violations.push(fullPath);
    }
  }
}

if (!fs.existsSync(appResidentDir)) {
  console.log('Resident app directory not found; skipping shell guard.');
  process.exit(0);
}

walk(appResidentDir);

if (violations.length > 0) {
  console.error('Resident shell guard failed. Use ResidentShell in app/resident pages, not PortalShell.');
  for (const file of violations) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

if (!fs.existsSync(residentDashboardPath)) {
  console.error('Resident shell guard failed. Dashboard page is missing:', residentDashboardPath);
  process.exit(1);
}

const residentDashboardSource = fs.readFileSync(residentDashboardPath, 'utf8');
const hasResidentShellImport = residentDashboardSource.includes("from '@/features/resident/view/resident-shell'");
const hasResidentShellUsage = residentDashboardSource.includes('<ResidentShell');

if (!hasResidentShellImport || !hasResidentShellUsage) {
  console.error('Resident shell guard failed. Resident dashboard must import and render ResidentShell.');
  console.error(`- ${residentDashboardPath}`);
  process.exit(1);
}

console.log('Resident shell guard passed.');
