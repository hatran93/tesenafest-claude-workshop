import { expect, Schema, test } from '../../src/fixtures';

test(
  'TC-012 A task ticked off by mistake can be put back among the open ones as the same task',
  { tag: ['@TC-012', '@regression'] },
  async ({ api, testData }) => {
    const { project, created } = await test.step('Create a project with one task', async () => {
      const project = await testData.createProject();
      const created = await testData.createTask({ project_id: project.id });
      return { project, created };
    });

    await test.step('Tick the task off', async () => {
      await api.tasks.close(created.id);
      const task = await api.tasks.get(created.id);
      expect(task.checked).toBe(true);
      expect(await api.tasks.list({ project_id: project.id })).toEqual([]);
    });

    await test.step('Put the task back', () => api.tasks.reopen(created.id));

    await test.step('Check the same task is open again and nothing new was created', async () => {
      const task = await api.tasks.get(created.id);
      expect(task).toMatchSchema(Schema.task);
      expect(task).toMatchObject({
        id: created.id,
        content: created.content,
        checked: false,
        completed_at: null,
      });

      const tasks = await api.tasks.list({ project_id: project.id });
      expect(tasks.map((openTask) => openTask.id)).toEqual([created.id]);
    });
  },
);
