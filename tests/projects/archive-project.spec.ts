import { expect, Schema, test } from '../../src/fixtures';

test(
  'TC-016 An archived project leaves the active projects and keeps its tasks',
  { tag: ['@TC-016', '@regression'] },
  async ({ api, testData }) => {
    const { project, task } = await test.step('Create a project with one task', async () => {
      const project = await testData.createProject();
      const task = await testData.createTask({ project_id: project.id });
      return { project, task };
    });

    await test.step('Archive the project', async () => {
      // The archive response still shows is_archived: false, so the state is checked on reload.
      expect(await api.projects.archive(project.id)).toMatchSchema(Schema.project);
    });

    await test.step('Load the project and check it is archived', async () => {
      const loaded = await api.projects.get(project.id);
      expect(loaded).toMatchSchema(Schema.project);
      expect(loaded.is_archived).toBe(true);
    });

    await test.step('Check it moved from the active to the archived projects', async () => {
      const activeIds = (await api.projects.list()).map((listed) => listed.id);
      const archivedIds = (await api.projects.listArchived()).map((listed) => listed.id);
      expect(activeIds).not.toContain(project.id);
      expect(archivedIds).toContain(project.id);
    });

    await test.step('Check the task is kept in the project', async () => {
      const loaded = await api.tasks.get(task.id);
      expect(loaded).toMatchSchema(Schema.task);
      expect(loaded).toMatchObject({ project_id: project.id, checked: false });
    });
  },
);

test(
  'TC-017 An unarchived project returns to the active projects with its tasks',
  { tag: ['@TC-017', '@regression'] },
  async ({ api, testData }) => {
    const { project, task } =
      await test.step('Create an archived project with one task', async () => {
        const project = await testData.createProject();
        const task = await testData.createTask({ project_id: project.id });
        await api.projects.archive(project.id);
        return { project, task };
      });

    await test.step('Unarchive the project', async () => {
      const unarchived = await api.projects.unarchive(project.id);
      expect(unarchived).toMatchSchema(Schema.project);
      expect(unarchived.is_archived).toBe(false);
    });

    await test.step('Load the project and check it is active', async () => {
      const loaded = await api.projects.get(project.id);
      expect(loaded).toMatchSchema(Schema.project);
      expect(loaded.is_archived).toBe(false);
    });

    await test.step('Check it moved from the archived to the active projects', async () => {
      const activeIds = (await api.projects.list()).map((listed) => listed.id);
      const archivedIds = (await api.projects.listArchived()).map((listed) => listed.id);
      expect(activeIds).toContain(project.id);
      expect(archivedIds).not.toContain(project.id);
    });

    await test.step("Check the task is among the project's open tasks", async () => {
      const tasks = await api.tasks.list({ project_id: project.id });
      expect(tasks.map((listed) => listed.id)).toEqual([task.id]);
    });
  },
);
