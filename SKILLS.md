# Skills

Reference for the capabilities exercised by the specs in this repo. Each entry describes what a
test covers, where it lives and how to run it.

## HAR-derived e2e: a project with a task inside it

`tests/e2e/project-with-task.spec.ts`, tag `@e2e`.

**Where it comes from.** A recorded session of the Todoist web app (a HAR capture of
`app.todoist.com`). The recording contains 24 entries, of which the meaningful ones are four
`POST /api/v1/sync` calls. Two carry user actions:

| Sync command  | Args recorded                                                  |
| ------------- | -------------------------------------------------------------- |
| `project_add` | `name: "myproject"`, `color: charcoal`                         |
| `item_add`    | `content: "mytask"`, `project_id` of the project created above |

`/api/v1/sync` is the web app's internal endpoint and is not part of the public API surface this
suite tests. The spec therefore asserts the same user journey through the public REST endpoints
the clients in `src/clients/` wrap.

**What it does.**

1. Create a project through `testData.createProject` with a unique `autotest-` name and
   `color: 'charcoal'`; validate the body against `Schema.project` and check name and color.
2. Add a task to that project through `testData.createTask` with `project_id`; validate against
   `Schema.task` and check content and `project_id`.
3. Reload the task with `api.tasks.get(id)` and verify it kept its text and project and is not
   checked, so the assertion is not limited to the create response.
4. List the project's tasks with `api.tasks.list({ project_id })` and verify it contains exactly
   that one task.

**What it relies on.** The `api` and `testData` fixtures from `src/fixtures`, which supply the
authenticated request context, the `autotest-<runId>-` naming and cleanup in reverse order after
the test. Nothing in the spec builds a request context or deletes data by hand.

**Run it.**

```sh
npx playwright test tests/e2e/project-with-task.spec.ts --reporter=list
npx playwright test --grep '@e2e'
```

**Notes.** The test has no `TC-0XX` id, because the journey is not listed in
`Test Cases for automation.md`. The "exactly one task" assertion is safe only because the project
is created fresh inside the test. HAR recordings contain live session cookies, so they stay in the
gitignored `tmp/` folder and are never committed.
