import { test, expect } from '@playwright/test';
import { createAuthedApiContext } from '../../_shared/automated/auth';
import { createQaRunTag } from '../../_shared/automated/env';
import { expectOkJson } from '../../_shared/automated/contracts';

type AnnouncementRow = {
  id: string;
  title: string;
  start_at?: string | null;
  end_at?: string | null;
};

test.describe('Admin: Announcements', () => {
  test('ADM-ANN-001 should show resident announcements only inside the schedule window', async ({ request }) => {
    const runTag = createQaRunTag();
    const adminCtx = await createAuthedApiContext(request, 'admin');
    const now = Date.now();

    const activeTitle = `Active schedule ${runTag}`;
    const futureTitle = `Future schedule ${runTag}`;
    const expiredTitle = `Expired schedule ${runTag}`;

    const active = await adminCtx.api.post('/api/v1/announcements', {
      data: {
        title: activeTitle,
        body: 'Visible during the current schedule window.',
        audience: 'resident',
        startAt: new Date(now - 60_000).toISOString(),
        endAt: new Date(now + 60 * 60_000).toISOString(),
      },
    });
    await expectOkJson<AnnouncementRow>(active);

    const future = await adminCtx.api.post('/api/v1/announcements', {
      data: {
        title: futureTitle,
        body: 'Hidden before the start schedule.',
        audience: 'resident',
        startAt: new Date(now + 60 * 60_000).toISOString(),
        endAt: new Date(now + 120 * 60_000).toISOString(),
      },
    });
    await expectOkJson<AnnouncementRow>(future);

    const expired = await adminCtx.api.post('/api/v1/announcements', {
      data: {
        title: expiredTitle,
        body: 'Hidden after the end schedule.',
        audience: 'resident',
        startAt: new Date(now - 120 * 60_000).toISOString(),
        endAt: new Date(now - 60_000).toISOString(),
      },
    });
    await expectOkJson<AnnouncementRow>(expired);

    const residentCtx = await createAuthedApiContext(request, 'resident');
    const residentList = await residentCtx.api.get('/api/v1/announcements');
    const residentPayload = await expectOkJson<{ announcements: AnnouncementRow[] }>(residentList);
    const residentTitles = residentPayload.data.announcements.map((item) => item.title);

    expect(residentTitles).toContain(activeTitle);
    expect(residentTitles).not.toContain(futureTitle);
    expect(residentTitles).not.toContain(expiredTitle);

    const adminList = await adminCtx.api.get('/api/v1/announcements');
    const adminPayload = await expectOkJson<{ announcements: AnnouncementRow[] }>(adminList);
    const adminTitles = adminPayload.data.announcements.map((item) => item.title);

    expect(adminTitles).toEqual(expect.arrayContaining([activeTitle, futureTitle, expiredTitle]));
  });
});
