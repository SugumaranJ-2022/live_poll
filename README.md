# ⚡ LivePoll — Real-Time Live Polling & Data Analytics Platform

A high-performance, responsive, real-time web application built for the **HCL GUVI Full Stack Development Intern Assignment**. 

LivePoll allows creators to launch interactive live polls, share instant links or generated QR codes, and monitor audience responses live in real-time **without page refreshes** via **Server-Sent Events (SSE)** and **Redis Pub/Sub**.

---

## 🔑 Demo Account Credentials

For quick evaluation and testing of pre-populated data:

| Field | Credential Details |
| :--- | :--- |
| **Email** | `sugumaran@gmail.com` |
| **Password** | `Sara@2022` |
| **Full Name** | `Sugumaran J` |
| **Seeded Data** | **10 Active Polls** with **1,480+ total votes cast** |

---

## 🌟 Key Features & Implementation Highlights

### ⚡ 1. Real-Time Engine (Zero-Latency Voting)
* **Redis Pub/Sub & SSE Streaming**: Votes cast on any browser client are saved atomically to MongoDB, published to Redis Pub/Sub (`poll:<id>:updates`), and instantly broadcast to all open browser windows via SSE (`GET /api/polls/:id/stream`).
* **Active Viewer Presence Counter**: Tracks live connected clients per poll page using Redis memory counters and SSE presence events (`poll:<id>:viewers`).

### 📊 2. Interactive Data Analytics & Charts
* **Dashboard Metric Cards**: Real-time overview of **Total Polls**, **Total Votes Cast**, **Active Polls**, and **Top Voted Poll**.
* **Visualization View Mode**: Dedicated chart view featuring animated vote distribution bar graphs, percentage breakdowns, and lead option badges.
* **Search, Filter & Sort**: Live search by question, filter by status (All, Active, Closed), and sort by newest vs total votes.

### 🔒 3. Creator Management & Security Controls
* **Poll Lock / Unlock Toggle**: Creators can lock voting on active polls anytime via `PATCH /api/polls/:id/toggle` without losing live result updates.
* **JWT & Bcrypt Security**: Password encryption using `bcrypt` and stateless session authorization with JWT tokens.
* **Frictionless Re-registration / Password Update**: Automated account sync for seeded users.

### 📱 4. Audience Sharing & Mobile Responsiveness
* **Instant QR Code Generation**: Built-in modal generator creating smartphone-scannable QR codes for fast mobile audience voting.
* **Frictionless Link Copy**: One-click clipboard copy for direct shareable links (`/poll/:id`).
* **Responsive Layouts**: Responsive grid layouts (`1 × 2` format) tailored for **Desktop**, **Tablet**, and **Mobile** viewports with a responsive `☰ Menu` navigation drawer.
* **"← Go Back" Navigation**: Intuitive back navigation buttons across Sign In, Registration, Create Poll, and Poll Details pages.

### 🌓 5. Light & Dark Theme System
* **Theme Switcher**: Instant toggle between Dark Mode and Light Mode with high-contrast text typography (`#0f172a`, `#1e293b`).
* **3D Glassmorphism Presentation**: Photorealistic 3D render background integration (`login_bg_3d.jpg`) with frosted glass blur effects (`backdrop-filter: blur(20px)`).

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React (Vite v8.3) | UI rendering, hooks, component state management |
| **Routing** | React Router v6 | Client-side page navigation & protected routes |
| **Styling & CSS** | Vanilla CSS Variables | CSS design tokens, glassmorphism, responsive media queries |
| **Backend Service** | Go (Gin Framework) | High-concurrency REST API engine |
| **Database** | MongoDB Atlas | Persistent BSON document store for users and polls |
| **Realtime Messaging** | Upstash Redis | In-memory Pub/Sub event broadcasting & viewer presence counter |
| **Realtime Transport** | Server-Sent Events (SSE) | HTTP streaming event pipe to browser clients |
| **Authentication** | JWT & Bcrypt | Token authorization & password encryption |

---

## 🏗️ Architecture & Real-Time Data Flow

```text
               ┌────────────────────────┐
               │ Audience Vote (Browser)│
               └───────────┬────────────┘
                           │
                 HTTP POST │ /api/polls/:id/vote
                           ▼
              ┌──────────────────────────┐
              │   Go (Gin) REST Backend  │
              └────────────┬─────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         ▼                                   ▼
┌──────────────────┐             ┌─────────────────────────┐
│  MongoDB Atlas   │             │   Upstash Redis Pub/Sub │
│ (Atomic $inc)    │             │  (`poll:<id>:updates`)  │
└──────────────────┘             └───────────┬─────────────┘
                                             │
                                   Broadcaster Redis Sub
                                             │
                                             ▼
                               ┌───────────────────────────┐
                               │ Server-Sent Events (SSE)  │
                               │ `GET /api/polls/:id/stream│
                               └─────────────┬─────────────┘
                                             │
                                             ▼
                               ┌───────────────────────────┐
                               │  Connected React Clients  │
                               │  (Live UI Updates Instantly)
                               └───────────────────────────┘
