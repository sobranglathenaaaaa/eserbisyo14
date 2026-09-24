import { expect, test } from '@playwright/test';
import { normalizeNextPageForChat } from '../../../lib/chat/next-page';

test.describe('Resident: Chatbot next-page normalization', () => {
  test('maps aliases and routes to current resident navigation labels', async () => {
    expect(normalizeNextPageForChat('Document Requests', 'en')).toBe('Get Documents (/resident/document-requests)');
    expect(normalizeNextPageForChat('/resident/medicines', 'en')).toBe('Book an Appointment (/resident/medicines)');
    expect(normalizeNextPageForChat('request history', 'en')).toBe('Request History (/resident/request-history)');
  });

  test('supports Filipino labels and fallback behavior', async () => {
    expect(normalizeNextPageForChat('document requests', 'fil')).toBe('Kumuha ng Dokumento (/resident/document-requests)');
    expect(normalizeNextPageForChat('unknown destination', 'fil')).toBe('Simula (/resident/dashboard)');
  });
});
