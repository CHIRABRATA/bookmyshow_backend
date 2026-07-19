const express = require("express");
const authRouter = require("./routes/auth.routes"); // Import the new router
const { limiter, authLimiter } = require("./rateLimiter"); // Import the rate limiters

const app = express();

// Global Middlewares
app.use(express.json());
//use rate limiter for all requests
app.use(limiter);

// Base Health Check Route
app.get("/", (req, res) => {
  res.send("API is running cleanly 🚀");
});

// Mount the Auth Router
app.use("/api/auth", authRouter);

//add movie routes
app.use("/api/movies", require("./routes/movie.routes"));

module.exports = app;