```

---

## 📁 Project Structure

```text
live-poll/
├── frontend/                  # React (Vite) Frontend Client
│   ├── public/
│   │   └── login_bg_3d.jpg    # 3D Octane Render Background Image
│   ├── src/
│   │   ├── components/        # UI Components (Navbar, ThemeToggle, ResultBar, AnalyticsCharts, ProtectedRoute)
│   │   ├── context/           # AuthContext & ThemeContext API providers
│   │   ├── pages/             # Page Views (LandingPage, LoginPage, RegisterPage, DashboardPage, CreatePollPage, PollPage, NotFoundPage)
│   │   ├── services/          # Centralized Axios API service layer (api.js, authService.js, pollService.js)
│   │   ├── App.jsx            # Router definitions
│   │   ├── main.jsx           # React app entrypoint
│   │   └── index.css          # Design system & responsive media queries
│   ├── .env.example           # Environment template for Frontend
│   └── package.json
│
├── backend/                   # Go (Gin) REST API & Realtime Backend
│   ├── config/                # MongoDB & Redis client configurations
│   ├── controllers/           # Request Handlers (auth_controller.go, poll_controller.go)
│   ├── middleware/            # JWT middleware (auth_middleware.go)
│   ├── models/                # Struct models (user.go, poll.go)
│   ├── routes/                # Gin router definitions (routes.go)
│   ├── utils/                 # Password hashing & JWT token helpers (jwt.go)
│   ├── main.go                # Server entry point, SSE stream handler & CORS setup
│   ├── seed.go                # MongoDB database seeder script (Sugumaran J + 10 Polls)
│   ├── .env.example           # Environment template for Backend
│   └── go.mod
│
├── .gitignore
└── README.md
```

---

## 📡 API Endpoints Reference

### Authentication Endpoints
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register a new user account or update credentials |
| `POST` | `/api/auth/login` | Public | Authenticate user and return JWT bearer token |
| `GET` | `/api/auth/me` | Protected | Fetch profile of authenticated user |

### Poll Management Endpoints
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/polls` | Protected | List all polls created by the logged-in user |
| `POST` | `/api/polls` | Protected | Create a new live poll with custom options |
| `GET` | `/api/polls/stats` | Protected | Fetch dashboard aggregated statistics & top polls |
| `GET` | `/api/polls/:id` | Public | Fetch single poll details and option vote totals |
| `PATCH` | `/api/polls/:id/toggle` | Protected | Toggle poll status between `Active` and `Closed` |
| `DELETE` | `/api/polls/:id` | Protected | Delete a poll created by the logged-in user |

### Real-Time Voting & SSE Stream
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/polls/:id/vote` | Public | Cast a vote for a poll option (updates MongoDB & publishes to Redis) |
| `GET` | `/api/polls/:id/stream` | Public | Server-Sent Events (SSE) stream for live vote & presence updates |

---

## 💻 Local Installation & Setup

### Prerequisites
* **Go** (v1.20+)
* **Node.js** (v18+) & **npm**
* **MongoDB Atlas Connection URI**
* **Upstash Redis Connection URL**

---

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create environment configuration file
cp .env.example .env

# Edit .env with your database URIs:
PORT=8080
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DATABASE=livepoll
REDIS_URL=rediss://default:<token>@<endpoint>.upstash.io:6379
JWT_SECRET=your_secret_jwt_key_2026
FRONTEND_URL=http://localhost:5173

# (Optional) Seed the database with Sugumaran J account and 10 detailed polls
go run seed.go

# Start the Go server
go run main.go
```

---

### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install node dependencies
npm install

# Create environment configuration file
cp .env.example .env

# Configure API URL in .env:
VITE_API_URL=http://localhost:8080/api

# Launch Vite development server
npm run dev
```

App Access Links:
* **Frontend UI**: `http://localhost:5173`
* **Backend REST API**: `http://localhost:8080/api`

---

## 🔒 Security & Performance Features

* **Anti-Duplicate Voting**: Cookie/IP validation and option ID verification.
* **Strict CORS Rules**: Dynamic origin matching for secure cross-origin requests (`PATCH`, `POST`, `OPTIONS`, `GET`, `DELETE`).
* **Route Ordering Precedence**: Gin router static route handlers (`/polls/stats`) prioritized before wildcard routes (`/polls/:id`).
* **Optimized Production Bundling**: Vite client builds in `< 500ms` with zero lint errors.
---

## 📄 License

MIT License — Developed for HCL GUVI Full Stack Development Intern Assessment.
