import { uniqueName } from '../../src/data';
import { expect, Schema, test } from '../../src/fixtures';

test(
  'TC-001 A new project is created and comes back under the name that was entered',
  { tag: ['@TC-001', '@smoke'] },
  async ({ api, testData }) => {
    const name = uniqueName('project');

    const created = await test.step('Create a project with a unique name', async () => {
      const project = await testData.createProject({ name });
      expect(project).toMatchSchema(Schema.project);
      expect(project.name).toBe(name);
      return project;
    });

    await test.step('Load the project and check its name', async () => {
      const project = await api.projects.get(created.id);
      expect(project).toMatchSchema(Schema.project);
      expect(project.name).toBe(name);
    });
  },
);

test(
  'TC-006 A renamed project loads under the new name the next time it is opened',
  { tag: ['@TC-006', '@regression'] },
  async ({ api, testData }) => {
    const newName = uniqueName('project-renamed');

    const created = await test.step('Create a project', () => testData.createProject());

    await test.step('Rename the project', async () => {
      const updated = await api.projects.update(created.id, { name: newName });
      expect(updated).toMatchSchema(Schema.project);
      expect(updated.name).toBe(newName);
    });

    await test.step('Load the project again and check the new name', async () => {
      const project = await api.projects.get(created.id);
      expect(project).toMatchSchema(Schema.project);
      expect(project.name).toBe(newName);
    });

    await test.step('Find the project in the project list under the new name', async () => {
      const listed = (await api.projects.list()).find((project) => project.id === created.id);
      expect(listed?.name).toBe(newName);
    });
  },
);
