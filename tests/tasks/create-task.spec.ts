import { Schema, expect, test } from '../../src/fixtures';
import { uniqueName } from '../../src/data';

test(
  'TC-002 A new task is created with the text that was entered',
  { tag: ['@TC-002', '@smoke'] },
  async ({ api, testData }) => {
    const content = uniqueName('task');

    const createdTask = await test.step('Create a task with unique text', async () => {
      const task = await testData.createTask({ content });

      expect(task).toMatchSchema(Schema.task);
      expect(task.content).toBe(content);
      return task;
    });

    await test.step('Load the task by id and verify its text', async () => {
      const task = await api.tasks.get(createdTask.id);

      expect(task.content).toBe(content);
    });
  },
);
