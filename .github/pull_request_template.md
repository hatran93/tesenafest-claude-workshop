<!-- Title: #<issue id> <summary>, for example "#12 Add tasks API client" -->

Closes #

## Summary

<!-- What changed and why, in a few bullets. -->

## Test cases

<!-- IDs and suites added or changed, for example "TC-012 (@regression)". Write "None" if no tests changed. -->

## Assumptions

<!-- Expected behavior the spec does not settle: what the API actually did and what the test asserts.
     Features marked test.fixme() because they are premium only. Write "None" if there are none. -->

## Checklist

- [ ] Linked issue, branch named `<issue id>-<short-description>`, commits start with `#<issue id>`
- [ ] `npm run lint`, `npm run format:check` and `npm run typecheck` pass
- [ ] New or changed tests pass locally and in CI
- [ ] Every test creates its own `autotest-` data and cleans it up (no leftovers after the run)
- [ ] Response bodies are validated with `toMatchSchema`
- [ ] Date assertions use the account timezone, not the runner's clock
- [ ] No token, `Authorization` header or unredacted trace in code, logs or this description
- [ ] Code review findings are fixed or explained
