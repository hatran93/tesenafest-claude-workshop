# Agent instructions

Playwright + TypeScript **API** test suite (no browser) for the Todoist API v1, built for the Tesena Fest 2026 workshop. `src/` is the framework, `tests/` holds the specs, and each test case has a `TC-0XX` id defined in `Test Cases for automation.md`.

Read `brief.md` (the requirements) and `docs/test-architecture-plan.md` (the agreed design, including which spec file each test case belongs in) before adding tests. They are the source of truth when this file is silent.

## Commands

```sh
npm ci                  # deps + git hooks
npm run lint            # eslint
npm run format:check    # prettier (npm run format to fix)
npm run typecheck       # tsc --noEmit
npm test                # all tests
npm run test:smoke      # only @smoke
```

Run a single test case by tag, which is the usual way since every test has one:

```sh
npx playwright test --grep '@TC-002'                       # one test case, anywhere
npx playwright test tests/tasks/create-task.spec.ts        # one file
npx playwright test --grep '@TC-002' --reporter=list       # concise output
npx playwright test --grep '@TC-002' --debug               # step through
```

Tests hit the **real production API** with a real token, so a run creates and deletes live data. `TODOIST_API_TOKEN` must be in `.env` (copy `.env.example`). `TEST_ENV` picks `config/<name>.ts` and defaults to `prod`.

Scripts under `scripts/` are `.mts` and run directly on Node 24's type stripping: `node scripts/check-no-token.mts`. No build step.

## Architecture

**No login anywhere.** `createApiContext` (`src/clients/createApiContext.ts`) builds an `APIRequestContext` with the base URL and a Bearer `Authorization` header from `TODOIST_API_TOKEN`. There is no session, no OAuth, no sign-in step. `UserClient` exists to read the account timezone, not to authenticate.

**One import for specs.** Always `import { expect, Schema, test } from '../../src/fixtures'`. That barrel exports `mergeTests(dataTest, userTest)`, where `dataTest` extends `apiTest`, so `api`, `apiRequest`, `unauthenticatedApi`, `apiWithToken`, `testData`, `account` and `accountTimezone` all arrive through the one `test`. Never import `test` from `@playwright/test` in a spec, and never build a request context by hand in a spec.

**Clients are thin; `BaseClient` does the work.** Typed methods (`getJson`/`postJson`) throw `ApiError` on non-2xx. For negative tests that assert on a status code, use `api.<resource>.send(method, path, options)`, which returns the raw `APIResponse` without throwing. List endpoints are paginated (`{ results, next_cursor }`), and `listAll` walks every page, so `client.list()` already returns the complete set.

**Test data is prefixed and self-cleaning.** Builders in `src/data/` generate `autotest-<runId>-<kind>-<random>` names. `runId` embeds the run's **UTC start time** (`20260924T101500Z-local`) for a specific reason: labels carry no creation date in the API, so encoding the timestamp in the name is the only way `global-setup.ts` can tell which leftovers are older than an hour and safe to delete. Keep that format intact if you touch `runId.ts`.

Create data through `testData.create*`, which registers the id and deletes it in reverse order after the test, including on failure. For anything created another way (for example via `send`), call `testData.track(kind, id)` so it still gets cleaned up.

**Schema validation is mandatory for successful responses.** `src/schemas/openapi.json` is a pinned snapshot of the spec. The validator rewrites `#/components/schemas/` refs to `#/$defs/` so Ajv 2020 can compile them. Assert with the `Schema` aliases (`Schema.task`, `Schema.comment`, ...) rather than raw generated names like `ItemSyncView`. Refresh the snapshot only deliberately with `node scripts/update-openapi.mts` and review the diff.

**Token redaction spans several files and is easy to break.** The repo is public, so the token must not reach any artifact:

- `src/reporters/redact-reporter.ts` **must stay first** in the `reporter` array in `playwright.config.ts`. Reporters receive `onTestEnd` in order, and the HTML reporter copies attachments in `onEnd`, so redaction only wins if it runs first. Its handlers are deliberately synchronous, because Playwright does not await a promise returned from `onTestEnd`.
- `ApiError` and `RequestFailedError` redact their own messages and drop the original `cause`, because Playwright's call log includes request headers.
- `global-setup.ts` redacts by hand, since Playwright prints global setup failures before any reporter is attached.
- `no-console` is an ESLint **error** outside `scripts/`. Terminal output from a test cannot be redacted after the fact.
- CI runs `scripts/check-no-token.mts` over `playwright-report/` and `test-results/` (zips included) and blocks artifact upload on a hit.

**All runs share one free Todoist account.** Both workflows use the same `concurrency: todoist-account` group with `cancel-in-progress: false`, and CI is capped at 2 workers. Tests are `fullyParallel`, so they must never share data or depend on ordering.

## Conventions

**Test shape.** Name is the id plus the test case title; tags are the id and the suite:

```ts
test('TC-003 A new task is created with the due date that was entered', {
  tag: ['@TC-003', '@smoke'],
}, async ({ api, accountTimezone, testData }) => { ... });
```

Wrap every step of the test case in a `test.step()` with a readable name. One behavior per test; when a test case covers several inputs, split it into `TC-015a`, `TC-015b`, ... rather than looping inside one test.

**Where a spec goes** is fixed by the table in `docs/test-architecture-plan.md` (`tests/<area>/<file>.spec.ts`, grouped by resource or suite). Check it before creating a new file, since several test cases share one spec file.

**Dates come from the account, never the runner.** Use the `accountTimezone` fixture with helpers from `src/utils/dates.ts` (`todayIn`, `tomorrowIn`). A UTC CI runner and an account in another zone disagree for part of every night, which would make TC-003, TC-009 and TC-013 flaky.

**Unclear expected behavior:** call the real API first, assert what it actually does, and list it as an assumption in the PR description. Do not guess a status code.

**Free plan first:** if a feature is not on the free Todoist plan, mark the test `test.fixme(true, '<reason>')` with the reason instead of leaving it failing.

**Strict TypeScript.** `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature` and `strictTypeChecked` lint rules are all on. Index access yields `T | undefined`, `process.env` needs bracket access (`process.env['CI']`), and conditional spreads (`...(cursor !== null && { cursor })`) are the established way to build optional properties.

**Git workflow.** Issue first, then a branch named `<issue id>-<short-description>` (for example `7-tc-003-task-due-date`), then a PR using `.github/pull_request_template.md`. Commit subjects must start with `#<issue id> ` or the `commit-msg` hook rejects them; `npm ci` sets `core.commentChar=;` so Git does not strip that leading `#`. `pre-push` blocks direct pushes to `main`. Never merge a PR yourself: review it, fix the findings, and leave the merge to a human.

## Troubleshooting

`unable to get local issuer certificate` from global setup means a corporate TLS proxy is intercepting the connection and Node does not trust its root, since Node keeps a CA store separate from the OS. It is not a repo or test problem. Point Node at a bundle containing the proxy's root CA:

```sh
NODE_EXTRA_CA_CERTS=/path/to/corp-ca.pem npm test
```

Node reads that variable **at process start**, so setting it from `.env` or in code is too late; it has to be in the environment before the process launches (and exported to GUI apps for IDE run configurations).
