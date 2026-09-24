import { expect, Schema, test } from '../../src/fixtures';

test(
  'TC-011 A project from empty to done: three tasks, two ticked off, one still open at the end',
  { tag: ['@TC-011', '@e2e'] },
  async ({ api, testData }) => {
    const project = await test.step('Create an empty project', async () => {
      const project = await testData.createProject();
      expect(await api.tasks.list({ project_id: project.id })).toEqual([]);
      return project;
    });

    const [first, second, third] = await test.step('Add three tasks', async () => {
      const tasks = [];
      for (let i = 0; i < 3; i++) tasks.push(await testData.createTask({ project_id: project.id }));
      const listed = await api.tasks.list({ project_id: project.id });
      expect(listed).toHaveLength(3);
      return tasks as [(typeof tasks)[0], (typeof tasks)[0], (typeof tasks)[0]];
    });

    await test.step('Tick off two tasks', async () => {
      await api.tasks.close(first.id);
      await api.tasks.close(second.id);
    });

    await test.step('Check that only the third task is still open', async () => {
      const open = await api.tasks.list({ project_id: project.id });
      expect(open.map((task) => task.id)).toEqual([third.id]);
      expect(open[0]).toMatchSchema(Schema.task);
    });

    await test.step('Check that the two ticked off tasks are completed', async () => {
      for (const done of [first, second]) {
        const task = await api.tasks.get(done.id);
        expect(task).toMatchSchema(Schema.task);
        expect(task.checked).toBe(true);
        expect(task.completed_at).not.toBeNull();
      }
    });
  },
);
