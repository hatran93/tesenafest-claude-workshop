import { expect, Schema, test } from '../src/fixtures';
import { tomorrowIn } from '../src/utils/dates';

test(
  'TC-003 A new task is created with the due date that was entered',
  {
    tag: ['@TC-003', '@smoke'],
  },
  async ({ api, accountTimezone, testData }) => {
    const dueDate = tomorrowIn(accountTimezone);

    const created = await test.step('Create a task with tomorrow as its due date', () =>
      testData.createTask({ due_date: dueDate }));

    await test.step('Check the creation response', () => {
      expect(created).toMatchSchema(Schema.task);
      expect(created.due?.date).toBe(dueDate);
      expect(created.due?.is_recurring).toBe(false);
    });

    await test.step('Load the task and check its due date', async () => {
      const task = await api.tasks.get(created.id);
      expect(task).toMatchSchema(Schema.task);
      expect(task.due?.date).toBe(dueDate);
      expect(task.due?.is_recurring).toBe(false);
    });
  },
);
