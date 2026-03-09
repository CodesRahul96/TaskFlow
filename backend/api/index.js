/**
 * Vercel Serverless Function entry point.
 *
 * Vercel calls this file as a serverless handler. We import the Express app
 * from server.js (which skips server.listen when VERCEL=1) and run a lazy
 * one-time connectDB() so the MongoDB connection is reused across warm
 * invocations.
 *
 * NOTE: Socket.IO real-time events are NOT supported on serverless — all REST
 * API routes work normally.
 */

process.env.VERCEL = "1"; // suppress server.listen in server.js

const app = require("../server");
const connectDB = require("../config/db");

let isConnected = false;

module.exports = async (req, res) => {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
  return app(req, res);
};
