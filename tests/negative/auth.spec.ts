import type { APIResponse } from '@playwright/test';

import type { TodoistApi } from '../../src/clients';
import { uniqueName } from '../../src/data';
import { expect, test, type TestData } from '../../src/fixtures';

test(
  'TC-014a A request with no access token fails with 401 and nothing is created',
  { tag: ['@TC-014', '@negative'] },
  async ({ api, unauthenticatedApi, testData }) => {
    const content = uniqueName('task');

    await test.step('Try to create a task with no token', async () => {
      const response = await createTask(unauthenticatedApi, content, testData);
      expect(response.status()).toBe(401);
    });

    await test.step('Check with the real token that no task was created', async () => {
      expect(await findTasks(api, content)).toEqual([]);
    });
  },
);

test(
  'TC-014b A request with a malformed token fails with 401 and nothing is created',
  { tag: ['@TC-014', '@negative'] },
  async ({ api, apiWithToken, testData }) => {
    const content = uniqueName('task');

    await test.step('Try to create a task with a malformed token', async () => {
      const malformed = await apiWithToken('not-a-valid-token');
      const response = await createTask(malformed, content, testData);
      expect(response.status()).toBe(401);
    });

    await test.step('Check with the real token that no task was created', async () => {
      expect(await findTasks(api, content)).toEqual([]);
    });
  },
);

/** Sends the create request and registers the task for cleanup if the API created it after all. */
async function createTask(
  caller: TodoistApi,
  content: string,
  testData: TestData,
): Promise<APIResponse> {
  const response = await caller.tasks.send('POST', 'tasks', { body: { content } });
  if (response.ok()) {
    const created = (await response.json()) as { id?: string };
    if (created.id) testData.track('task', created.id);
  }
  return response;
}

async function findTasks(api: TodoistApi, content: string): Promise<string[]> {
  const tasks = await api.tasks.list();
  return tasks.filter((task) => task.content === content).map((task) => task.id);
}
