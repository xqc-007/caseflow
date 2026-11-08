# Completion checklist

Scope: finish the existing case-management demo while preserving its UI. No AI,
redesign, new Users/Reports modules or changes to other repositories.

- [x] Inspect source, recent commits and open PRs; no AGENTS.md or open PRs found on 8 November 2026.
- [x] Replace hard-coded JWT secret with required environment configuration.
- [x] Protect all case, note and activity routes; derive authorship from the signed-in user.
- [x] Supply backend environment example, ignore private environment variants/build artefacts, and add authentication regression tests.
- [ ] Add reproducible PostgreSQL schema/setup and explicit fictional-user provisioning.
- [ ] Verify case creation, notes and changes against PostgreSQL; add request validation, missing-case responses and transactional activity writes.
- [ ] Verify frontend login/session expiry, errors, case refresh, notes/activity refresh, dashboard, search/filter/sort/pagination. Remove hard-coded API URLs and resolve hook warnings without changing the design.
- [ ] Validate clean setup and full workflow, update documentation and capture screenshots if useful.

## 8 November 2026 — authentication increment

Ten backend HTTP/configuration tests pass: startup secret validation, malformed
login, invalid credentials, safe successful login, route protection, invalid and
expired tokens, valid reads, and spoof-resistant case/note/change authorship.
Database calls are stubbed in these tests. `npm ci` succeeded in both packages.
Frontend lint exits successfully with two existing hook warnings; production build
passes. No PostgreSQL server/client is installed in the current workspace, and the
repository has no schema, so real persistence and browser end-to-end flows remain
unverified. Configuration changes intentionally invalidate old login tokens.

Next: create and test the schema and fictional-user setup from actual route SQL,
then harden persistence/validation. Do not mark the project complete until clean
setup and the existing workflows are verified. Users and Reports remain documented
placeholders rather than expanding this project's scope.
