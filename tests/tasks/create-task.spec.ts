import { uniqueName } from '../../src/data';
import { expect, Schema, test } from '../../src/fixtures';
import { tomorrowIn } from '../../src/utils/dates';

test(
  'TC-002 A new task is created with the text that was entered',
  { tag: ['@TC-002', '@smoke'] },
  async ({ api, testData }) => {
    const content = uniqueName('task');

    const created = await test.step('Create a task with a unique text', async () => {
      const task = await testData.createTask({ content });
      expect(task).toMatchSchema(Schema.task);
      expect(task.content).toBe(content);
      return task;
    });

    await test.step('Load the task and check its text', async () => {
      const task = await api.tasks.get(created.id);
      expect(task).toMatchSchema(Schema.task);
      expect(task.content).toBe(content);
    });
  },
);

test(
  'TC-003 A new task is created with the due date that was entered',
  { tag: ['@TC-003', '@smoke'] },
  async ({ api, testData, accountTimezone }) => {
    // Tomorrow in the account's timezone, so the date is valid whatever the runner's clock says.
    const dueDate = tomorrowIn(accountTimezone);

    const created = await test.step(`Create a task due on ${dueDate}`, async () => {
      const task = await testData.createTask({ due_date: dueDate });
      expect(task).toMatchSchema(Schema.task);
      expect(task.due?.date).toBe(dueDate);
      return task;
    });

    await test.step('Load the task and check its due date', async () => {
      const task = await api.tasks.get(created.id);
      expect(task).toMatchSchema(Schema.task);
      expect(task.due).toMatchObject({ date: dueDate, is_recurring: false });
    });
  },
);

test(
  'TC-007a A task can be created with the required fields only',
  { tag: ['@TC-007', '@regression'] },
  async ({ api, testData, account }) => {
    const content = uniqueName('task');

    const created = await test.step('Create a task with only its text', () =>
      testData.createTask({ content }));

    await test.step('Load the task and check the text and the defaults', async () => {
      const task = await api.tasks.get(created.id);
      expect(task).toMatchSchema(Schema.task);
      expect(task).toMatchObject({
        content,
        description: '',
        project_id: account.inbox_project_id,
        parent_id: null,
        labels: [],
        priority: 1,
        due: null,
        checked: false,
      });
    });
  },
);

test(
  'TC-007b Every optional field of a task is stored exactly as it was entered',
  { tag: ['@TC-007', '@regression'] },
  async ({ api, testData, accountTimezone }) => {
    const { project, parent, label } =
      await test.step('Create a project, a parent task and a label', async () => {
        const project = await testData.createProject();
        const parent = await testData.createTask({ project_id: project.id });
        const label = await testData.createLabel();
        return { project, parent, label };
      });

    const dueDatetime = `${tomorrowIn(accountTimezone)}T10:00:00Z`;
    const payload = {
      content: uniqueName('task'),
      description: 'autotest description with **markdown** and ěščřžýáíé',
      project_id: project.id,
      parent_id: parent.id,
      order: 5,
      labels: [label.name],
      priority: 4,
      due_datetime: dueDatetime,
    } as const;

    const created = await test.step('Create a subtask with all optional fields', () =>
      testData.createTask({ ...payload, labels: [...payload.labels] }));

    await test.step('Load the task and check every field', async () => {
      const task = await api.tasks.get(created.id);
      expect(task).toMatchSchema(Schema.task);
      expect(task).toMatchObject({
        content: payload.content,
        description: payload.description,
        project_id: project.id,
        parent_id: parent.id,
        child_order: payload.order,
        labels: [label.name],
        priority: 4,
        due: { date: dueDatetime, is_recurring: false },
      });
    });
  },
);

test.fixme(
  'TC-007c Duration and deadline of a task are stored exactly as they were entered',
  {
    tag: ['@TC-007', '@regression'],
    annotation: {
      type: 'fixme',
      description:
        'Premium only: the free plan rejects deadline_date with 403 PREMIUM_ONLY and ignores duration.',
    },
  },
  async ({ api, testData, accountTimezone }) => {
    const dueDate = tomorrowIn(accountTimezone);

    const created = await test.step('Create a task with a duration and a deadline', () =>
      testData.createTask({
        due_date: dueDate,
        duration: 30,
        duration_unit: 'minute',
        deadline_date: dueDate,
      }));

    await test.step('Load the task and check the duration and the deadline', async () => {
      const task = await api.tasks.get(created.id);
      expect(task).toMatchSchema(Schema.task);
      expect(task.duration).toEqual({ amount: 30, unit: 'minute' });
      expect(task.deadline?.date).toBe(dueDate);
    });
  },
);
