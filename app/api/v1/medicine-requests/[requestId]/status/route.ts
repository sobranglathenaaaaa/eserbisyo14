import { fail } from '@/lib/api/contracts';

export async function PATCH() {
  return fail('RESOURCE_NOT_FOUND', 'Medicine feature has been disabled.', 410);
}
