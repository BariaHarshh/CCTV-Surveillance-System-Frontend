# AI Campus Guardian — Project Architecture & Implementation Summary

**Version:** v1.1.0  
**Last updated:** 2026-09-28

This document provides a comprehensive technical overview of the AI Campus Guardian Web Application architecture, database configuration, live AI video pipeline, authentication system, and Security Command Center UI.

---

## 1. System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS WEB APPLICATION                             │
│                                                                             │
│  ┌──────────────────────────┐         ┌───────────────────────────────────┐ │
│  │  Security Command Center │         │  Internal Detection API           │ │
│  │  /admin/monitoring       │         │  POST /api/internal/detection     │ │
│  │  /admin/monitoring/live  │         └──────────────┬────────────────────┘ │
│  └──────────────┬───────────┘                        │                      │
│                 │                                    ▼                      │
│  ┌──────────────▼───────────┐         ┌───────────────────────────────────┐ │
│  │  Socket.IO Realtime      │         │  Detection & Event Engine         │ │
│  │  detection:created       │◄────────│  Rule Engine / Severity Calc      │ │
│  │  camera:status           │         │  MongoDB Atlas persistence        │ │
│  └──────────────────────────┘         └───────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                │                                       │
                ▼                                       ▼
┌───────────────────────────┐     ┌─────────────────────────────────────────┐
│  MongoDB Atlas Cloud DB   │     │  Python ML Backend (FastAPI :8000)      │
│  ai-campus-guardian       │     │  - YOLOv8 Object Detection (4 cameras)  │
│  Mongoose ORM layer       │     │  - ByteTrack Multi-Object Tracking      │
└───────────────────────────┘     │  - MJPEG Stream Server                  │
                                  │  - Frame pacing ~25 FPS, jitter <3.5ms  │
                                  └─────────────────────────────────────────┘
```

---

## 2. Shared MongoDB Atlas Cloud Database Integration

### Configuration
- Application connects to MongoDB Atlas using **Mongoose** (no MongoClient refactoring).
- Connection string loaded from `process.env.MONGODB_URI` in `.env.local`:
  ```env
  MONGODB_URI=mongodb+srv://<user>:<password>@ai-campus-guardian.i494qhq.mongodb.net/ai-campus-guardian?retryWrites=true&w=majority&appName=AI-Campus-Guardian
  ```
- **Fail-closed**: Missing `MONGODB_URI` produces:
  `MONGODB_URI is not configured. Please create .env.local with a valid MongoDB Atlas connection string.`
- **Safe logging** (no credential leakage):
  ```
  [DB] Connecting to MongoDB Atlas...
  [DB] MongoDB connection established
  ```

---

## 3. Live AI Multi-Camera Monitoring Pipeline

### Video Streaming
- **MJPEG Proxy**: `GET /api/monitoring/cameras/:id/stream` → temporary session → `/api/monitoring/streams/:sessionId`.
- **Credential protection**: Backend stream URLs never exposed to browser.
- **4 concurrent camera streams** at ~25 FPS with frame pacing in the Python pipeline.
- **Auto-reconnect**: `CameraStreamView` handles transient stream resets with 0 React remounts.
- **DetectionOverlay SVG** renders AI bounding boxes independently of the video frame path.

### Real-Time Metadata via Socket.IO
- Python ML dispatches normalized JSON to `POST /api/internal/detection`.
- Next.js evaluates `rule-engine.ts`, saves to MongoDB Atlas, emits `detection:created`.
- `MonitoringClient` receives events and updates without any polling:
  - AI module status (`NOMINAL`, `CROWD DETECTED`, `BREACH ALERT`, `FALL DETECTED`, etc.)
  - Risk level / score per camera
  - Active alerts panel
  - Recent AI events timeline

### Performance (verified)
| Metric | Value |
|--------|-------|
| Camera streams | 4 / 4 |
| Frame rate | ~25 FPS per camera |
| Frame jitter | < 3.5 ms |
| Stream restarts | 0 |
| React remounts | 0 |
| Socket reconnects | 0 |

---

## 4. Security Command Center UI (`MonitoringClient.tsx`)

The dashboard at `/admin/monitoring` was redesigned into a professional security operations center. All changes are JSX/Tailwind styling only — no logic, data, or stream code was modified.

### Polished Panels

#### System / AI Health Status Pills
Four compact pill badges below the page title:
- **SYSTEM ONLINE** — always green
- **AI ENGINE ONLINE** — always green
- **N/T CAMERAS ONLINE** — green (all online) / amber (any offline)
- **REAL-TIME CONNECTED / RECONNECTING / DISCONNECTED** — green / amber / red based on actual socket state

#### Risk Distribution Panel
- Horizontal bar rows for CRITICAL / HIGH / MEDIUM / LOW
- Bar width = `(count / total) × 100%` — no hardcoded values
- Colors: red / orange / amber / emerald

#### Active Alerts Panel
- Header: **ACTIVE ALERTS** + `{N} ACTIVE` badge (red when active, emerald when clear)
- Each alert row: colored left-edge severity bar + severity badge + title + camera chip + status + timestamp

#### Recent AI Events Panel
- Header: **RECENT AI EVENTS** + **REAL-TIME** accent badge
- Each event row: severity bar + dot + event type + `SeverityBadge` + camera chip + right-aligned timestamp

#### Live Camera Network Header
- **LIVE CAMERA NETWORK** heading + `{N} ONLINE` pill (emerald) + `{N} OFFLINE` pill (amber, shown only when > 0) + `{total} total` badge

#### Camera Card Metadata Hierarchy
```
[Camera icon] CAM-000003                    [● ONLINE]
Server Room
MAIN BUILDING · ROOM 101

