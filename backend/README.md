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
- `EMAIL_HOST`: Your SMTP server (e.g., smtp.gmail.com).
- `EMAIL_PORT`: SMTP port (usually 587 or 465).
- `EMAIL_USER`: Your email address.
- `EMAIL_PASSWORD`: Your email app password.
- `EMAIL_FROM`: The display email (e.g., noreply@taskflow.dev).

## 🔏 Authentication Flow

The app uses a secure 2-step verification process:

1.  **Register**: Creates a user with `isVerified: false` and sends a verification email.
2.  **Verify**: User must click the link in their email to activate the account.
3.  **Login**: Once verified, the user logs in with email/pass. To prevent unauthorized access, a **Magic Link** is sent to their email.
4.  **Confirm Login**: User clicks the Magic Link to receive their JWT and access the dashboard.

## 🚀 Deployment (Render.com)

Since this uses WebSockets, **Hosting it on Render is better than Vercel**. Vercel is serverless and doesn't support persistent socket connections properly.

---

**Maintained by [CodesRahul96](https://github.com/CodesRahul96)**
