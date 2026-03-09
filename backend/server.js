require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

// Expose io to routes
app.set("io", io);

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/tasks", require("./routes/tasks"));
app.use("/api/timeblocks", require("./routes/timeblocks"));
app.use("/api/comments", require("./routes/comments"));
app.use("/api/audit", require("./routes/audit"));
app.use("/api/users", require("./routes/users"));

// Health check
app.get("/api/health", (_, res) =>
  res.json({ status: "ok", env: process.env.NODE_ENV }),
);

// 404
app.use((_, res) => res.status(404).json({ message: "Route not found" }));

// Error handler
app.use(errorHandler);

// Socket
io.on("connection", (socket) => {
  socket.on("join-room", (userId) => socket.join(userId));
  socket.on("join-task", (taskId) => socket.join(`task:${taskId}`));
  socket.on("leave-task", (taskId) => socket.leave(`task:${taskId}`));
  socket.on("disconnect", () => {});
});

// DB + Start — skipped when running as a Serverless Function (Vercel/Netlify)
if (process.env.VERCEL !== "1" && process.env.NETLIFY !== "true") {
  connectDB().then(() => {
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () =>
      console.log(`Server running on port ${PORT} [${process.env.NODE_ENV}]`),
    );
  });
}

// Export app for serverless adapters
module.exports = app;
