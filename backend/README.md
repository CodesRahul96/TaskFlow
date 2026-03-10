# TaskFlow Backend 🔌
The API and real-time engine for TaskFlow.

## 🛠 Tech
- **Express**: Standard Node server.
- **Mongoose**: MongoDB object modeling.
- **Socket.IO**: For real-time task sync and collaboration.
- **JWT**: Secure authentication.

## 🚀 Setup
1. `npm install`
2. Configure `.env` (copy from `.env.example`).
3. `npm run dev` (runs `nodemon`).

## 🔑 Environment Variables
Make sure you have these set:
- `PORT`: Usually 5000.
- `MONGODB_URI`: Your local or Atlas URI.
- `JWT_SECRET`: Something long and random.
- `CLIENT_URL`: The URL of your frontend (needed for CORS).

## 🚀 Deployment (Render.com)
Since this uses WebSockets, **Hosting it on Render is better than Vercel**. Vercel is serverless and doesn't support persistent socket connections properly.
