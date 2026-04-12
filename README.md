# TaskFlow 💎
A sophisticated, full-stack productivity ecosystem designed to bridge the gap between task management and time-blocking orchestration. 

---

## 🚀 Getting Started

If you want to run this locally, follow these steps. You'll need Node.js and MongoDB installed.

### 1. Backend Prep
Head into the `backend` folder and grab the dependencies. 
```bash
cd backend
npm install
```
Copy `.env.example` to a new `.env` file and fill in your MongoDB URI and SMTP settings (for magic links). Then fire it up:
```bash
npm run dev # Runs on http://localhost:5000
```

### 2. Frontend Prep
In a new terminal, hop into the `frontend` folder:
```bash
cd frontend
npm install
```
Same deal here—copy `.env.example` to `.env`. For local dev, you can leave `VITE_API_URL` blank (the proxy handles it). Just make sure to add your Google ReCaptcha Site Key.
```bash
npm run dev # Runs on http://localhost:5173 
```

---

## 🏗 System Architecture

The platform architecture is built for high-performance delivery and real-time synchronization:

- **Frontend Engine**: React 18+ leveraging **Vite** for optimized build cycles and **Zustand** for predictable atomic state management.
- **Backend Service**: A robust **Node.js/Express** microservice architecture integrated with **MongoDB** (Atlas) for persistent storage.
- **Communication Layer**: **Socket.IO** integration for asynchronous, low-latency data synchronization across multi-device sessions.
- **Platform Integrity**: **helmet**, **express-mongo-sanitize**, and **express-rate-limit** provide a hardened security perimeter.

---

## 🛡 Security & Identity Management

Integrated enterprise-grade security protocols:

- **Passwordless Authentication**: Zero-friction login via Magic Links, eliminating common credential attack vectors.
- **Multilayered Verification**: Automated request validation powered by **Google reCAPTCHA v3** (Invisible).
- **Identity Assurance**: Mandatory email verification loops and Multi-Factor Authentication (MFA) support using TOTP.
- **Audit Logging**: Comprehensive system-level logging for critical lifecycle events.

---

## ✨ Integrated Features

- **Standardized Orchestration**: Seamless transition from task creation to calendar scheduling via time-blocking heuristics.
- **Real-Time Synergy**: Collective task editing and live-status updates across all active connections.
- **PWA Capabilities**: Resilient offline functionality ensured through service-worker persistence.
- **Context-Aware UI**: A custom Design System using a dedicated RGB variable architecture for perfect theme-aware transparency.

---

## 🚀 Deployment & Scaling

- **Backend Logic**: Optimized for deployment on **Render** (supporting full WebSocket logic).
- **Edge Deployment**: Frontend build ready for **Vercel** or **Netlify** edge nodes.
- **Environment Configuration**: Configurable via `VITE_API_URL` for seamless environment parity between development and staging.

*Engineered for performance and clarity.* 🚀

---

## 👨‍💻 Developer

**CodesRahul96**
- GitHub: [@CodesRahul96](https://github.com/CodesRahul96)
- Project: TaskFlow v2
