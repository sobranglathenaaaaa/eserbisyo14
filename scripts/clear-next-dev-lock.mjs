import { access, rm } from 'node:fs/promises';
import { constants } from 'node:fs';

const lockPath = '.next/dev/lock';

async function clearLock() {
  try {
    await access(lockPath, constants.F_OK);
  } catch {
    console.log('No Next.js dev lock found.');
    return;
  }

  await rm(lockPath, { force: true });
  console.log('Removed .next/dev/lock. You can restart with `npm run dev`.');
}

clearLock().catch((error) => {
  console.error('Unable to clear Next.js dev lock:', error);
  process.exitCode = 1;
});
