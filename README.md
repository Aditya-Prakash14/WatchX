# WatchX — Real-Time Server Monitoring Platform

A full-stack server monitoring platform that tracks system health metrics in real time and sends proactive alerts to prevent downtime.

![Architecture](https://img.shields.io/badge/Architecture-Node.js_+_React-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **Real-time dashboards** — Live CPU, memory, disk, network, temperature, and load average metrics streamed via WebSocket
- **Multi-server monitoring** — Connect unlimited servers with lightweight agents
- **Proactive alerting** — Configurable rules with threshold, sustained-duration, and severity levels
- **Alert channels** — In-app notifications, email (SMTP), and webhook integrations
- **Historical data** — Time-series charts with configurable retention (default 30 days)
- **Auto-recovery detection** — Alerts auto-resolve when metrics return to normal
- **Offline detection** — Servers marked offline after 60s heartbeat timeout
- **Dark-mode UI** — Polished dashboard built with React, Tailwind CSS, and Recharts

## Architecture

```
┌──────────────┐       WebSocket       ┌──────────────────┐       REST + WS       ┌──────────────┐
│  WatchX      │ ────────────────────> │  WatchX Server   │ <──────────────────── │  Dashboard   │
│  Agent       │   metrics stream      │  (Express + WS)  │   live data + API     │  (React)     │
│  (per host)  │                       │  SQLite storage   │                       │              │
└──────────────┘                       │  Alert Engine     │                       └──────────────┘
                                       └──────────────────┘
                                              │
                                       ┌──────┴──────┐
                                       │  Email /    │
                                       │  Webhook    │
                                       └─────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
npm run install:all
```

### 2. Start Everything (dev mode)

```bash
npm run dev
```

This launches:
- **Server** on `http://localhost:3001` (API + WebSocket)
- **Agent** collecting local metrics
- **Frontend** on `http://localhost:5173` (Vite dev server with proxy)

### Or start individually:

```bash
# Terminal 1: Start the server
npm run dev:server

# Terminal 2: Start the agent
npm run dev:agent

# Terminal 3: Start the frontend
npm run dev:frontend
```

## Configuration

Copy `.env.example` to `.env` and customize:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server HTTP/WS port |
| `DB_PATH` | `./data/watchx.db` | SQLite database path |
| `METRIC_RETENTION_DAYS` | `30` | Auto-prune metrics older than this |
| `SMTP_HOST` | — | SMTP server for email alerts |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` / `SMTP_PASS` | — | SMTP credentials |
| `ALERT_EMAIL_TO` | — | Alert recipient email |
| `WEBHOOK_URL` | — | Alert webhook endpoint (receives JSON POST) |

### Agent Configuration (environment variables)

| Variable | Default | Description |
|----------|---------|-------------|
| `WATCHX_SERVER` | `ws://localhost:3001/ws?role=agent` | Server WebSocket URL |
| `COLLECT_INTERVAL_MS` | `5000` | Metrics collection interval |
| `SERVER_ID` | auto-generated UUID | Unique server identifier |
| `SERVER_NAME` | hostname | Display name |

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard` | Full dashboard summary with latest metrics |
| `GET` | `/api/servers` | List all registered servers |
| `GET` | `/api/servers/:id` | Get server details |
| `DELETE` | `/api/servers/:id` | Remove a server |
| `GET` | `/api/servers/:id/metrics?from=&to=` | Historical metrics (UNIX timestamps) |
| `GET` | `/api/servers/:id/latest` | Latest metric snapshot |
| `GET` | `/api/rules` | List alert rules |
| `POST` | `/api/rules` | Create alert rule |
| `PUT` | `/api/rules/:id` | Update alert rule |
| `DELETE` | `/api/rules/:id` | Delete alert rule |
| `GET` | `/api/alerts?limit=100` | Alert history |
| `GET` | `/api/alerts/active` | Active (unfired) alerts |
| `POST` | `/api/alerts/:id/acknowledge` | Acknowledge an alert |
| `POST` | `/api/alerts/:id/resolve` | Manually resolve an alert |

## WebSocket Protocol

Connect to `ws://localhost:3001/ws?role=dashboard` for live updates.

### Messages received by dashboard:

```json
{ "type": "metric", "serverId": "...", "data": { "cpu_pct": 45.2, ... } }
{ "type": "server:online", "serverId": "..." }
{ "type": "server:offline", "serverId": "..." }
{ "type": "alert:new", "alert": { ... } }
{ "type": "alert:resolved", "alertId": 1, "serverId": "..." }
```

## Default Alert Rules

WatchX ships with these pre-configured rules (editable from the UI):

| Metric | Condition | Severity | Sustained |
|--------|-----------|----------|-----------|
| CPU % | > 90% | Critical | 30s |
| CPU % | > 75% | Warning | 60s |
| Memory % | > 90% | Critical | 10s |
| Memory % | > 80% | Warning | 30s |
| Disk % | > 90% | Critical | Instant |
| Disk % | > 80% | Warning | Instant |

## Tech Stack

- **Backend:** Node.js, Express, ws (WebSocket), better-sqlite3
- **Agent:** Node.js, systeminformation
- **Frontend:** React 18, Vite, Tailwind CSS, Recharts, Lucide Icons
- **Alerting:** Nodemailer (SMTP), Webhooks, In-app (WebSocket)

## Production Deployment

```bash
# Build frontend
npm run build:frontend

# Start server (serves built frontend automatically)
NODE_ENV=production npm start
```

The server serves the built React app from `frontend/dist/` and handles all API/WS connections on a single port.
