<div align="center">
  <h1>🚚 TransitOps</h1>
  <p><strong>Smart Transport Operations Platform</strong></p>
  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
    <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white" alt="Prisma" />
  </p>
  <p>
    <img src="https://img.shields.io/badge/E2E_Tests-37%2F37_passing-16a34a?style=for-the-badge" alt="Tests" />
    <img src="https://img.shields.io/badge/Deployed-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white" alt="Render" />
  </p>
  <h3>
    🌐 <a href="https://transitops-1xru.onrender.com">Live Demo → transitops-1xru.onrender.com</a>
  </h3>
  <p><em>Login: <code>manager@transitops.com</code> / <code>Password@123</code> &nbsp;·&nbsp; free-tier instance — first load after idle takes ~50 s</em></p>
</div>

---

**TransitOps** is a comprehensive, full-stack fleet management solution built for the Odoo Hackathon. It is designed to handle complex transportation workflows, including dispatching, vehicle maintenance tracking, driver management, and financial analytics.

By utilizing strict database constraints and atomic state machine transitions, TransitOps ensures high data integrity and a seamless operational experience.

## ✨ Key Features

- **Strict State Machine Architecture**: Complex workflows (like vehicle dispatches and maintenance) are handled atomically inside database transactions. A vehicle cannot be dispatched if it is currently `IN_SHOP` or already `ON_TRIP` — both statuses flip together, or neither does.
- **Role-Based Access Control (RBAC)**: Distinct personas (`FLEET_MANAGER`, `DRIVER`, `SAFETY_OFFICER`, `FINANCIAL_ANALYST`) enforced twice — `authorize()` middleware on the API and role-aware UI. Users only see and interact with data relevant to their role.
- **Graceful Error Handling**: Validation rules (overweight cargo, expired licenses, duplicate registration numbers, double-assignment) return clear, human-readable toast notifications.
- **Live KPI Dashboard**: Instant visibility into Fleet Utilization, Active Trips, Drivers On Duty, and Revenue — with KPI ordering tailored to the active user's role, plus a live notification center for expiring licenses and open maintenance jobs.
- **Analytics & Reports**: Fuel efficiency, operational cost, and Vehicle ROI per vehicle — visualized with **hand-written SVG charts (zero chart libraries)** and exportable as **CSV**.
- **Full Auth Flow**: Sign-up with role selection, stateless JWT sessions, bcrypt-hashed passwords.
- **Polished UX**: Dark mode, global search, sortable & paginated tables, fully responsive down to mobile.

---

## 🛠 Tech Stack

- **Frontend**: React (Vite) with a modern, responsive UI — no UI kit, no chart library, every component hand-built.
- **Backend**: Node.js & Express.js REST API.
- **Database**: PostgreSQL with Prisma ORM for type-safe queries and robust schema migrations. Money and weights stored as `DECIMAL`, statuses as native enums, uniqueness as database constraints.
- **Authentication**: Stateless JWT authentication with Bcrypt password hashing.
- **Deployment**: Single-service deploy on Render (Express serves the built React app) + managed PostgreSQL, defined in [`render.yaml`](./render.yaml).

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- PostgreSQL 14+ (local database)

### 1. Database Setup
Create a new PostgreSQL database named `transitops`.

```powershell
psql -U postgres -c "CREATE DATABASE transitops;"
```

### 2. Backend Initialization

```bash
cd backend
# Duplicate the environment template
copy .env.example .env
# Important: Edit .env and put your real postgres password in DATABASE_URL

# Install dependencies and setup the database
npm install
npx prisma migrate dev --name init   # Applies schema
npm run db:seed                      # Seeds demo data
npm run dev                          # Starts API on http://localhost:5000
```

### 3. Frontend Initialization (in a new terminal)

```bash
cd frontend
npm install
npm run dev                          # Starts UI on http://localhost:5173
```

### 4. Run the Test Suite (backend must be running)

```bash
cd backend
npm run test:e2e                     # 37 automated checks: every business rule,
                                     # every validation, every RBAC permission
```

---

## 🔐 Demo Credentials

Use the following credentials to explore the platform across different roles — locally or on the [live demo](https://transitops-1xru.onrender.com). The password for all accounts is: `Password@123`

| Role | Email | Domain Access |
|---|---|---|
| **Fleet Manager** | `manager@transitops.com` | Full System Access |
| **Driver** | `driver@transitops.com` | Trips & Dispatching (no financial data) |
| **Safety Officer** | `safety@transitops.com` | Driver Management & Compliance |
| **Financial Analyst**| `analyst@transitops.com` | Costs, Fuel, and ROI Reports |

The seed data intentionally includes edge cases for testing the guardrails: a driver with an **expired license**, a **suspended** driver, and **retired / in-shop** vehicles — try dispatching them and watch the system refuse.

---

## 📏 Business Rules — enforced, not suggested

| Rule | Where it's enforced |
|---|---|
| Unique registration numbers | PostgreSQL `UNIQUE` constraint → clean 409 |
| Retired / In-Shop vehicles hidden from dispatch | API filter + re-checked inside the dispatch transaction |
| Expired-license / suspended drivers blocked | Trip service validation, on create **and** dispatch |
| No double-assignment of on-trip vehicle/driver | Status check inside the transaction (race-safe) |
| Cargo weight ≤ vehicle capacity | Validation with a human-readable message |
| Dispatch / Complete / Cancel status flips | Single atomic `prisma.$transaction` |
| Maintenance ⇒ auto In-Shop ⇒ auto-restore on close | Maintenance service transaction |

---

## 📁 Project Structure

```
backend/
  prisma/schema.prisma          # 8 entities, enums, constraints — the ERD in code
  prisma/seed.js                # demo data incl. edge cases
  src/middleware/auth.js        # JWT + authorize(...roles) RBAC
  src/services/trip.service.js  # every business rule, inside DB transactions ★
  src/routes/                   # one module per file
  tests/e2e.mjs                 # 37 automated rule + RBAC tests
frontend/
  src/components/               # layout, SVG icons, hand-written charts, pagination
  src/pages/                    # Dashboard · Vehicles · Drivers · Trips · Maintenance · Expenses · Reports
```

---

## ☁️ Deployment

Deployed on Render via a one-click [Blueprint](./render.yaml): one web service (Express serves both the API and the React build — same origin, no CORS) plus managed PostgreSQL. Migrations and the idempotent seed run on every boot. Full guide: [docs/DEPLOY.md](./docs/DEPLOY.md).

---

## 📚 System Design & Architecture

For a deep dive into the underlying architecture, database Entity-Relationship Diagram (ERD), API specifications, state machines, and the full RBAC matrix, please refer to the [System Design Document](./SYSTEM_DESIGN.md).

> Built with ❤️ for the Odoo Hackathon.
