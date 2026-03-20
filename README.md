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
cp .env.example .env  # 👈 Don't forget to set your SMTP & MongoDB vars!
npm run dev           # Runs on port 5000
```

### 2. The Frontend
```bash
cd frontend
npm install
# Ensure .env has VITE_API_URL=http://localhost:5000
npm run dev           # Runs on port 5173
```
Now just open `http://localhost:5173`.

---

## ✨ Features that actually work
- **Task + Time Blocking**: Create a task, then drag a block onto the calendar to "lock in" your focus.
- **Email Verification**: New accounts require email verification for extra security.
- **Magic Link Login**: Passwordless, secure login via email (no more forgetting passwords!).
- **Guest Mode**: You can use the app without an account. It saves to your browser.

---

## ☁️ Deployment Notes
- **Hosting**: I recommend **Render** for the backend (because Netlify doesn't like WebSockets) and **Vercel/Netlify** for the frontend.
- **Environment Vars**: Just set `VITE_API_URL` on the frontend to point to your backend link. See the `frontend/README.md` for more info.

---

## 🏗 Project Layout
- `/frontend`: The UI and all the calendar logic.
- `/backend`: API, DB schemas, and socket events.
- `/Project Screenshots`: If you want to see what it looks like before running.

---

## 📝 Technical Implementation Logs

### Email Authentication Flow (March 2026)
1. **Registration**: User registers -> Backend generates a 32-char hex `verificationToken` -> User is saved as `isVerified: false`.
2. **Email Verification**: `sendEmail` utility sends a link to `FRONTEND_URL/verify-email?token=...`.
3. **Verification Page**: Frontend catches the token -> Calls Backend `/api/auth/verify-email` -> User set to `isVerified: true`.
4. **Login**: User enters email/pass -> Backend generates `loginToken` (10 min expiry) -> Sends Magic Link to email.
5. **Magic Link Verification**: User clicks link -> Frontend catches `loginToken` -> Calls Backend `/api/auth/verify-login` -> JWT generated and user logged in.

*Built for productivity.* 🚀
