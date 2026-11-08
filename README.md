# CaseFlow

An internal case management demo built with React/Vite, Express and PostgreSQL.
The existing interface includes login, case creation, status/priority/assignment
updates, notes, activity history, dashboard summaries, search, filtering, sorting
and pagination. Users and Reports screens are placeholders, not completed features.

## Local development

Use Node.js 22.12+ (or a supported newer version) and PostgreSQL.

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

**Database setup is not yet reproducible:** this repository currently has no
schema/migration or user provisioning script. An existing database with `users`,
`cases`, `case_notes` and `case_activity` is required. Do not assume the prefilled
login credentials correspond to an account in your database. Providing a clean
schema and fictional-data setup is the next completion milestone.

Once that database is available, start the API from `caseflow-backend`:

```sh
npm run dev
```

In a second terminal, from the repository root:

```sh
cd caseflow-frontend
npm ci
npm run dev
```

The frontend currently targets `http://localhost:5001`. Keep the API's `PORT=5001`
for this setup. Use the frontend URL printed by Vite.

## Checks

```sh
cd caseflow-backend
npm test
cd ../caseflow-frontend
npm run lint
npm run build
```

Backend tests exercise actual HTTP routes with a stubbed database; they do not
validate PostgreSQL schema or persistence. Frontend lint currently passes with
two existing hook dependency warnings in NotesPanel and ActivityTimeline.

## Authentication

`POST /auth/login` accepts email/password and returns an eight-hour HS256 token.
Every `/cases` route (including notes and activity) requires
`Authorization: Bearer <token>`. Case creators, note authors and activity actors
come from verified token claims, not submitted user IDs. There is currently no
role-specific access policy: authenticated users share the case workspace.

This remains a local demo, not a production deployment. See [PROGRESS.md](PROGRESS.md)
for remaining work and validation limits.
