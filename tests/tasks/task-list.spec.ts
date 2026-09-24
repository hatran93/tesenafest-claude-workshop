import { expect, Schema, test } from '../../src/fixtures';

test(
  "TC-008 A project's task list contains only the tasks of that project",
  { tag: ['@TC-008', '@regression'] },
  async ({ api, testData }) => {
    const { project, ownTaskIds } = await test.step('Create a project with two tasks', async () => {
      const project = await testData.createProject();
      const first = await testData.createTask({ project_id: project.id });
      const second = await testData.createTask({ project_id: project.id });
      return { project, ownTaskIds: [first.id, second.id] };
    });

    await test.step('Create tasks in another project and in the Inbox', async () => {
      const otherProject = await testData.createProject();
      await testData.createTask({ project_id: otherProject.id });
      await testData.createTask();
    });

    await test.step("Load the project's tasks and check they are exactly its own", async () => {
      const response = await api.tasks.send('GET', 'tasks', { query: { project_id: project.id } });
      expect(response.status()).toBe(200);
      const page: unknown = await response.json();
      expect(page).toMatchSchema(Schema.taskPage);

      const tasks = await api.tasks.list({ project_id: project.id });
      expect(tasks.map((task) => task.id).sort()).toEqual([...ownTaskIds].sort());
      for (const task of tasks) expect(task.project_id).toBe(project.id);
    });
  },
);
