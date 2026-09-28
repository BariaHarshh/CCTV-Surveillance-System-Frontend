# AI Campus Guardian Web Application

Enterprise multi-tenant campus safety and AI operations platform (**v1.1.0**).

> **Latest:** Security Command Center UI polish pass complete — all 82 tests passing, 0 TypeScript errors.

---

## Technical Stack & Architecture

- **Frontend**: Next.js 15 (App Router, React 19, Tailwind CSS, Framer Motion, Lucide Icons)
- **Database**: MongoDB Atlas (Cloud Database) via **Mongoose**
- **Real-Time Communication**: Socket.IO server & client with organization isolation channels
- **Authentication**: Custom HTTP-only session cookies, JWT, salted Bcrypt password hashing, and RBAC (`SUPER_ADMIN`, `ADMIN`, `STAFF`)
- **AI & ML Integration**: Python FastAPI Backend + YOLOv8 + ByteTrack Multi-Camera Detection Pipeline

---

## Key Features

### 1. AI Security Command Center (`/admin/monitoring`)

A fully real-time, multi-camera security operations dashboard.

**Header & System Health**
- Page header: **AI CAMPUS GUARDIAN — SECURITY COMMAND CENTER** with subtitle.
- Four live system-status pill badges: **SYSTEM ONLINE · AI ENGINE ONLINE · N/T CAMERAS ONLINE · REAL-TIME CONNECTED/RECONNECTING/DISCONNECTED** — each dynamically colored (green / amber / red) based on actual socket state.

**Risk Distribution Panel**
- Compact horizontal bar chart showing live CRITICAL / HIGH / MEDIUM / LOW camera risk counts.
- Bar widths derived directly from live AI data — no hardcoded values.

**Active Alerts Panel**
- **ACTIVE ALERTS** header with dynamic `{N} ACTIVE` badge (red when active, green when clear).
- Each alert row: left severity-bar (red/orange/amber/green) + event title + camera chip + status badge + right-aligned timestamp.
- Click any alert to scroll and expand the corresponding camera card.

**Recent AI Events Panel**
- **RECENT AI EVENTS** header with **REAL-TIME** indicator (accent-tinted).
- Timeline rows: left severity-bar + severity dot + event type (primary) + camera name (secondary) + timestamp (right-aligned top).
- Up to 12 most-recent events displayed.

**Live Camera Network**
- **LIVE CAMERA NETWORK** section heading with **{N} ONLINE** (green) and **{N} OFFLINE** (amber) pills + total count badge.
- 4-camera grid (`sm:grid-cols-2 xl:grid-cols-4`) loading streams lazily on card expand.

**Camera Cards**
- Each card header reads in a clear hierarchy: **IDENTITY** (camera icon + ID + ONLINE/OFFLINE pill) → camera name (`font-extrabold`) → location (monospace, dimmed) → **AI STATUS** micro-label + module pill + status badge → AI feature description → **RISK** micro-label + risk level/score badge → **ALERT ACTIVE** indicator + clock timestamp.
- Border color and optional ring driven by live risk level (CRITICAL / HIGH / MEDIUM / LOW).
- Video stream area (`CameraStreamView`) is fully independent and unaffected by metadata styling.

### 2. Live AI Video Pipeline

- **4-camera MJPEG stream** proxied securely via `/api/monitoring/cameras/:id/stream`.
- **DetectionOverlay SVG** renders AI bounding boxes and labels independent of the video frame pipeline.
- **Frame pacing** in the Python backend delivers ~25 FPS with jitter < 3.5 ms.
- **0 stream restarts / 0 React remounts** during normal operation.

### 3. Shared MongoDB Atlas Cloud Database Integration

- Connects via `MONGODB_URI` in `.env.local` using Mongoose.
- Fail-closed when `MONGODB_URI` is missing — no localhost fallback.
- Safe logging: `[DB] Connecting to MongoDB Atlas...` / `[DB] MongoDB connection established`.
- `.env.local` is git-ignored.

### 4. Authentication & Role-Based Access Control (RBAC)

