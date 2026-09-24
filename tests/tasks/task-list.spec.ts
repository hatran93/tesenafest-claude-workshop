import type { Page, Task } from '../../src/clients';
import { expect, Schema, test } from '../../src/fixtures';

test(
  "TC-008 A project's task list contains only the tasks of that project, nothing from elsewhere",
  { tag: ['@TC-008', '@regression'] },
  async ({ api, testData }) => {
    const { projectA, tasksOfA } = await test.step('Create project A with two tasks', async () => {
      const projectA = await testData.createProject();
      const tasksOfA = [
        await testData.createTask({ project_id: projectA.id }),
        await testData.createTask({ project_id: projectA.id }),
      ];
      return { projectA, tasksOfA };
    });

    await test.step('Create project B with one task, and one task in the Inbox', async () => {
      const projectB = await testData.createProject();
      const taskOfB = await testData.createTask({ project_id: projectB.id });
      const inboxTask = await testData.createTask(); // no project_id: goes to the Inbox
      expect(taskOfB.project_id).toBe(projectB.id);
      expect(inboxTask.project_id).not.toBe(projectA.id);
    });

    await test.step('List the tasks of project A and check it holds only its two tasks', async () => {
      const response = await api.tasks.send('GET', 'tasks', {
        query: { project_id: projectA.id },
      });
      expect(response.status()).toBe(200);

      // Project A is new, so other data in the shared account cannot show up in this list.
      const page = (await response.json()) as Page<Task>;
      expect(page).toMatchSchema(Schema.taskPage);
      expect(page.next_cursor).toBeNull();
      for (const task of page.results) {
        expect(task).toMatchSchema(Schema.task);
        expect(task.project_id).toBe(projectA.id);
      }
      expect(page.results.map((task) => task.id).sort()).toEqual(
        tasksOfA.map((task) => task.id).sort(),
      );
    });
  },
);
