# AI Campus Guardian

Enterprise multi-tenant campus safety and operations platform (**v1.0.0**).

## Project overview

AI Campus Guardian provides organization-scoped security operations: authentication and RBAC, campus/map inventory, cameras and video intelligence, incidents and emergencies, field mobile operations, notifications, analytics/executive intelligence, governance, billing, audit, and platform administration.

Steps 1–18 are implemented in this repository. This is not a greenfield rebuild.

## Architecture

See [docs/architecture.md](docs/architecture.md). High-level layers:

- **Foundation** — Auth, organizations, users, roles, permissions
- **Campus** — Campuses, buildings, floors, zones, maps
- **Security** — Cameras, video, detections, alerts, incidents, evidence
- **Emergency** — Emergency workflows, teams, check-ins, tasks, AAR
- **Operations** — Staff, teams, tasks, patrol, inspections, mobile/offline
- **Intelligence** — Copilot, agents, analytics, KPIs, forecasting
- **Governance** — Policies, AI governance, access reviews, audit
- **Business** — Plans, usage, billing, reports
- **Platform** — Health, jobs, backups, deployment

## Installation

```bash
git clone <repo-url>
cd AI_campus_guardian
cp .env.example .env.local
# Edit .env.local with real local values (never commit secrets)
npm install
# Start MongoDB locally, then:
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

All variables are documented as placeholders in [`.env.example`](.env.example).

**Never commit** passwords, API keys, JWT secrets, database passwords, private keys, or cloud credentials.

Production startup (`npm start` via `server.ts`) fails closed if required secrets are missing or still set to `change-me` placeholders.

## Database setup

- MongoDB via `MONGODB_URI`
- Mongoose models under `src/models/`
- Indexes on `organizationId`, status/time compounds where queried heavily
- See [docs/database.md](docs/database.md)

## Development

| Command | Purpose |
|---------|---------|
| `npm run dev` | Custom server + Socket.IO |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |

Do not run `npm run build` while `npm run dev` is running (shared `.next` directory).

## Testing

```bash
npm test
npm run typecheck
```

Security-focused unit tests live in `tests/unit/security-step18.test.ts`.

Full E2E against a live multi-org database must be run in staging (see [FINAL_TEST_REPORT.md](FINAL_TEST_REPORT.md)).

## Production build

```bash
npm run build
npm start
```

Health endpoints:

- `GET /health` → liveness (`/api/health/live`)
- `GET /ready` → readiness (`/api/health/ready`)
- `GET /api/health` → basic API + DB connectivity (no secret paths)

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) and [docs/deployment.md](docs/deployment.md).

## Documentation index

| Doc | Audience |
|-----|----------|
| [ADMIN_GUIDE.md](ADMIN_GUIDE.md) | Organization admins |
| [SUPER_ADMIN_GUIDE.md](SUPER_ADMIN_GUIDE.md) | Platform operators |
| [STAFF_GUIDE.md](STAFF_GUIDE.md) | Field / operations staff |
| [SECURITY.md](SECURITY.md) | Security controls |
| [RUNBOOK.md](RUNBOOK.md) | On-call operations |
| [docs/api.md](docs/api.md) | API reference |
| [RELEASE_NOTES.md](RELEASE_NOTES.md) | v1.0.0 notes |
| [FINAL_TEST_REPORT.md](FINAL_TEST_REPORT.md) | Test evidence |
| [SECURITY_AUDIT.md](SECURITY_AUDIT.md) | Security findings |
| [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) | Launch checklist |
