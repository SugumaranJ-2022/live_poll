# 🗳️ Live Poll — Real-Time Polling Application

A modern, high-performance, real-time web-based polling application built for the **HCL GUVI Full Stack Development Intern Assignment**. 

Live Poll allows authenticated users to create custom polls, share instant links with an audience, and watch live vote result changes in real-time **without refreshing the page**.

---

## 🌟 Key Features

* **User Authentication**: Secure registration, login, password encryption (bcrypt), and stateless JWT session management.
* **Poll Management**: Authenticated users can create polls with multiple options, view their created polls, and delete active polls.
* **Public Voting System**: Anyone with a shareable poll link (`/poll/:id`) can cast a vote. Includes anti-duplicate vote prevention.
* **Real-Time Live Updates**: Powered by **Redis Pub/Sub** and **Server-Sent Events (SSE)**. Results update live across all watching clients instantly without page refresh or polling timers.
* **Persistent Data Store**: All poll data, options, user accounts, and vote counts are stored in **MongoDB**.
* **Responsive UI/UX**: Clean dark-mode interface built with React, CSS variables, glassmorphism design, and animated result bars.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React (Vite) | Fast UI component rendering & state management |
| **Routing** | React Router v6 | Client-side page navigation & protected routes |
| **Backend** | Go (Gin Framework) | High-concurrency, fast REST API service |
| **Database** | MongoDB Atlas | Document store for persistent users & polls |
| **Realtime** | Redis (Upstash) | In-memory Pub/Sub channel event broadcaster |
| **Realtime Transport** | Server-Sent Events (SSE) | HTTP streaming connection to connected browsers |
| **Authentication** | JWT & Bcrypt | Password hashing & token authorization |

---

## 🏗️ Architecture & Real-Time Data Flow

```text
  User Votes (Browser A)
           │
           ▼
   HTTP POST Request
           │
           ▼
    Go (Gin) Backend ───▶ Persist Vote to MongoDB Atlas
           │
           ▼
  Publish Event to Redis Pub/Sub (`poll:{id}:updates`)
           │
           ▼
  Redis Subscriber in Go Service
           │
           ▼
  Broadcast SSE Stream (`GET /api/polls/:id/stream`)
           │
           ▼
  Connected React Clients (Browser B, C, D) ───▶ Update Results Live (No Refresh)
```

---

## 📁 Project Structure

```text
live-poll/
├── frontend/                 # React (Vite) Client Application
│   ├── src/
│   │   ├── components/       # Reusable components (Navbar, ProtectedRoute, ResultBar)
│   │   ├── context/          # React Context API for Auth state management
│   │   ├── pages/            # Application views (Landing, Auth, Dashboard, Poll, Manage)
│   │   ├── services/         # Centralized API service layer (Axios/Fetch)
│   │   ├── App.jsx           # Client router setup
│   │   ├── index.css         # Custom Design System styling
│   │   └── main.jsx
│   ├── .env.example          # Environment blueprint
│   └── package.json
│
├── backend/                  # Go (Gin) REST API & Realtime Backend
│   ├── config/               # Database (MongoDB) & Redis connection management
│   ├── controllers/          # API handlers for Auth and Poll operations
│   ├── middleware/           # JWT authentication middleware
│   ├── models/               # MongoDB BSON schemas & request input structs
│   ├── routes/               # API route definitions
│   ├── utils/                # Password hashing & JWT generation helpers
│   ├── .env.example          # Environment blueprint
│   ├── main.go               # Application entry point & SSE stream handler
│   └── go.mod
│
├── .gitignore
└── README.md
```

---

## 🚀 Local Development Setup

### Prerequisites
* **Go** (v1.20+)
* **Node.js** (v18+) & **npm**
* **MongoDB Atlas** database URI (or local MongoDB)
* **Upstash Redis** database URI (or local Redis)

### 1. Backend Setup
```bash
cd backend

# Create .env from template
cp .env.example .env

# Configure your environment variables in .env:
# PORT=8080
# MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
# MONGODB_DATABASE=livepoll
# REDIS_URL=rediss://default:<token>@<endpoint>.upstash.io:6379
# JWT_SECRET=your_jwt_secret_key
# FRONTEND_URL=http://localhost:5173

# Run the Go backend server
go run main.go
```

### 2. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Create .env from template
cp .env.example .env
# VITE_API_URL=http://localhost:8080/api

# Start Vite dev server
npm run dev
```

The application will be accessible at:
* Frontend: `http://localhost:5173`
* Backend API: `http://localhost:8080/api`

---

## 📡 API Endpoints

### Authentication
* `POST /api/auth/register` — Register new user account
* `POST /api/auth/login` — Authenticate user and receive JWT
* `GET /api/auth/me` — Get current user profile *(Protected)*

### Polls
* `POST /api/polls` — Create a new poll *(Protected)*
* `GET /api/polls` — List polls created by logged-in user *(Protected)*
* `GET /api/polls/:id` — Get public poll details & current vote counts
* `DELETE /api/polls/:id` — Delete a poll created by user *(Protected)*

### Voting & Realtime Stream
* `POST /api/polls/:id/vote` — Submit a vote for a poll option
* `GET /api/polls/:id/stream` — Realtime Server-Sent Events (SSE) stream

---

## 🔒 Security & Backend Input Validation

* **Password Security**: Passwords are hashed using bcrypt with salt prior to saving.
* **Authorization**: Backend verifies JWT on protected endpoints and checks poll ownership before deletion.
* **Input Validation**: Server validates question non-emptiness, minimum/maximum option counts, and duplicate option text.
* **Anti-Duplicate Voting**: IP address tracking prevents automated repeated voting from the same client.

---

## 📄 License
MIT License - Developed for HCL GUVI Full Stack Development Intern Assignment.
