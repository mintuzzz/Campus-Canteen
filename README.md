# Campus Mess & Canteen Feedback & Pre-Order System

A production-ready full-stack web application designed for college mess halls and canteens. It allows students to pre-order food, track preparations in real-time, pay online (mocked), and provide granular star reviews. Canteen admins can manage live incoming orders (via WebSockets), customize daily menus, audit payment logs, view advanced analytics, and check automatically compiled daily AI summaries.

---

## Technical Stack

* **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router, React Query, React Hook Form, Recharts, Socket.io-client.
* **Backend:** Node.js, Express.js, MongoDB, Mongoose, JSON Web Tokens (JWT), Bcrypt.js, Socket.io.
* **Orchestration:** Docker, Docker Compose.

---

## Project Structure

```
canteen/
├── package.json                   # Root command runner (concurrent execution)
├── docker-compose.yml             # Local docker orchestration
├── README.md                      # Documentation
├── backend/                       # Express JS backend API
└── frontend/                      # React SPA frontend
```

---

## Quick Start (Local Setup)

### 1. Prerequisites
* Install [Node.js](https://nodejs.org/) (v16+ recommended).
* Install and run [MongoDB](https://www.mongodb.com/try/download/community) locally at `mongodb://localhost:27017` (default port).

### 2. Installation
Run the following script in the root directory to install all dependencies for both frontend and backend automatically:
```bash
npm run install-all
```

### 3. Database Seeding
To populate the database with mock food menus, users (student & admin), historical orders, feedbacks, and reports for testing analytics:
```bash
npm run seed
```

### 4. Running the Development Server
To launch both the backend (port 5000) and the frontend (port 5173) in watch mode:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your web browser.

---

## Running with Docker

To build and spin up the entire container stack (Frontend, Backend, and MongoDB container) using Docker:

```bash
docker-compose up --build
```

* **Frontend URL:** [http://localhost:5173](http://localhost:5173)
* **Backend API URL:** [http://localhost:5000](http://localhost:5000)
* **Database Port:** `27017` (Internal database mapped for debugging if needed)

To seed the database while running inside docker containers, run:
```bash
docker exec -it canteen_backend npm run seed
```

---

## Seeding & Authentication Details

### Seeded Admin Credentials
Use the following account to access the Admin Panel (`/admin/login` or via the Admin login toggle):
* **Email:** `admin@canteen.com`
* **Password:** `admin123`

### Seeded Student Credentials
Alternatively, you can register a new student or use this pre-seeded student:
* **Email:** `student@canteen.com`
* **Password:** `student123`

---

## Key Features

1. **Dual Role Dashboards:** Separate protected screens for Students (cart, order tracker, history, favorites) and Canteen Managers (order processing queue, menu toggles, review logs).
2. **Real-time Synchronization:** Utilizes Socket.io. When the admin transitions an order from `Pending` -> `Accepted` -> `Preparing` -> `Ready` -> `Completed`, the student's tracker progresses instantly without page reloads.
3. **Multi-category Feedback:** Grades orders across Taste, Hygiene, Service, Quantity, and Price. Includes AI sentiment tagging (Positive, Neutral, Negative) and enforces a 24-hour lock for updates.
4. **Interactive Dashboard Charts:** Utilizes Recharts to map sales trends, ratings distributions, most ordered items, and peak hour spikes.
5. **AI Daily Summary:** Aggregates analytics data and generates templates showing orders, revenue, complaints, and concrete actionable suggestions.
