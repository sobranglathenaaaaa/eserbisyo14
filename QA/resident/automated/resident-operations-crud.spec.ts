import { expect, test } from '@playwright/test';
import { createAuthedApiContext } from '../../_shared/automated/auth';
import { expectOkJson } from '../../_shared/automated/contracts';
import { createQaRunTag } from '../../_shared/automated/env';

const ONE_PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wv9xLkAAAAASUVORK5CYII=';

test.describe('Resident: Operations CRUD', () => {
  test('RES-OPS-001 queue delete intent should map to cancelled status', async ({ request }) => {
    const runTag = createQaRunTag();
    const { api } = await createAuthedApiContext(request, 'resident');

    const queueCreate = await api.post('/api/v1/queue/tickets', {
      data: {
        serviceType: `QA Queue ${runTag}`,
      },
    });
    const queuePayload = await expectOkJson<{ id: string }>(queueCreate);
    const queueDelete = await api.delete(`/api/v1/queue/tickets/${queuePayload.data.id}`);
    const queueDeletedPayload = await expectOkJson<{ status: string }>(queueDelete);
    expect(queueDeletedPayload.data.status).toBe('cancelled');
  });

  test('RES-OPS-002 OCR should support CRUD flows', async ({ request }) => {
    const { api } = await createAuthedApiContext(request, 'resident');

    const ocrCreate = await api.post('/api/v1/ocr/jobs', {
      multipart: {
        file: {
          name: 'qa-ocr.png',
          mimeType: 'image/png',
          buffer: Buffer.from(ONE_PIXEL_PNG_BASE64, 'base64'),
        },
      },
    });
    const ocrPayload = await expectOkJson<{ id: string; status: string }>(ocrCreate);
    expect(['completed', 'failed', 'processing']).toContain(ocrPayload.data.status);

    const ocrUpdate = await api.patch(`/api/v1/ocr/jobs/${ocrPayload.data.id}`, {
      data: { extractedText: 'Manual correction from QA flow' },
    });
    const ocrUpdatedPayload = await expectOkJson<{ extractedText: string }>(ocrUpdate);
    expect(ocrUpdatedPayload.data.extractedText).toContain('Manual correction');

    const ocrDelete = await api.delete(`/api/v1/ocr/jobs/${ocrPayload.data.id}`);
    const ocrDeletePayload = await expectOkJson<{ deleted: boolean }>(ocrDelete);
    expect(ocrDeletePayload.data.deleted).toBe(true);
  });
});
