import { expect, Schema, test } from '../../src/fixtures';
import { addDays, tomorrowIn } from '../../src/utils/dates';

test(
  'TC-009 A due date entered in words lands on the same day as the same date entered explicitly',
  { tag: ['@TC-009', '@regression'] },
  async ({ api, testData, accountTimezone }) => {
    const explicitDate = tomorrowIn(accountTimezone);

    const inWords = await test.step('Create a task due "tomorrow"', () =>
      testData.createTask({ due_string: 'tomorrow', due_lang: 'en' }));

    const explicit = await test.step(`Create a task due on ${explicitDate}`, () =>
      testData.createTask({ due_date: explicitDate }));

    // If midnight passed in the account's timezone meanwhile, "tomorrow" meant two different days.
    // eslint-disable-next-line playwright/no-skipped-test -- conditional skip, not a disabled test
    test.skip(
      tomorrowIn(accountTimezone) !== explicitDate,
      'Midnight passed in the account timezone during the test',
    );

    await test.step('Load both tasks and check they are due on the same day', async () => {
      const [wordsTask, explicitTask] = await Promise.all([
        api.tasks.get(inWords.id),
        api.tasks.get(explicit.id),
      ]);
      expect(wordsTask).toMatchSchema(Schema.task);
      expect(explicitTask).toMatchSchema(Schema.task);
      expect(explicitTask.due?.date).toBe(explicitDate);
      expect(wordsTask.due?.date).toBe(explicitTask.due?.date);
    });
  },
);

test(
  'TC-013 A recurring task does not disappear when ticked off and moves on to its next due date',
  { tag: ['@TC-013', '@regression'] },
  async ({ api, testData }) => {
    const created = await test.step('Create a task due "every day"', async () => {
      const task = await testData.createTask({ due_string: 'every day', due_lang: 'en' });
      expect(task.due?.is_recurring).toBe(true);
      return task;
    });

    const firstDueDate = created.due?.date ?? '';

    await test.step('Tick the task off', () => api.tasks.close(created.id));

    await test.step('Load the task and check it is open with the next due date', async () => {
      const task = await api.tasks.get(created.id);
      expect(task).toMatchSchema(Schema.task);
      expect(task.checked).toBe(false);
      expect(task.due).toMatchObject({ date: addDays(firstDueDate, 1), is_recurring: true });
    });

    await test.step("Find the task among the project's open tasks", async () => {
      const tasks = await api.tasks.list({ project_id: created.project_id });
      expect(tasks.map((task) => task.id)).toContain(created.id);
    });
  },
);
