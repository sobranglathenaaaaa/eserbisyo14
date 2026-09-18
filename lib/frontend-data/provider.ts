import type { DataProvider } from './contracts/data-provider';
import { backendProvider } from './providers/backend-provider';

export function getDataProvider(): DataProvider {
  return backendProvider;
}
