require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const server = http.createServer(app);

// Trust proxy for rate limiting (Render/Vercel)
app.set("trust proxy", 1);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

/**
 * HTTP Middleware
 */
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(mongoSanitize());
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

/**
 * Traffic Control & Security
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: { message: "Too many requests, please try again later." },
});
app.use("/api/", globalLimiter);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);

/**
 * Interface Exposure
 */
app.set("io", io);

/**
 * API Routes
 */
app.use("/api/auth", require("./routes/auth"));
app.use("/api/tasks", require("./routes/tasks"));
app.use("/api/timeblocks", require("./routes/timeblocks"));
app.use("/api/comments", require("./routes/comments"));
app.use("/api/audit", require("./routes/audit"));
app.use("/api/users", require("./routes/users"));
app.use("/api/notifications", require("./routes/notifications"));

/**
 * System Routes
 */
app.get("/api/health", (_, res) =>
  res.json({ status: "ok", env: process.env.NODE_ENV }),
);

app.use((_, res) => res.status(404).json({ message: "Route not found" }));

app.use(errorHandler);

/**
 * Real-time Communication (Socket.IO)
 */
io.on("connection", (socket) => {
  socket.on("join-room", (userId) => socket.join(userId));
  socket.on("join-task", (taskId) => socket.join(`task:${taskId}`));
  socket.on("leave-task", (taskId) => socket.leave(`task:${taskId}`));
  socket.on("disconnect", () => {});
});

/**
 * Initialization
 * Skips startup when running in serverless environments (Render/Netlify).
 */
if (process.env.VERCEL !== "1" && process.env.NETLIFY !== "true") {
  connectDB().then(() => {
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () =>
      console.log(`[SYS] Server established on port ${PORT} (${process.env.NODE_ENV})`),
    );
  });
}

// Export app for serverless adapters
module.exports = app;
