const express = require("express");
const authRouter = require("./routes/auth.routes"); // Import the new router
const { limiter, authLimiter } = require("./rateLimiter"); // Import the rate limiters
const cookies = require("cookie-parser"); // Import cookie-parser for handling cookies
const showRouter = require("./routes/show.routes"); // Import the show router

const app = express();
// use cookie-parser middleware to parse cookies in incoming requests
app.use(cookies());

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
app.use("/api/shows", showRouter); // Mount the show router

module.exports = app;