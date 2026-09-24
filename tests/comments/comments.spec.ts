import { uniqueName } from '../../src/data';
import { Schema, expect, test } from '../../src/fixtures';

test(
  'TC-005 A comment is added to a task with the text that was entered',
  { tag: ['@TC-005', '@smoke'] },
  async ({ api, testData }) => {
    const content = uniqueName('comment');

    const task = await test.step('Create a task to comment on', () => testData.createTask());

    const createdComment = await test.step('Add a comment with unique text', async () => {
      const comment = await testData.createComment({ task_id: task.id }, { content });

      expect(comment).toMatchSchema(Schema.comment);
      expect(comment.content).toBe(content);
      return comment;
    });

    await test.step("List the task's comments", async () => {
      const comments = await api.comments.list({ task_id: task.id });

      expect(comments).toHaveLength(1);
      expect(comments[0]).toMatchObject({ id: createdComment.id, content });
      expect(comments[0]).toMatchSchema(Schema.comment);
      expect(comments[0]).toMatchObject({ id: createdComment.id, content });
  },
);
