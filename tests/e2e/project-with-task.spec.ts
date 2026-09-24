import { Schema, expect, test } from '../../src/fixtures';
import { uniqueName } from '../../src/data';

/**
 * Derived from a recorded session of the Todoist web app (tmp/app.todoist.com.har):
 * the user adds a project and then adds a task inside it. The recording drives the app's
 * internal /api/v1/sync endpoint (project_add followed by item_add with the new project_id);
 * the same journey is asserted here through the public REST endpoints the suite uses.
 */
test(
  'A project created by the user receives a task that is stored in that project',
  { tag: ['@e2e'] },
  async ({ api, testData }) => {
    const projectName = uniqueName('project');
    const taskContent = uniqueName('task');

    const project = await test.step('Create a project', async () => {
      const created = await testData.createProject({ name: projectName, color: 'charcoal' });

      expect(created).toMatchSchema(Schema.project);
      expect(created.name).toBe(projectName);
      expect(created.color).toBe('charcoal');
      return created;
    });

    const task = await test.step('Add a task to the new project', async () => {
      const created = await testData.createTask({
        content: taskContent,
        project_id: project.id,
      });

      expect(created).toMatchSchema(Schema.task);
      expect(created.content).toBe(taskContent);
      expect(created.project_id).toBe(project.id);
      return created;
    });

    await test.step('Load the task by id and verify it kept its project and text', async () => {
      const loaded = await api.tasks.get(task.id);

      expect(loaded.content).toBe(taskContent);
      expect(loaded.project_id).toBe(project.id);
      expect(loaded.checked).toBe(false);
    });

    await test.step("Verify the project's task list contains exactly that task", async () => {
      const tasks = await api.tasks.list({ project_id: project.id });

      expect(tasks.map((item) => item.id)).toEqual([task.id]);
    });
  },
);
