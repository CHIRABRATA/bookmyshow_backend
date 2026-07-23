# BookMyShow Backend

A highly scalable, concurrent, and fault-tolerant movie ticket booking backend system. Built with Node.js, Express, PostgreSQL, and Redis, this system solves complex engineering challenges including race conditions during checkout, high-traffic read spikes, and automated abandoned cart recovery.

**Author:** Chirabrata Ghosal

## 🚀 Key Engineering Features

- **Zero-Trust Security:** JWTs stored in HTTP-Only cookies, preventing XSS and session hijacking.
- **Concurrency Shield:** Row-level database locking (`SELECT FOR UPDATE`) guaranteeing absolute zero double-bookings.
- **High-Performance Caching:** Redis implementation for seat matrices, dropping public read latency to single-digit milliseconds.
- **Self-Healing Automation:** Background Node-Cron workers that automatically unlock abandoned shopping carts after 10 minutes.
- **Dynamic Capacity Spawning:** Automated relational database logic that generates custom seat matrices instantly upon showtime creation.

## 🏗️ System Architecture & Low-Level Design (LLD)

### 1. High-Level Flow Diagram
The system separates heavy read operations from critical write operations to prevent database bottlenecks.

```text
Client -> Rate Limiter -> Express API Gateway

Read Path:
Client -> Redis Cache -> Response
Redis Cache -> PostgreSQL -> Cache Refresh

Write Path:
Client -> ACID Transaction Engine -> PostgreSQL
ACID Transaction Engine -> Redis Cache Invalidation

Background Automation:
Node-Cron Worker -> PostgreSQL -> Release Expired Locks
```

### 2. Core Operational Workflows

- **The Seat Spawning Engine:** When an Admin creates a showtime, the backend fetches the theater capacity and generates a relational seat matrix for that show.
- **The Transactional Checkout (ACID):** When a user books a seat, the system calculates the final price on the backend and locks the seat for 10 minutes.
- **The Dashboard Analytics Engine:** An administrative route performs relational aggregations across tables to calculate revenue and occupancy metrics.

## 🛡️ Enterprise Security & Attack Prevention

This API is hardened against common web vulnerabilities and traffic surges:

- **Race Conditions (Double Booking):** PostgreSQL explicit locking protects simultaneous checkout requests.
- **XSS (Cross-Site Scripting):** JWTs are stored exclusively in HTTP-Only cookies.
- **DDoS & Brute Force Attacks:** Global rate limiting shields login and booking routes.
- **Payload Tampering (Price Forgery):** Invoice totals are calculated server-side using database-backed pricing rules.
- **Resource Exhaustion:** Redis shields high-read seat matrix endpoints from overloading PostgreSQL.

## 🗺️ API Endpoint Documentation

### 👤 Authentication & Users

- `POST /api/auth/register`
  - Body: `name`, `email`, `password`, `role`
  - Action: Registers a user and creates a secure profile.
- `POST /api/auth/login`
  - Body: `email`, `password`
  - Action: Validates credentials and issues an HTTP-Only JWT session cookie.

### 🏢 Inventory Management (Admin Only)

- `POST /api/movies`
  - Action: Registers a new film entity.
- `POST /api/theaters`
  - Action: Registers a physical theater room and defines its maximum capacity.
- `POST /api/shows`
  - Body: `movieId`, `theaterId`, `showTime`, `price`
  - Action: Validates collisions, saves the showtime, and spawns the seat matrix.

### 🎟️ Public Discovery (Redis Cached)

- `GET /api/shows/:id/seats`
  - Action: Returns the complete seat layout and current availability statuses.

### 💳 Transaction Engine (Concurrency Shielded)

- `POST /api/bookings`
  - Body: `showId`, `seatIds`
  - Action: Locks seats, calculates the final total, and creates a pending booking.
- `POST /api/bookings/process-payment`
  - Body: `bookingId`, `paymentSuccess`
  - Action: Confirms or cancels the booking and updates seat availability.

### 📈 Business Analytics (Admin Only)

- `GET /api/admin/dashboard`
  - Action: Calculates revenue, booking counts, and occupancy metrics.

## ⚙️ Background Automation (Cron Jobs)

The system includes a self-healing worker using `node-cron`.

- **Schedule:** Runs every 60 seconds.
- **Task:** Scans the database for pending bookings whose locks have expired.
- **Execution:** Releases expired seat locks, marks bookings as failed, and invalidates Redis cache entries.
