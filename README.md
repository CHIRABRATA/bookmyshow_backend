<div align="center">

# 🎬 BookMyShow Backend

### A highly scalable, concurrent, and fault-tolerant movie ticket booking engine

*Solving double-bookings, high-traffic read spikes, and abandoned cart recovery — at scale.*

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)

**Author:** Chirabrata Ghosal

</div>

---

## 📖 Table of Contents

- [Why This Project Exists](#-why-this-project-exists)
- [Key Engineering Features](#-key-engineering-features)
- [System Architecture](#️-system-architecture)
- [Core Workflows](#-core-operational-workflows)
- [Database Schema (ERD)](#-database-schema-erd)
- [Security & Attack Prevention](#️-enterprise-security--attack-prevention)
- [API Documentation](#-api-endpoint-documentation)
- [Background Automation](#️-background-automation-cron-jobs)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)

---

## 💡 Why This Project Exists

Ticket booking systems look simple until two users try to book **seat A4** in the same second. This backend is a deep-dive into the concurrency, caching, and fault-tolerance problems that make real-world booking platforms (BookMyShow, Ticketmaster, IRCTC) hard to build correctly.

---

## 🚀 Key Engineering Features

| Feature | What It Solves |
|---|---|
| 🔒 **Concurrency Shield** | `SELECT FOR UPDATE` row-level locking → guarantees **zero double-bookings** |
| ⚡ **High-Performance Caching** | Redis-backed seat matrices → single-digit ms read latency |
| 🛡️ **Zero-Trust Security** | JWTs in HTTP-Only cookies → immune to XSS token theft |
| 🤖 **Self-Healing Automation** | `node-cron` worker auto-releases abandoned carts after 10 min |
| 🎭 **Dynamic Capacity Spawning** | Auto-generates seat matrices instantly on showtime creation |

---

## 🏗️ System Architecture

The system splits **heavy reads** from **critical writes** to keep PostgreSQL from becoming a bottleneck under traffic spikes.

```mermaid
flowchart TB
    Client(["👤 Client"])
    RL["🚦 Rate Limiter"]
    Gateway["🌐 Express API Gateway"]

    Client --> RL --> Gateway

    subgraph READ["📖 Read Path — Public Discovery"]
        direction LR
        Cache[("⚡ Redis Cache")]
        DB1[("🐘 PostgreSQL")]
        Cache -- "cache hit" --> Resp1(["Response"])
        Cache -- "cache miss" --> DB1
        DB1 -- "refresh cache" --> Cache
    end

    subgraph WRITE["✍️ Write Path — Transactional Checkout"]
        direction LR
        Txn["🔐 ACID Transaction Engine"]
        DB2[("🐘 PostgreSQL")]
        Txn --> DB2
        Txn -- "invalidate" --> Cache2[("⚡ Redis Cache")]
    end

    subgraph AUTO["🤖 Background Automation"]
        direction LR
        Cron["⏱️ Node-Cron Worker"]
        DB3[("🐘 PostgreSQL")]
        Cron -- "scan expired locks" --> DB3
        DB3 -- "release + invalidate" --> Cache3[("⚡ Redis Cache")]
    end

    Gateway --> READ
    Gateway --> WRITE
    Cron -.->|"runs every 60s"| WRITE

    style Client fill:#6366f1,color:#fff
    style Gateway fill:#0f172a,color:#fff
    style Cache fill:#dc2626,color:#fff
    style Cache2 fill:#dc2626,color:#fff
    style Cache3 fill:#dc2626,color:#fff
    style DB1 fill:#4169e1,color:#fff
    style DB2 fill:#4169e1,color:#fff
    style DB3 fill:#4169e1,color:#fff
    style Cron fill:#f59e0b,color:#000
```

---

## ⚙️ Core Operational Workflows

### 1. 🎭 The Seat Spawning Engine

```mermaid
sequenceDiagram
    actor Admin
    participant API as Express API
    participant DB as PostgreSQL

    Admin->>API: POST /api/shows { movieId, theaterId, showTime, price }
    API->>DB: Check theater capacity + showtime collisions
    DB-->>API: Capacity + collision status
    alt No collision
        API->>DB: Insert show record
        API->>DB: Bulk-generate seat matrix (rows × columns)
        DB-->>API: Seat matrix created
        API-->>Admin: 201 Created — Show live
    else Collision detected
        API-->>Admin: 409 Conflict
    end
```

### 2. 💳 The Transactional Checkout (ACID + Concurrency Shield)

This is the core engineering challenge: preventing two users from booking the same seat simultaneously.

```mermaid
sequenceDiagram
    actor UserA as User A
    actor UserB as User B
    participant API as Express API
    participant DB as PostgreSQL (Row Lock)
    participant Redis as Redis Cache

    par Simultaneous Requests
        UserA->>API: POST /api/bookings { showId, seatIds: [A4] }
    and
        UserB->>API: POST /api/bookings { showId, seatIds: [A4] }
    end

    API->>DB: BEGIN TRANSACTION
    API->>DB: SELECT * FROM seats WHERE id=A4 FOR UPDATE
    Note over DB: 🔒 Row locked — User B's request queues here
    DB-->>API: Seat A4 (locked, status=available)
    API->>DB: Calculate final price server-side
    API->>DB: UPDATE seat SET status='locked', lock_expiry=+10min
    API->>DB: COMMIT
    DB-->>API: Success
    API->>Redis: Invalidate seat matrix cache
    API-->>UserA: 200 OK — Seat locked, proceed to payment

    Note over DB: Lock released — User B's query now executes
    DB-->>API: Seat A4 (status=locked)
    API-->>UserB: 409 Conflict — Seat no longer available
```

### 3. 📈 The Dashboard Analytics Engine

```mermaid
flowchart LR
    Admin(["👤 Admin"]) --> Req["GET /api/admin/dashboard"]
    Req --> Agg["🧮 Relational Aggregation Engine"]
    Agg --> Rev["💰 Revenue Totals"]
    Agg --> Occ["🎟️ Occupancy %"]
    Agg --> Cnt["📊 Booking Counts"]
    Rev --> Resp(["JSON Response"])
    Occ --> Resp
    Cnt --> Resp

    style Admin fill:#6366f1,color:#fff
    style Agg fill:#0f172a,color:#fff
    style Resp fill:#059669,color:#fff
```

---

## 🗃️ Database Schema (ERD)

```mermaid
erDiagram
    USERS ||--o{ BOOKINGS : places
    THEATERS ||--o{ SHOWS : hosts
    MOVIES ||--o{ SHOWS : screens
    SHOWS ||--o{ SEATS : contains
    SEATS ||--o{ BOOKING_SEATS : "reserved in"
    BOOKINGS ||--o{ BOOKING_SEATS : includes

    USERS {
        uuid id PK
        string name
        string email
        string password_hash
        string role
    }
    MOVIES {
        uuid id PK
        string title
        string genre
        int duration_mins
    }
    THEATERS {
        uuid id PK
        string name
        int total_capacity
    }
    SHOWS {
        uuid id PK
        uuid movie_id FK
        uuid theater_id FK
        timestamp show_time
        decimal price
    }
    SEATS {
        uuid id PK
        uuid show_id FK
        string seat_label
        string status
        timestamp lock_expiry
    }
    BOOKINGS {
        uuid id PK
        uuid user_id FK
        decimal total_amount
        string payment_status
        timestamp created_at
    }
    BOOKING_SEATS {
        uuid booking_id FK
        uuid seat_id FK
    }
```

---

## 🛡️ Enterprise Security & Attack Prevention

```mermaid
flowchart TD
    A["🎯 Attack Vector"] --> B{"Threat Type"}
    B -->|"Double Booking"| C["🔒 PostgreSQL SELECT FOR UPDATE"]
    B -->|"XSS / Token Theft"| D["🍪 HTTP-Only JWT Cookies"]
    B -->|"DDoS / Brute Force"| E["🚦 Global Rate Limiting"]
    B -->|"Price Forgery"| F["🧮 Server-Side Price Calculation"]
    B -->|"Read-Path Overload"| G["⚡ Redis Caching Layer"]

    C --> H(["✅ Zero Race Conditions"])
    D --> I(["✅ No Session Hijacking"])
    E --> J(["✅ Login & Booking Routes Shielded"])
    F --> K(["✅ Tamper-Proof Invoices"])
    G --> L(["✅ PostgreSQL Protected from Overload"])

    style A fill:#dc2626,color:#fff
    style H fill:#059669,color:#fff
    style I fill:#059669,color:#fff
    style J fill:#059669,color:#fff
    style K fill:#059669,color:#fff
    style L fill:#059669,color:#fff
```

| Threat | Mitigation |
|---|---|
| **Race Conditions (Double Booking)** | PostgreSQL explicit row-level locking on simultaneous checkout requests |
| **XSS (Cross-Site Scripting)** | JWTs stored exclusively in HTTP-Only cookies |
| **DDoS & Brute Force** | Global rate limiting on login and booking routes |
| **Payload Tampering (Price Forgery)** | Invoice totals calculated server-side from DB-backed pricing rules |
| **Resource Exhaustion** | Redis shields high-read seat matrix endpoints from PostgreSQL overload |

---

## 🗺️ API Endpoint Documentation

### 👤 Authentication & Users

| Method | Endpoint | Body | Action |
|---|---|---|---|
| `POST` | `/api/auth/register` | `name`, `email`, `password`, `role` | Registers a user and creates a secure profile |
| `POST` | `/api/auth/login` | `email`, `password` | Validates credentials and issues an HTTP-Only JWT cookie |

### 🏢 Inventory Management (Admin Only)

| Method | Endpoint | Body | Action |
|---|---|---|---|
| `POST` | `/api/movies` | — | Registers a new film entity |
| `POST` | `/api/theaters` | — | Registers a physical theater and defines max capacity |
| `POST` | `/api/shows` | `movieId`, `theaterId`, `showTime`, `price` | Validates collisions, saves showtime, spawns seat matrix |

### 🎟️ Public Discovery (Redis Cached)

| Method | Endpoint | Action |
|---|---|---|
| `GET` | `/api/shows/:id/seats` | Returns complete seat layout and availability statuses |

### 💳 Transaction Engine (Concurrency Shielded)

| Method | Endpoint | Body | Action |
|---|---|---|---|
| `POST` | `/api/bookings` | `showId`, `seatIds` | Locks seats, calculates total, creates pending booking |
| `POST` | `/api/bookings/process-payment` | `bookingId`, `paymentSuccess` | Confirms/cancels booking, updates seat availability |

### 📈 Business Analytics (Admin Only)

| Method | Endpoint | Action |
|---|---|---|
| `GET` | `/api/admin/dashboard` | Calculates revenue, booking counts, occupancy metrics |

---

## ⏱️ Background Automation (Cron Jobs)

A self-healing worker built with `node-cron` prevents seats from staying locked forever when a user abandons checkout.

```mermaid
flowchart LR
    Timer(["⏱️ Every 60s"]) --> Scan["🔍 Scan for expired locks"]
    Scan --> Found{"Expired bookings found?"}
    Found -->|"Yes"| Release["🔓 Release seat locks"]
    Found -->|"No"| Idle(["😴 Sleep till next tick"])
    Release --> Fail["❌ Mark booking as failed"]
    Fail --> Invalidate["♻️ Invalidate Redis cache"]
    Invalidate --> Idle

    style Timer fill:#f59e0b,color:#000
    style Release fill:#dc2626,color:#fff
    style Invalidate fill:#4169e1,color:#fff
```

| Property | Detail |
|---|---|
| **Schedule** | Runs every 60 seconds |
| **Task** | Scans DB for pending bookings whose locks have expired |
| **Execution** | Releases expired seat locks → marks booking as failed → invalidates Redis cache |

---

## 🧰 Tech Stack

```mermaid
mindmap
  root((BookMyShow<br/>Backend))
    Runtime
      Node.js
      Express.js
    Data Layer
      PostgreSQL
      SELECT FOR UPDATE locking
    Caching
      Redis
      Seat matrix caching
      Cache invalidation
    Security
      JWT
      HTTP-Only Cookies
      Rate Limiting
    Automation
      node-cron
      Abandoned cart recovery
```

---

## 🏁 Getting Started

```bash
# Clone the repository
git clone <your-repo-url>
cd bookmyshow-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in DATABASE_URL, REDIS_URL, JWT_SECRET, PORT

# Run database migrations
npm run migrate

# Start the server
npm run dev
```

### Required Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret key for signing JWTs |
| `PORT` | Server port (default: `5000`) |

---

<div align="center">

Built with a focus on **concurrency correctness** and **real-world booking-system engineering**.

**Chirabrata Ghosal**

</div>
