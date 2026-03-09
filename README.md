# TaskFlow — Integrated Task & Time Manager

A production-ready full-stack web application combining task management with
calendar-based time-block scheduling.

## Tech Stack

| Layer    | Technology                                                                     |
| -------- | ------------------------------------------------------------------------------ |
| Frontend | React 18, Vite, Tailwind CSS, Zustand, @dnd-kit, react-hot-toast, lucide-react |
| Backend  | Node.js, Express 4, MongoDB (Mongoose), JWT, Socket.IO                         |
| PWA      | vite-plugin-pwa (service worker, offline support)                              |

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

## Deploying to the Cloud

> **Recommended split:** backend on a persistent server (Render/Railway) for full Socket.IO support; frontend on Vercel or Netlify.  
> You _can_ deploy the backend to Vercel Serverless (REST-only — real-time events won't work).

### Backend — Render or Railway (recommended, full Socket.IO)

1. Create a new **Web Service** and point it at the `backend/` directory.
2. Build command: _(none — `package.json` has `npm start`)_  
   Start command: `npm start`
3. Set environment variables:

| Variable      | Value                                                  |
| ------------- | ------------------------------------------------------ |
| `MONGODB_URI` | Your MongoDB Atlas connection string                   |
| `JWT_SECRET`  | A long random secret                                   |
| `JWT_EXPIRE`  | `7d`                                                   |
| `CLIENT_URL`  | Your frontend URL (e.g. `https://taskflow.vercel.app`) |
| `NODE_ENV`    | `production`                                           |

### Backend — Vercel Serverless (REST-only, no Socket.IO)

```bash
cd backend
npx vercel --prod
# Set the same env vars above in the Vercel dashboard
```

The `backend/vercel.json` and `backend/api/index.js` are already configured.

---

### Frontend — Vercel

1. Import the repo at [vercel.com](https://vercel.com).
2. Set **Root Directory** → `frontend`.
3. Framework preset: **Vite** (auto-detected).
4. Set environment variable:

| Variable       | Value                                                        |
| -------------- | ------------------------------------------------------------ |
| `VITE_API_URL` | Your backend URL, e.g. `https://taskflow-api.up.railway.app` |

> Leave `VITE_API_URL` **empty** if you deploy the backend as a _separate_ Vercel project and use a custom rewrite — or set it to the backend's Vercel URL.

### Frontend — Netlify

1. Import the repo at [netlify.com](https://app.netlify.com).
2. Set **Base directory** → `frontend`.
3. Build command and publish directory are read from `frontend/netlify.toml` automatically.
4. Add environment variable `VITE_API_URL` = your backend URL.

`frontend/netlify.toml` and `frontend/public/_redirects` are already configured for SPA routing.

---

## API Reference

### Auth

| Method | Endpoint           | Description        |
| ------ | ------------------ | ------------------ |
| POST   | /api/auth/register | Register           |
| POST   | /api/auth/login    | Login              |
| GET    | /api/auth/me       | Current user       |
| PUT    | /api/auth/profile  | Update name/avatar |
| PUT    | /api/auth/password | Change password    |

### Tasks

| Method | Endpoint              | Description                                            |
| ------ | --------------------- | ------------------------------------------------------ |
| GET    | /api/tasks            | List (filterable: status, priority, tag, search, sort) |
| POST   | /api/tasks            | Create                                                 |
| GET    | /api/tasks/:id        | Get one                                                |
| PUT    | /api/tasks/:id        | Update                                                 |
| DELETE | /api/tasks/:id        | Delete                                                 |
| POST   | /api/tasks/sync-guest | Sync localStorage tasks                                |

### Subtasks

| Method | Endpoint                       | Description     |
| ------ | ------------------------------ | --------------- |
| POST   | /api/tasks/:id/subtasks        | Add             |
| PUT    | /api/tasks/:id/subtasks/:subId | Update/complete |
| DELETE | /api/tasks/:id/subtasks/:subId | Delete          |

### Time Blocks

| Method | Endpoint                           | Description              |
| ------ | ---------------------------------- | ------------------------ |
| POST   | /api/tasks/:id/timeblocks          | Add (overlap validation) |
| PUT    | /api/tasks/:id/timeblocks/:blockId | Update                   |
| DELETE | /api/tasks/:id/timeblocks/:blockId | Delete                   |

### Comments

| Method | Endpoint                 | Description |
| ------ | ------------------------ | ----------- |
| GET    | /api/comments/:taskId    | List        |
| POST   | /api/comments/:taskId    | Add         |
| PUT    | /api/comments/:commentId | Edit        |
| DELETE | /api/comments/:commentId | Delete      |

### Audit

| Method | Endpoint           | Description   |
| ------ | ------------------ | ------------- |
| GET    | /api/audit/user/me | My audit log  |
| GET    | /api/audit/:taskId | Task activity |

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
