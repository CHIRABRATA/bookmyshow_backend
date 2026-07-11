const express = require("express");
const authRouter = require("./routes/auth.routes"); // Import the new router

const app = express();

// Global Middlewares
app.use(express.json());

// Base Health Check Route
app.get("/", (req, res) => {
  res.send("API is running cleanly 🚀");
});

// Mount the Auth Router
app.use("/api/auth", authRouter);

module.exports = app;