──────────────────────────────────────────
AI STATUS
[RESTRICTED_ZONE module]       [NOMINAL status]
Restricted zone monitoring

──────────────────────────────────────────
[Shield] RISK                    [LOW · 3]

[⚠ ALERT ACTIVE]               [🕐 11:02:21 PM]
```

---

## 5. Authentication & RBAC

- **Session**: HTTP-only cookies (`acg_session`), JWT, Bcrypt hashing.
- **Roles**: `SUPER_ADMIN` · `ADMIN` · `STAFF`
- **Initial seeding**: `initializeSuperAdmin()` in `src/lib/auth/init-super-admin.ts`

---

## 6. Summary of Key Files

| File | Role |
| :--- | :--- |
| `src/components/monitoring/MonitoringClient.tsx` | Security Command Center — full dashboard UI (StatusBanner, RiskDistributionBar, ActiveAlertsPanel, EventTimelinePanel, CameraCard) |
| `src/components/monitoring/CameraStreamView.tsx` | Camera MJPEG stream viewer with DetectionOverlay |
| `src/components/monitoring/shared.tsx` | Shared components: `SeverityBadge`, `RealtimeIndicator`, `CameraStatusDot`, `formatTime`, `formatEventType` |
| `src/hooks/useMonitoringSocket.ts` | Socket.IO connection hook — real-time camera/alert/event state |
| `src/lib/monitoring/command-center-utils.ts` | `calculateOverallRisk`, `calculateActiveAlertsCount`, `deduplicateEvents`, `getAIFeatureLabel` |
| `src/lib/monitoring/ai-metadata-parser.ts` | `parseAIDataFromPayload`, `getDefaultAIData` |
| `src/lib/db/connect.ts` | Mongoose Atlas connector with safe logging |
| `src/app/api/monitoring/cameras/[id]/stream/route.ts` | Stream session API |
| `src/app/api/monitoring/streams/[sessionId]/route.ts` | MJPEG proxy route |
| `src/app/api/internal/detection/route.ts` | Internal ML detection ingest |
| `docs/MONGODB_ATLAS_SETUP.md` | MongoDB Atlas credentials & IP whitelist setup |
