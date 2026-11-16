# Completion checklist

Scope: finish the existing case-management demo while preserving its UI. No AI,
redesign, new Users/Reports modules or changes to other repositories.

- [x] Inspect source, recent commits and open PRs; no AGENTS.md or open PRs found on 8 November 2026.
- [x] Replace hard-coded JWT secret with required environment configuration.
- [x] Protect all case, note and activity routes; derive authorship from the signed-in user.
- [x] Supply backend environment example, ignore private environment variants/build artefacts, and add authentication regression tests.
- [x] Add reproducible PostgreSQL schema/setup and explicit fictional-user provisioning.
- [x] Verify successful case creation, notes and changes against PostgreSQL.
- [x] Add request validation, missing-case responses and transactional activity writes.
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


## 14 November 2026 — reproducible database setup

Added a transaction-based, version-recorded initial migration for users, cases,
notes and activity, with foreign keys, allowed status/priority values, timestamps
and per-case history indexes. Setup is repeatable and serialized with a transaction
advisory lock. It targets a fresh database; conflicting legacy tables fail and
roll back without replacing legacy data. Added an explicit fictional demo-user
command requiring a supplied password; reruns leave the account unchanged.

Validation: all 10 existing backend tests pass. A separate opt-in PostgreSQL
integration suite passes (7 subtests plus the parent test) against temporary local
PostgreSQL 18.6. It covers repeatable schema setup, password validation/account
preservation, CLI setup commands, actual login, case creation/list/update, note author joins, all five
activity types, database constraints and atomic failure on conflicting tables.
Test schemas are isolated and cleaned up; no external database was used. The
normal test command skips this integration suite unless explicitly opted in.
README now documents clean setup, provisioning and test commands.

Next: request validation, 404 responses and transactional case/note/activity
writes; then frontend session/errors/refresh and clean browser workflow checks.
The UI was not changed in this increment. The earlier PostgreSQL-unavailable note
above describes the first session only; real database validation is now available.


## 16 November 2026 — validated, atomic case writes

Case/note inputs now validate before writes, including object shape, nonblank
text, enum values, calendar dates and positive integer IDs. Invalid inputs return
JSON 400 responses, missing cases return 404, and malformed/oversized JSON returns
400/413. Optional descriptions default to empty text. Partial case updates preserve
omitted fields; assignments accept existing IDs or null/empty string to clear.

Case creation, note insertion and changes now use a single PostgreSQL transaction
with their activity records. Updates lock the case row before reading previous
values, preventing concurrent changes from recording stale transitions. Notes lock
the parent against deletion during insertion. History reads have deterministic
ordering for tied timestamps.

Validation: 11 default backend tests pass (database suite explicitly skipped), and
12 PostgreSQL integration subtests plus their parent pass against a temporary
PostgreSQL 18.6 database. New tests cover invalid inputs with no side effects,
invalid/missing IDs, empty existing history, partial updates, unknown assignees,
forced activity failures rolling back cases/notes/updates (including earlier
activity in the same update), and concurrent status-history consistency.
No UI, schema or dependency changes in this increment. No open PRs or AGENTS.md
were present on inspection; no other repositories were modified.

Next: frontend configuration, session expiry, errors and data refresh, then clean
browser workflow validation. The project is still in progress.
