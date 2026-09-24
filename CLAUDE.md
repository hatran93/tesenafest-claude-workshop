# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Playwright + TypeScript API tests for the Todoist REST API v1 (`https://api.todoist.com/api/v1/`), run against production with a free Todoist account. There is no browser and no app in this repo. `brief.md` holds the project requirements, and `Test Cases for automation.md` lists the test cases (TC-001 to TC-015; TC-010 and anything about sections are out of scope). `docs/test-architecture-plan.md` maps each test case to its spec file.

## Commands

```sh
npm ci                                  # installs deps and the husky git hooks
cp .env.example .env                    # then set TODOIST_API_TOKEN (never commit .env)

npm run lint                            # ESLint, type-checked rules + eslint-plugin-playwright
npm run format:check                    # Prettier (npm run format to fix)
npm run typecheck                       # tsc --noEmit, strict
npm test                                # all tests
npm run test:smoke                      # only @smoke
npx playwright test --grep @TC-007      # one test case (all its a/b/c variants)
npx playwright test tests/tasks/due-dates.spec.ts
```

Every test run hits the real Todoist account. `TEST_ENV` picks `config/<name>.ts` (only `prod` exists). To add an environment, add a file there and register it in `config/index.ts`.

## Architecture

- **`src/fixtures/index.ts` exports the `test` and `expect` that every spec imports.** Specs import from `../../src/fixtures`, never from `@playwright/test`. Fixtures are merged from:
  - `api.fixture.ts`: `api` (resource clients on an authenticated context), `unauthenticatedApi` (no Authorization header), and `apiWithToken(token)`.
  - `data.fixture.ts`: `testData.createProject/createTask/createLabel/createComment(overrides)`. Each call builds an `autotest-<run id>-` name, calls the API, and registers the id. Teardown deletes the ids in reverse order, also when the test fails, and ignores 404s. Use `testData.track(kind, id)` for anything created another way, such as through `send`.
  - `user.fixture.ts`: worker-scoped `account` and `accountTimezone`.
- **Clients** (`src/clients/`): one class per resource on top of `BaseClient`. Typed methods throw `ApiError` on non-2xx responses and follow `next_cursor` pagination in `list`. `client.send(method, path, { query, body })` returns the raw `APIResponse`; use it to assert on status codes. `types.ts` only lists the fields the tests read. Full response shapes are checked with `expect(body).toMatchSchema(Schema.task)` against the pinned `src/schemas/openapi.json` (Ajv; refresh it with `node scripts/update-openapi.mts` and review the diff).
- **Run id:** `playwright.config.ts` calls `getRunId()` in the main process and stores it in `AUTOTEST_RUN_ID`, so all workers share one prefix. The prefix starts with a UTC timestamp, so `src/global-setup.ts` can delete `autotest-` data older than 1 hour. This keeps the free plan's active-project limit from blocking later runs.
- **Dates:** compute "today" and "tomorrow" with `src/utils/dates.ts` and `accountTimezone`, never the runner's clock (CI runs in UTC; the account uses its own timezone).
- **Token safety (the repo is public):** `src/reporters/redact-reporter.ts` must stay the **first** reporter. It rewrites traces, attachments, errors and stdout synchronously in `onTestEnd`, before the HTML reporter copies anything. `ApiError` and `RequestFailedError` redact their messages. CI runs `scripts/check-no-token.mts` before uploading artifacts. Keep `trace: 'retain-on-failure'`. `no-console` is an error outside `scripts/`.

## Writing tests

- Title `TC-XXX <name>`; tags `['@TC-XXX', '<suite>']`, where the suite is `@smoke` (TC-001 to TC-005), `@regression`, `@e2e` or `@negative`. Wrap each step in a readable `test.step()`, and check one behavior per test. A test case with several inputs becomes one test per input: `TC-015a`, `TC-015b`, and so on.
- Load the resource again after creating or updating it, and assert on the loaded value, not only on the create response.
- **When the spec doesn't settle the expected result, call the API first and assert what it actually does.** List that as an assumption in the PR description. Behavior observed so far:
  - Validation errors return 400 with `error_tag` `INVALID_ARGUMENT_VALUE` (empty content), `ARGUMENT_MISSING` (no content) or `BAD_REQUEST` (unreadable due date).
  - A bad or missing token returns 401 `UNAUTHORIZED`.
  - `close` and `reopen` return 204. Closing a recurring task keeps it open and moves `due.date` forward.
- **Free plan:** `deadline_date` returns 403 `PREMIUM_ONLY`, and `duration` is silently dropped. Mark tests that need premium features `test.fixme()` with the reason.
- **eslint-plugin-playwright gotchas:**
  - `expect` calls inside a helper don't count for `expect-expect`, so keep the assertions in the test body.
  - Put `if` logic, such as tracking a resource that was created unexpectedly, in a helper function outside the test (`no-conditional-in-test`).
  - An intentional conditional `test.skip(...)` needs `// eslint-disable-next-line playwright/no-skipped-test -- <reason>`.

## Git workflow

- Every change goes GitHub issue → branch `<issue id>-<short-description>` → PR. There is one issue per test case (TC-001 to TC-015 are issues #5 to #18). Assign the issue before starting, because collaborators work on these issues in parallel. Branch from an up-to-date `origin/main`.
- The first line of a commit message must be `#<issue id> <summary>` (the `commit-msg` hook enforces this). The `pre-commit` hook runs lint-staged. `pre-push` blocks pushes to `main`.
- `main` is protected. A PR needs 1 approval, the passing check `Lint, type check and tests`, and a branch that is up to date with `main`. The rules also apply to admins. Never merge a PR yourself.
- `gh` runs as the repo owner, so PRs created here are authored by the owner, who cannot approve them. Another collaborator has to review them.
- Fill in `.github/pull_request_template.md`, including Assumptions and the checklist. Issue forms in `.github/ISSUE_TEMPLATE/` set `type:` labels. `issue-labels.yml` turns the Priority and Area answers into `priority:` and `area:` labels.
- CI: `pr.yml` runs on every PR (never use `pull_request_target`). `smoke.yml` runs `@smoke` every hour and opens or comments on a `smoke-failure` issue when it fails. Both share the `todoist-account` concurrency group and use at most 2 workers. Retries are 1 in CI and 0 locally. Tests that pass only on retry are reported as flaky.
