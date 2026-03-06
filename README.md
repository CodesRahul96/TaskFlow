# TaskFlow — Integrated Task & Time Manager

A production-ready full-stack web application combining task management with
calendar-based time-block scheduling.

## Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React 18, Vite, Tailwind CSS, Zustand, @dnd-kit, react-hot-toast, lucide-react |
| Backend   | Node.js, Express 4, MongoDB (Mongoose), JWT, Socket.IO |
| PWA       | vite-plugin-pwa (service worker, offline support) |

---

## Prerequisites

- **Node.js** ≥ 18
- **MongoDB Community Server** running locally on `mongodb://localhost:27017`

---

## Quick Start

### 1 — Backend
```bash
cd backend
npm install
# .env is pre-configured for local development
npm run dev        # http://localhost:5000
```

### 2 — Frontend (new terminal)
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## Features

### ✅ Essential (fully implemented)
- Task CRUD — title, description, deadline, priority, tags, colour, status
- Subtasks — add, edit, complete, delete with progress tracking
- Time blocks — schedule work sessions per task with overlap validation
- Calendar view — custom week + month view (built from scratch, no heavy libs)
- Authentication — JWT email/password login & register
- Audit trail — full activity log with timestamps per user
- MongoDB — all data stored locally via Mongoose with indexes

### ✅ Recommended (fully implemented)
- Guest mode — create tasks without logging in (localStorage)
- Guest sync — tasks automatically sync to your account on login
- Task assignment — assign collaborators, search by name/email
- Comments — per-task threaded comments with edit/delete
- Drag-and-drop — reorder tasks via @dnd-kit
- PWA — installable on desktop & Android, works offline

### 🔌 Optional (infrastructure ready)
- Real-time updates via Socket.IO (wired end-to-end)
- Cloud deployment — set `MONGODB_URI` + `CLIENT_URL` env vars

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login |
| GET  | /api/auth/me | Current user |
| PUT  | /api/auth/profile | Update name/avatar |
| PUT  | /api/auth/password | Change password |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /api/tasks | List (filterable: status, priority, tag, search, sort) |
| POST   | /api/tasks | Create |
| GET    | /api/tasks/:id | Get one |
| PUT    | /api/tasks/:id | Update |
| DELETE | /api/tasks/:id | Delete |
| POST   | /api/tasks/sync-guest | Sync localStorage tasks |

### Subtasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | /api/tasks/:id/subtasks | Add |
| PUT    | /api/tasks/:id/subtasks/:subId | Update/complete |
| DELETE | /api/tasks/:id/subtasks/:subId | Delete |

### Time Blocks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | /api/tasks/:id/timeblocks | Add (overlap validation) |
| PUT    | /api/tasks/:id/timeblocks/:blockId | Update |
| DELETE | /api/tasks/:id/timeblocks/:blockId | Delete |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /api/comments/:taskId | List |
| POST   | /api/comments/:taskId | Add |
| PUT    | /api/comments/:commentId | Edit |
| DELETE | /api/comments/:commentId | Delete |

### Audit
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/audit/user/me | My audit log |
| GET | /api/audit/:taskId | Task activity |

---

## Project Structure

```
taskflow/
├── backend/
│   ├── config/          # MongoDB connection
│   ├── controllers/     # Business logic
│   ├── middleware/       # JWT auth, validation, error handler
│   ├── models/          # Mongoose schemas (User, Task, Comment, AuditLog)
│   ├── routes/          # Express routers
│   ├── utils/           # audit logger, token generator
│   └── server.js        # Entry point
└── frontend/
    └── src/
        ├── api/          # Axios client
        ├── components/   # Layout, TaskModal, TaskDetail
        ├── hooks/        # useSocket
        ├── pages/        # Dashboard, Tasks, Calendar, Audit, Profile, Login, Register
        ├── store/        # Zustand: authStore, taskStore
        └── App.jsx
```
