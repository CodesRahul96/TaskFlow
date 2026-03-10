# TaskFlow Frontend 🎨
The client-side of TaskFlow. Built with React and meant to be fast and pretty.

## 🛠 Tech
- **React + Vite**: For the build tool.
- **Tailwind CSS**: For all the styling.
- **Zustand**: No more Redux boilerplate. Simple state management.
- **Socket.IO Client**: Handles real-time updates when tasks change.
- **@dnd-kit**: Powerful drag and drop for the task list.

## 🚀 Setup
1. `npm install`
2. Create or check `.env`.
3. `npm run dev`

## 🌍 Important: VITE_API_URL
In production, you **must** set the `VITE_API_URL` environment variable to your backend URL (e.g., `https://your-backend.onrender.com`). If you leave it empty, it will try to talk to `/api` on the same domain.

## 📱 PWA
This app is a Progressive Web App. You can install it on your phone or desktop by clicking the install icon in the URL bar. It also caches assets for offline use.
