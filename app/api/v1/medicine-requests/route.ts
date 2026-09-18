import { fail } from '@/lib/api/contracts';

export async function GET() {
  return fail('RESOURCE_NOT_FOUND', 'Medicine feature has been disabled.', 410);
}

export async function POST() {
  return fail('RESOURCE_NOT_FOUND', 'Medicine feature has been disabled.', 410);
}
