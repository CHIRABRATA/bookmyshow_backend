const express = require("express");
const authRouter = require("./routes/auth.routes"); // Import the new router
const { limiter, authLimiter } = require("./rateLimiter"); // Import the rate limiters
const cookies = require("cookie-parser"); // Import cookie-parser for handling cookies
const showRouter = require("./routes/show.routes"); // Import the show router
const bookingRouter = require("./routes/booking.routes"); // Import the booking router
const adminRouter = require('./routes/admin.routes');

const app = express();

// Parse cookies before any route that needs them
app.use(cookies());

// Global Middlewares
app.use(express.json());

// Mount the booking router
app.use("/api/bookings", bookingRouter);
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
app.use("/api/admin", adminRouter); // Mount the admin router
module.exports = app;