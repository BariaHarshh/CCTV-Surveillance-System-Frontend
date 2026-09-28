# Release Notes — AI Campus Guardian

---

## v1.1.0 — Security Command Center UI Polish (2026-09-28)

### Summary
Full visual redesign of the monitoring dashboard (`MonitoringClient.tsx`) into a professional AI Security Command Center. All changes are JSX/Tailwind styling only — zero logic, state, data, socket, or stream code was modified.

### UI improvements

#### System / AI Health Status (header)
- Four system-state pill badges below the page title replacing plain dot + text indicators.
- **CAMERAS ONLINE** pill turns amber when any camera is offline.
- **REAL-TIME** indicator gains three states: green (connected), amber (reconnecting), red (disconnected).

#### Risk Distribution Panel
- Changed from vertical column bars to **horizontal bar rows** — more scannable at dashboard density.
- Bar widths remain data-derived (`count / total × 100%`); no hardcoded values.

#### Active Alerts Panel
- Section header upgraded to **ACTIVE ALERTS** (uppercase) with a dynamic `{N} ACTIVE` pill badge.
- Each alert row now uses a **colored left-edge severity bar** (4px) and a two-row content layout: title + severity badge (row 1), camera chip + status + timestamp (row 2).

#### Recent AI Events Panel
- Header upgraded to **RECENT AI EVENTS** with an accent **REAL-TIME** indicator.
- Events adopt the same left-edge severity bar + dot + event type as primary text, camera chip as secondary, timestamp right-aligned.

#### Live Camera Network header
- **LIVE CAMERA NETWORK** heading with separate **{N} ONLINE** (emerald) and **{N} OFFLINE** (amber) pills.

#### Camera Cards
- Clear five-section metadata hierarchy: IDENTITY → AI STATUS → RISK → ALERT/TIMESTAMP.
- Each section separated by a thin border-t divider and micro-label.
- Camera name promoted to `font-extrabold`; location in monospace dimmed text.
- ONLINE/OFFLINE status pill contains an inline status dot.
- ALERT ACTIVE indicator has a border; clock icon prefixes the last-update timestamp.

### Test results
| Check | Result |
|-------|--------|
| TypeScript (`tsc --noEmit`) | ✅ 0 errors |
| Vitest | ✅ 82 / 82 passed (12 files) |
| Files changed | 1 (`MonitoringClient.tsx`) |
| Logic/data changes | None |
| Stream/socket changes | None |

---

## v1.0.0 — Initial Production Release (2026-08-25)

### Major features

- Multi-tenant foundation: auth, orgs, RBAC, admin/staff
- Campus map, cameras, monitoring alerts/events
- Incident & emergency response workflows
- Video intelligence (detections, review, evidence, privacy, wall)
- Mobile / field operations with offline sync foundations
- AI intelligence layer (copilot tools, governance hooks)
- Enterprise BI / executive KPIs and governance views
- Platform billing, audit, health/ready endpoints

### Security (Step 18)

- Payment webhooks **fail closed** without HMAC secret
- Evidence download tokens stored as hashes and **single-use**
- Stream proxy sessions bound to caller organization (IDOR fix)
- Internal event ingest hardened (no open non-prod bypass when key set)
- Audit logs gain `organizationId` + immutability hooks
- Production env validation expanded; security headers + `/health` `/ready` rewrites
- Rate-limit client IP no longer trusts spoofable `X-Forwarded-For` unless `TRUST_PROXY=true`

### Performance

- Compound indexes added for common org+status/time queries
- Pagination required on large list endpoints

### Bug fixes

- Map export GET no longer returns false `{ ok: true }` success
- Mobile notification PATCH returns 400/404 instead of silent success
- Health error messages no longer reference env file paths

### Known limitations

- Push delivery requires configured `PUSH_PROVIDER` (otherwise SKIPPED)
- Live video depends on reachable camera HTTP streams — demo mode is labeled
- Forecasts/KPIs show insufficient data when history is thin
- Auth rate limits are process-local (multi-instance needs Redis)
- Full browser matrix / device lab E2E not automated in CI
- Dependency advisories: Next transitive postcss/sharp; `xlsx` (no upstream fix) — see SECURITY_AUDIT.md
- Restore drill must be executed on customer infrastructure before claiming backup validity

### Honesty statement

v1.0.0 does **not** claim 100% security, zero bugs, guaranteed emergency delivery, or guaranteed uptime.
