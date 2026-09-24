---
name: writing-todoist-api-tests
description: Use when adding or changing a Playwright API test in this repo, implementing a TC-xxx test case or a "[Test]" GitHub issue, or when the expected Todoist API behavior (status code, error, free-plan support) is unclear.
---

# Writing Todoist API tests

## Overview

A test here is finished when it asserts the API's **real** behavior (observed, not guessed), leaves no data behind, and passes lint on the first run. Most defects come from guessing the expected behavior and from assertions that check only the response to a create or update.

## Workflow

1. **Read the issue** (`gh issue view <n>`). Assign it to yourself (`gh issue edit <n> --add-assignee @me`), because collaborators pick up issues in parallel. Branch `<n>-<short-description>` from a freshly fetched `origin/main`.
2. **Find the endpoint** in `src/schemas/openapi.json`: its path, parameters and response schema.
3. **Probe before asserting** anything the spec leaves open: status codes, error tags, edge cases, and whether the free plan supports the feature (see Probing).
4. **Write the spec** in the style of the example below. Add any missing client method to `src/clients/<Resource>Client.ts` using `postJson`, `getJson` or `listAll`.
5. **Verify:** `npm run lint`, `npm run typecheck`, `npm run format:check`, `npx playwright test --grep @TC-XXX`. Run the test 3 times if it depends on dates or lists, then check that no `autotest-` data is left over. Include archived projects in that check.
6. **Open the PR** from `.github/pull_request_template.md`. List every probed behavior under Assumptions.

## Example

```ts
import { expect, Schema, test } from '../../src/fixtures';

test(
  'TC-016 An archived project leaves the active projects and keeps its tasks',
  { tag: ['@TC-016', '@regression'] },
  async ({ api, testData }) => {
    const { project, task } = await test.step('Create a project with one task', async () => {
      const project = await testData.createProject(); // auto-deleted, also on failure
      const task = await testData.createTask({ project_id: project.id });
      return { project, task };
    });

    await test.step('Archive the project', async () => {
      // Probed: the archive response still says is_archived: false, so check after reloading.
      expect(await api.projects.archive(project.id)).toMatchSchema(Schema.project);
    });

    await test.step('Load the project and check it is archived', async () => {
      const loaded = await api.projects.get(project.id); // assert on the reloaded resource
      expect(loaded).toMatchSchema(Schema.project);
      expect(loaded.is_archived).toBe(true);
    });
  },
);
```

## Quick reference

| Need                                | Use                                                                                     |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| Data that is deleted after the test | `testData.createProject/Task/Label/Comment(overrides)`                                  |
| Something created through `send`    | `testData.track('task', id)`                                                            |
| Status-code assertions              | `api.tasks.send('POST', 'tasks', { body })` returns the raw response                    |
| No token / a bad token              | `unauthenticatedApi`, `await apiWithToken('bad')`                                       |
| Today or tomorrow                   | `todayIn(accountTimezone)` and `tomorrowIn(accountTimezone)` from `src/utils/dates.ts`  |
| Several inputs for one test case    | One test each: `TC-015a`, `TC-015b`, all tagged `@TC-015`                               |
| A premium-only feature              | `test.fixme(title, { tag, annotation: { type: 'fixme', description: '<why>' } }, body)` |

## Probing

```sh
node --env-file=.env probe.mjs   # put probe.mjs in a scratch directory, never in the repo
```

- **Use a fetch script against `https://api.todoist.com/api/v1/`.** Send the header `Authorization: Bearer ${process.env.TODOIST_API_TOKEN}`, and never print the header or the token.
- **Name probe data `autotest-20000101T000000Z-probe-<x>`.** The old timestamp means the global setup removes it if your script crashes, and the script deletes the data itself at the end.
- **Probe the free plan one field at a time.** When a combined request fails, try each field on its own. Known results: `deadline_date` returns 403 `PREMIUM_ONLY`, and `duration` is silently dropped.

## Common mistakes

| Mistake                                                                   | Fix                                                                                                                                                                          |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guessing the status code or error                                         | Probe it, assert what the API returns (`http_code` and `error_tag`), and record it in the PR                                                                                 |
| Asserting only the create or update response                              | Also load the resource again (`get` or `list`) and assert on that. Responses can be stale.                                                                                   |
| A schema check on the create response only                                | Run `toMatchSchema` on every body the test reads, including listed items                                                                                                     |
| `expect` only inside a helper                                             | Lint fails `expect-expect`. Keep the assertions in the test body and let helpers return data.                                                                                |
| `if` or `?:` in the test body                                             | Move the branch into a helper outside the test (`no-conditional-in-test`)                                                                                                    |
| Passing `testData.track` as a callback                                    | Pass `testData` and call `testData.track(...)` (`unbound-method`)                                                                                                            |
| Computing "tomorrow" once, then comparing with a date the server computed | Midnight can pass in between. Re-check after the API calls and use a conditional `test.skip(...)` with `// eslint-disable-next-line playwright/no-skipped-test -- <reason>`. |
| Negative test that doesn't track an unexpected success                    | If `response.ok()`, track the id in a helper, so a failing test leaves no data                                                                                               |
| Checking leftovers only in the active project list                        | Also check `GET projects/archived`                                                                                                                                           |
