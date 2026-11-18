# CaseFlow

An internal case management demo built with React/Vite, Express and PostgreSQL.
The existing interface includes login, case creation, status/priority/assignment
updates, notes, activity history, dashboard summaries, search, filtering, sorting
and pagination. Users and Reports screens are placeholders, not completed features.

## Local development

Use Node.js 24.15 or later in the 24.x series (tested with 24.22.1) and PostgreSQL.

```sh
cd caseflow-backend
npm ci
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the generated random value into `JWT_SECRET` in `.env` and fill in the
`DB_*` connection settings. The backend refuses to start without a secret of at
least 32 characters. Keep `.env` private. Changing the secret invalidates existing
tokens; sign in again after upgrading from the former hard-coded secret.

Create an **empty local database** named `caseflow` using your PostgreSQL tools
(for example `createdb caseflow` with a local role authorised to create databases).
Set `DB_NAME=caseflow` and the other `DB_*` values to match that database and role.
Then, from `caseflow-backend`:

```sh
npm run db:setup
```

This applies the versioned schema in one transaction and records it in
`caseflow_migrations`. Re-running it preserves data. It is intended for a fresh
database: if you already have unversioned CaseFlow tables, use a separate empty
database. The script fails and rolls back on conflicting tables; it does not
convert or replace legacy data.

Optionally create a **fictional local demo account**. In Bash, enter a unique
password privately (12+ characters, at most 72 UTF-8 bytes):

```sh
read -r -s -p "Demo password: " DEMO_PASSWORD
export DEMO_PASSWORD
npm run db:demo-user
unset DEMO_PASSWORD
```

Sign in as `demo@example.test` with the password you entered. The script never
prints or stores a plaintext password and does not reset an existing account.
The login form starts empty; enter those credentials manually. No sample cases or real user data
are inserted. Keep demo provisioning limited to local development.

Start the API:

```sh
npm run dev
```

In a second terminal, from the repository root:

```sh
cd caseflow-frontend
npm ci
npm run dev
```

The frontend defaults to `http://localhost:5001`. To use another API address,
copy `caseflow-frontend/.env.example` to `caseflow-frontend/.env` and set
`VITE_API_URL`. Restart Vite or rebuild after changing it. This value is public
frontend configuration; never put secrets in a `VITE_*` variable. Use the frontend
URL printed by Vite.

## Checks

```sh
cd caseflow-backend
npm test
cd ../caseflow-frontend
npm test
npm run lint
npm run build
```

The default backend tests use a stubbed database. To run the separate PostgreSQL
integration suite, create a **disposable database ending in `_test`**, for example
`createdb caseflow_test`, then run from `caseflow-backend` with connection settings
exported in your shell:

```sh
RUN_DB_TESTS=1 DB_NAME=caseflow_test npm run test:integration
```

Supply `DB_HOST`, `DB_PORT`, `DB_USER` and `DB_PASSWORD` in that shell as needed.
The suite refuses a database name without the `_test` suffix, creates uniquely
named schemas, and removes only those schemas afterwards. It checks repeatable
schema/account setup, login and persisted case/note/activity flows, database
constraints, rollback on legacy table conflicts, validation/404 responses, write rollback on
activity failures, and concurrent update history. Without `RUN_DB_TESTS=1`
the integration test is skipped. It was verified with PostgreSQL 18.6.

Frontend `npm test` runs eight DOM-based interaction tests with mocked API
responses. They cover configured API requests, corrupt-session recovery, HTTP 401
session expiry, retries, case/note saves, activity refresh, list/dashboard updates,
and a delayed rejection from an older session. These tests do not launch a browser
or connect to PostgreSQL. Lint passes without warnings and the production build
passes. A full browser-to-API-to-database clean-setup check remains outstanding.

API errors appear beside the affected content with retries for failed reads.
Failed writes keep form values available for correction. Successful writes refresh
the relevant views. Rejected sessions clear stored login data and return to sign-in
with an explanation. The backend remains the authority on token validity.

## Case API behaviour

Case and note writes require JSON objects. Titles and notes must be nonblank;
status and priority must match the interface options; due dates must be valid
`YYYY-MM-DD` dates; IDs must be positive PostgreSQL integers. `assigned_to` can be
an existing user's ID or `null`/an empty string to clear the assignment.

Invalid requests return JSON errors with HTTP 400, unknown cases return 404,
and oversized bodies return 413. An existing case with no notes returns an empty
list. `PUT /cases/:id` accepts any combination of status, priority and assignment;
omitted fields are preserved. Submitted author IDs are ignored.

Each case creation, note insertion or case update commits together with its
activity records. If activity fails, the whole write rolls back. Concurrent updates
lock the case row so activity uses the actual previous values. Unexpected failures
return a generic 500 response.

## Authentication

`POST /auth/login` accepts email/password and returns an eight-hour HS256 token.
Every `/cases` route (including notes and activity) requires
`Authorization: Bearer <token>`. Case creators, note authors and activity actors
come from verified token claims, not submitted user IDs. There is currently no
role-specific access policy: authenticated users share the case workspace.

This remains a local demo, not a production deployment. See [PROGRESS.md](PROGRESS.md)
for remaining work and validation limits.
