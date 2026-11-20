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
- [x] Configure the frontend API URL; handle corrupt/expired sessions, API errors/retries and case/note/activity refresh; resolve hook warnings.
- [x] Verify dashboard, search/filter/sort/pagination and the full workflow in a real browser with PostgreSQL.
- [x] Validate clean setup and full workflow; update documentation. Screenshots were optional and not needed for the unchanged design.

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


## 18 November 2026 — frontend sessions and refresh

Added one configurable API client (`VITE_API_URL`, defaulting to localhost:5001),
consistent JSON/network errors, array-response validation and authenticated request
headers. Corrupt/incomplete storage returns to sign-in; API 401 clears the session
and case data with an explanation. Delayed 401 responses from old tokens cannot
clear a newer session. Login fields no longer contain presumed default credentials.

Writes show progress, success/error feedback and preserve unsaved fields on
failure. Saved case changes update the parent list and dashboard; notes and case
changes refresh activity. Notes/activity reads support retry and cancel stale
requests when unmounted. Sidebar navigation exits case details predictably, and
pagination clamps to available pages when refreshed results shrink. Added accessible
names/label associations for touched controls. Existing layout and CSS preserved.

Validation: eight Vitest/Testing Library DOM interaction tests pass with mocked
API responses; frontend lint passes with zero warnings and production build passes.
Browser-runner execution was attempted but local Chromium launch is restricted by
the environment; the browser download also failed. The verified test suite uses
jsdom rather than claiming browser coverage. No backend or database changes in
this increment. No AGENTS.md or open PRs found on current inspection.

Next: clean real browser/API/PostgreSQL workflow, dashboard and filter/sort/pagination
checks, review remaining rough edges and final documentation. Do not mark the
project complete or stop the task until that validation is done.


## 20 November 2026 — scoped completion

Added regression coverage for dashboard totals, case-insensitive search, combined
status/priority filters, priority/status sorting, empty search results, page controls
and clamping after the final filtered result on a page is closed. Added a reusable,
explicitly opted-in browser verification runner using a disposable `_test` database
and installed Chromium. It builds into a temporary directory, starts local servers,
creates a fresh schema and fictional account, runs real browser/API/database flows,
and cleans up the servers, build and schema. No user data or other repositories
were touched. Existing UI and product scope are unchanged.

Final validation passed:
- Clean `npm ci` in backend and frontend.
- 11 backend default tests (database suite skipped in the default command).
- 12 PostgreSQL integration checks plus their parent test against PostgreSQL 18.6.
- 10 DOM interaction tests.
- Frontend lint with zero warnings and production build.
- Real headless Chromium against the built app, actual Express API and PostgreSQL:
  login, case creation, status/priority changes, note and activity persistence,
  dashboard totals, reload persistence, search/combined filters/sort/pagination,
  invalid-session rejection and sign-in recovery. No mocked browser API requests
  or browser runtime errors. The previous browser-launch blocker was resolved by
  using a compatible headless Chromium build.

No open PRs or AGENTS.md were found; the repository was current before changes.
The agreed existing local-demo scope is complete. Users/Reports modules, production
hosting, production security operations and new features were not part of this
completion scope. No further recurring changes are needed; stop the Caseflow task
rather than invent additional work.
