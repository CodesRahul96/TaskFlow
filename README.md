# TaskFlow 💎
A clean, full-stack task manager that actually helps you schedule your day. It combines a standard task list with a **time-blocking calendar** so you can stop guessing when you'll get stuff done.

---

## 🛠 What's inside?
- **Frontend**: React + Vite (super fast), Tailwind for the vibes, Zustand for state.
- **Backend**: Node.js + Express + MongoDB.
- **Real-time**: Socket.IO for sync across tabs.
- **Offline**: It's a PWA, so it works even when your internet doesn't.

---

## 🚀 Quick Start (Local)

### 1. The Backend
```bash
cd backend
npm install
npm run dev # Runs on port 5000
```

### 2. The Frontend
```bash
cd frontend
npm install
npm run dev # Runs on port 5173
```
Now just open `http://localhost:5173`.

---

## ✨ Features that actually work
- **Task + Time Blocking**: Create a task, then drag a block onto the calendar to "lock in" your focus.
- **Guest Mode**: You can use the app without an account. It saves to your browser.
- **Auto-Sync**: If you finally decide to sign up, all your guest tasks move to your account automatically.
- **Audit Log**: Every single change is logged so you know when you moved that "Urgent" task to next week. 😉
- **Subtasks & Progress**: Break big tasks down and see the progress bar fill up.

---

## ☁️ Deployment Notes
- **Hosting**: I recommend **Render** for the backend (because Netlify doesn't like WebSockets) and **Vercel/Netlify** for the frontend.
- **Environment Vars**: Just set `VITE_API_URL` on the frontend to point to your backend link. See the `frontend/README.md` for more info.

---

## 🏗 Project Layout
- `/frontend`: The UI and all the calendar logic.
- `/backend`: API, DB schemas, and socket events.
- `/Project Screenshots`: If you want to see what it looks like before running.

*Built for productivity.* 🚀
