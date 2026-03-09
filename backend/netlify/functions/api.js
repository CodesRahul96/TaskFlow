/**
 * Netlify Function serverless entry point.
 * Wraps the Express app using serverless-http so it can run on AWS Lambda.
 */

process.env.NETLIFY = "true"; // Tell server.js NOT to run server.listen

const serverless = require("serverless-http");
const app = require("../../server");
const connectDB = require("../../config/db");

let isConnected = false;
const handler = serverless(app);

module.exports.handler = async (event, context) => {
  // Lazily connect to MongoDB to reuse connection across warm invocations
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
  return handler(event, context);
};
