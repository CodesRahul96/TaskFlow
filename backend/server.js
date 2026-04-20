/**
 * taskflow | Core Server Entry Point
 * 
 * Architected as an event-driven, secure collaborative node.
 * Implements a "Shield-in-Depth" middleware pipeline for industrial-grade protection.
 */

const path = require("path");
require("dotenv").config({ path: [path.join(__dirname, '.env'), '.env'] });

const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const hpp = require("hpp");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const server = http.createServer(app);

/**
 * PROXY CONFIGURATION
 * Critical for accurate IP-based rate limiting in cloud/container environments.
 */
app.set("trust proxy", 1);

/**
 * SOCKET ORCHESTRATION (Multi-Node Sync Engine)
 */
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

/**
 * SHIELD LAYER: Header Hardening & Data Sanitization
 */
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'", 
          "'unsafe-inline'", 
          "https://www.google.com/recaptcha/", 
          "https://www.gstatic.com/recaptcha/"
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://*"],
        connectSrc: ["'self'", "https://*", "ws:", "wss:"],
        frameSrc: ["'self'", "https://www.google.com/recaptcha/"],
        objectSrc: ["'none'"]
      },
    },
  })
);

// Mitigate NoSQL Injection vectors
app.use(mongoSanitize());

// Mitigate HTTP Parameter Pollution (HPP)
app.use(hpp());

app.use(cookieParser());
app.use(express.json({ limit: "2mb" })); 

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

/**
 * TRAFFIC CONTROL: Anti-DDoS & Resource Protection
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 200, 
  message: { message: "Operational limit reached. Please reduce request frequency." },
});
app.use("/api/", globalLimiter);

// Auth Guard: Brute-force mitigation
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, 
  message: { message: "Security Block: Too many identity verification attempts." },
});
app.use("/api/auth", authLimiter);

// Neural Guard: AI resource preservation
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100, 
  message: { message: "Neural Limit Reached: Gateway recalibrating. Please wait." },
});
app.use("/api/ai", aiLimiter);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);

/**
 * INTERFACE EXPOSURE: Expose IO engine to controllers
 */
app.set("io", io);

/**
 * ROUTE ORCHESTRATION
 */
app.use("/api/auth", require("./routes/auth"));
app.use("/api/tasks", require("./routes/tasks"));
app.use("/api/timeblocks", require("./routes/timeblocks"));
app.use("/api/comments", require("./routes/comments"));
app.use("/api/audit", require("./routes/audit"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/users", require("./routes/users"));
app.use("/api/notifications", require("./routes/notifications"));

/**
 * HEALTH MONITORING
 */
app.get("/api/health", (_, res) =>
  res.json({ status: "ok", env: process.env.NODE_ENV, security: "active" }),
);

// Terminal node for unhandled routes
app.use((_, res) => res.status(404).json({ message: "Network node not found." }));

// Global Exception Handler
app.use(errorHandler);

/**
 * SOCKET HANDLERS: Room Logic
 */
io.on("connection", (socket) => {
  socket.on("join-room", (userId) => socket.join(userId));
  socket.on("join-task", (taskId) => socket.join(`task:${taskId}`));
  socket.on("leave-task", (taskId) => socket.leave(`task:${taskId}`));
});

/**
 * BOOTSTRAP: Data Connectivity & Listener
 */
if (process.env.VERCEL !== "1" && process.env.NETLIFY !== "true") {
  connectDB().then(() => {
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () =>
      console.log(`[SYS] Identity taskflow nodes verified. Shiled Active on port ${PORT}`),
    );
  });
}

module.exports = app;
