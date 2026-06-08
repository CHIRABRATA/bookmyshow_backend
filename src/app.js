const express = require("express");

const app = express();

// Middleware
app.use(express.json());

// Base Route
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

// Export using CommonJS
module.exports = app;