- HTTP-only session cookies (`acg_session`), JWT, Bcrypt password hashing.
- Roles: `SUPER_ADMIN` (platform-wide) · `ADMIN` (organization) · `STAFF` (field operations).
- Initial Super Admin auto-seeded via `initializeSuperAdmin()` on first startup.

---

## Quickstart Guide

### Prerequisites

1. Node.js v18 or higher
2. MongoDB Atlas project access with your IP whitelisted
3. Python 3.10+ (for the ML backend)

### Step 1 — Configure & Start the Next.js Web App

```bash
git clone https://github.com/meetk8048/AI_Campus_Guardian_Web_app.git
cd AI_Campus_Guardian_Web_app
npm install
cp .env.example .env.local
# Edit .env.local — set MONGODB_URI and other secrets
npm run dev
```

App runs at `http://localhost:3000`.

### Step 2 — Start the Python ML Backend

```bash
cd C:\Workshop\AI-Campus-Guard
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

FastAPI ML backend runs at `http://localhost:8000`.

### Step 3 — Start the AI Detection Pipeline

```bash
cd C:\Workshop\AI-Campus-Guard
python app/run_crowd_detection.py
```

Runs YOLOv8 + ByteTrack across 4 cameras and dispatches detection events to `http://localhost:3000/api/internal/detection`.

Or use the unified launcher:

```bash
python start_system.py
```

### Step 4 — Access the Security Command Center

1. Open `http://localhost:3000/login`
2. Log in:  
   - **Email**: `superadmin@aicampusguardian.com`  
   - **Password**: `ChangeMe123!` *(or the value in `.env.local`)*
3. Navigate to `http://localhost:3000/admin/monitoring`
4. Live feed: `http://localhost:3000/admin/monitoring/live`

---

## Development & Test Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Custom Next.js server + Socket.IO server |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm test` | Vitest unit test suite (82 tests) |
| `npm run lint` | ESLint static analysis |
| `npm run build` | Production build |

---

## Current Test Status

| Check | Result |
| :--- | :--- |
| TypeScript (`tsc --noEmit`) | ✅ 0 errors |
| Vitest unit tests | ✅ 82 / 82 passed (12 test files) |
| Camera streams | ✅ 4 / 4 online, ~25 FPS |
| Stream restarts | ✅ 0 |
| React remounts | ✅ 0 |
| Socket.IO stability | ✅ Persistent connection |

---

## Monitoring Routes

| Route | Role | Description |
| :--- | :--- | :--- |
| `/admin/monitoring` | Admin | Full Security Command Center dashboard |
| `/admin/monitoring/live` | Admin | 4-camera live grid with AI overlays |
| `/dashboard/monitoring` | Admin/Staff | Role-aware monitoring redirect |
| `/staff/monitoring/live` | Staff | Staff live monitoring view |

---

## Documentation Index

| Document | Audience / Purpose |
| :--- | :--- |
| [docs/PROJECT_SUMMARY.md](docs/PROJECT_SUMMARY.md) | Technical architecture & implementation summary |
| [docs/RELEASE_NOTES.md](docs/RELEASE_NOTES.md) | Release notes (v1.0.0 → v1.1.0) |
| [docs/FINAL_TEST_REPORT.md](docs/FINAL_TEST_REPORT.md) | Test suite evidence |
| [docs/MONGODB_ATLAS_SETUP.md](docs/MONGODB_ATLAS_SETUP.md) | MongoDB Atlas connection & security setup |
| [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) | Organization Administrators operations guide |
| [docs/SUPER_ADMIN_GUIDE.md](docs/SUPER_ADMIN_GUIDE.md) | Platform Super Admins operations guide |
| [docs/STAFF_GUIDE.md](docs/STAFF_GUIDE.md) | Field / Operations Staff guide |
| [SECURITY.md](SECURITY.md) & [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md) | Security controls & audit findings |
| [DEPLOYMENT.md](DEPLOYMENT.md) & [docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md) | Deployment guide & launch checklist |
| [docs/RUNBOOK.md](docs/RUNBOOK.md) | On-call operations runbook |
