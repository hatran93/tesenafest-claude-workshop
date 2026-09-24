import type { APIResponse } from '@playwright/test';

import { uniqueName } from '../../src/data';
import { expect, test, type TestData } from '../../src/fixtures';

// Status codes and error tags are what the API returned when these tests were written.
const cases: { id: string; title: string; body: () => object; errorTag: string }[] = [
  {
    id: 'TC-015a',
    title: 'with no text',
    body: () => ({ content: '' }),
    errorTag: 'INVALID_ARGUMENT_VALUE',
  },
  {
    id: 'TC-015b',
    title: 'with the required text field missing',
    body: () => ({ description: uniqueName('no-content') }),
    errorTag: 'ARGUMENT_MISSING',
  },
  {
    id: 'TC-015c',
    title: 'with an unreadable due date',
    body: () => ({ content: uniqueName('task'), due_string: 'blorf zzz qq' }),
    errorTag: 'BAD_REQUEST',
  },
];

for (const { id, title, body, errorTag } of cases) {
  test(
    `${id} A task ${title} is rejected`,
    { tag: ['@TC-015', '@negative'] },
    async ({ api, testData }) => {
      const payload = body();

      await test.step(`Try to create a task ${title}`, async () => {
        const response = await api.tasks.send('POST', 'tasks', { body: payload });
        await trackIfCreated(response, testData);
        expect(response.status()).toBe(400);
        expect(await response.json()).toMatchObject({ http_code: 400, error_tag: errorTag });
      });
    },
  );
}

/** Registers the task for cleanup if the API accepted it after all, so a failure leaves nothing. */
async function trackIfCreated(response: APIResponse, testData: TestData): Promise<void> {
  if (!response.ok()) return;
  const created = (await response.json()) as { id?: string };
  if (created.id) testData.track('task', created.id);
}
