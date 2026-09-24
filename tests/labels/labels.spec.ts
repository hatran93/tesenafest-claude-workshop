import { uniqueName } from '../../src/data';
import { expect, Schema, test } from '../../src/fixtures';

test(
  'TC-004 A new label is created under the name that was entered',
  { tag: ['@TC-004', '@smoke'] },
  async ({ api, testData }) => {
    const name = uniqueName('label');

    const created = await test.step('Create a label with a unique name', async () => {
      const label = await testData.createLabel({ name });
      expect(label).toMatchSchema(Schema.label);
      expect(label.name).toBe(name);
      return label;
    });

    await test.step('Load the label and check its name', async () => {
      const label = await api.labels.get(created.id);
      expect(label).toMatchSchema(Schema.label);
      expect(label.name).toBe(name);
    });
  },
);
