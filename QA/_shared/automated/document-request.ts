import { expect } from '@playwright/test';
import type { APIResponse } from '@playwright/test';
import { expectOkJson } from './contracts';

type DocumentType = {
  id: string;
  category: string;
  type: string;
  price: number;
};

type DocumentRequest = {
  id: string;
  reference_number: string;
  resident_id: string;
  status: string;
};

export async function getFirstDocumentTypeId(apiFetch: (url: string) => Promise<APIResponse>): Promise<string> {
  const response = await apiFetch('/api/v1/document-types');
  const payload = await expectOkJson<{ documentTypes: DocumentType[] }>(response);
  const first = payload.data.documentTypes[0];
  expect(first?.id).toBeTruthy();
  return first.id;
}

export async function getAutoReleaseDocumentType(
  apiFetch: (url: string) => Promise<APIResponse>
): Promise<DocumentType> {
  const response = await apiFetch('/api/v1/document-types');
  const payload = await expectOkJson<{ documentTypes: DocumentType[] }>(response);
  const barangayCertificate = payload.data.documentTypes.find((item) => {
    const type = item.type.toLowerCase();
    return type.includes('barangay') && type.includes('certificate');
  });
  const indigency = payload.data.documentTypes.find((item) => {
    const type = item.type.toLowerCase();
    return type.includes('indigency') && type.includes('assistance');
  });
  const permit = payload.data.documentTypes.find((item) => {
    const category = item.category.toLowerCase();
    return (
      category.includes('business clearance') ||
      category.includes('business clearances') ||
      category.includes('construction clearance') ||
      category.includes('construction clearances')
    );
  });
  const supported = barangayCertificate ?? indigency ?? permit;
  expect(supported, 'expected at least one OCR-template-backed document type').toBeTruthy();
  return supported!;
}

export async function createDocumentRequest(
  apiPost: (url: string, data: unknown) => Promise<APIResponse>,
  documentTypeId: string,
  purpose: string,
  selectedTypeLabel?: string
): Promise<DocumentRequest> {
  const response = await apiPost('/api/v1/document-requests', {
    documentTypeId,
    purpose,
    selectedTypeLabel,
  });
  const payload = await expectOkJson<DocumentRequest>(response);
  return payload.data;
}
