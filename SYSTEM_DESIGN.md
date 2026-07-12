# TransitOps — System Design

> Smart Transport Operations Platform · Odoo Hackathon (8 hours)
> Stack: **React (Vite) + Node.js/Express + PostgreSQL (Prisma ORM)**

---

## 1. Architecture (3-tier)

```
┌─────────────────────┐     JSON / REST      ┌──────────────────────┐      SQL       ┌──────────────┐
│  React SPA (Vite)   │ ──────────────────►  │  Express API server  │ ─────────────► │ PostgreSQL 18│
│  - Auth context/JWT │ ◄──────────────────  │  - JWT auth + RBAC   │ ◄───────────── │  (local DB)  │
│  - Pages per module │      port 5173       │  - Service layer     │   via Prisma   │              │
└─────────────────────┘                      │  - Business rules in │                └──────────────┘
                                             │    DB TRANSACTIONS   │
                                             └──────────────────────┘
                                                    port 5000
```

**Why this wins points:**
- Local PostgreSQL, hand-built REST API — exactly what the judges asked for (no Firebase/Supabase).
- Business rules live in a **service layer inside DB transactions** — status transitions are atomic (a dispatch can never half-succeed and leave a driver On Trip with no trip).
- Uniqueness (registration number, email, license number) enforced at the **database level**, not just the UI.

## 2. Database Design (ERD)

```
Role 1──* User 1──* Trip *──1 Vehicle 1──* MaintenanceLog
                    │              │
                    *──1 Driver    ├──* FuelLog (optional FK → Trip)
                                   └──* Expense (optional FK → Trip)
```

| Table | Key columns | Notes |
|---|---|---|
| roles | name (unique) | FLEET_MANAGER, DRIVER, SAFETY_OFFICER, FINANCIAL_ANALYST |
| users | email (unique), password_hash, role_id FK | bcrypt-hashed passwords |
| vehicles | reg_no (**unique**), name, type, max_load_kg, odometer_km, acquisition_cost, region, status | status: AVAILABLE / ON_TRIP / IN_SHOP / RETIRED |
| drivers | license_no (unique), license_category, license_expiry, contact, safety_score, status | status: AVAILABLE / ON_TRIP / OFF_DUTY / SUSPENDED |
| trips | vehicle_id FK, driver_id FK, source, destination, cargo_weight_kg, planned_distance_km, status, start/end_odometer_km, revenue, created_by FK | status: DRAFT / DISPATCHED / COMPLETED / CANCELLED |
| maintenance_logs | vehicle_id FK, title, cost, status (OPEN/CLOSED), opened_at, closed_at | opening one flips vehicle → IN_SHOP |
| fuel_logs | vehicle_id FK, trip_id FK?, liters, cost, filled_at | trip link enables per-trip efficiency |
| expenses | vehicle_id FK, trip_id FK?, category, amount, spent_at | tolls, parking, fines, misc |

Money/weight columns are `DECIMAL`, never `FLOAT` (mention this to judges — it's a classic DB-design point).

## 3. State Machines (the heart of the evaluation)

**Trip:** `DRAFT → DISPATCHED → COMPLETED`, and `DRAFT|DISPATCHED → CANCELLED`. No other transition is accepted by the API.

**Vehicle:** `AVAILABLE ⇄ ON_TRIP` (dispatch/complete), `AVAILABLE ⇄ IN_SHOP` (maintenance open/close), `→ RETIRED` (terminal).

**Driver:** `AVAILABLE ⇄ ON_TRIP`, plus manual `OFF_DUTY` / `SUSPENDED`.

### Mandatory business rules → where enforced

| Rule | Enforcement |
|---|---|
| Registration number unique | DB `UNIQUE` constraint + API 409 error |
| Retired / In-Shop vehicles never in dispatch selection | API: `GET /vehicles?available=true` returns only AVAILABLE; re-checked at dispatch |
| Expired-license / Suspended drivers can't be assigned | Trip service: `license_expiry >= today` and `status = AVAILABLE` checks |
| On-Trip vehicle/driver can't be double-assigned | Status check **inside the dispatch transaction** (race-safe) |
| Cargo weight ≤ max load capacity | Trip service validation on create **and** dispatch |
| Dispatch ⇒ vehicle+driver ON_TRIP | Single `prisma.$transaction` — atomic |
| Complete ⇒ both back to AVAILABLE, odometer updated | Same transaction; vehicle.odometer = end odometer |
| Cancel dispatched trip ⇒ both restored to AVAILABLE | Same pattern |
| Open maintenance ⇒ vehicle IN_SHOP | Maintenance service transaction (rejected if vehicle ON_TRIP) |
| Close maintenance ⇒ AVAILABLE unless RETIRED | Maintenance service transaction |

## 4. API Design (REST)

Base: `/api` · Auth: `Authorization: Bearer <JWT>` · All non-auth routes require a valid token.

| Method & path | Purpose | Roles (writes) |
|---|---|---|
| POST /auth/register, /auth/login | JWT auth, bcrypt | public |
| GET/POST/PUT/DELETE /vehicles | CRUD, `?status=&type=&region=&available=true` filters | FLEET_MANAGER |
| GET/POST/PUT/DELETE /drivers | CRUD, `?status=` filter | SAFETY_OFFICER, FLEET_MANAGER |
| GET/POST /trips, PUT /trips/:id | Create draft / edit draft | DRIVER, FLEET_MANAGER |
| POST /trips/:id/dispatch · /complete · /cancel | State transitions (all rules enforced here) | DRIVER, FLEET_MANAGER |
| GET/POST /maintenance, POST /maintenance/:id/close | Open/close logs, auto status flips | FLEET_MANAGER |
| GET/POST /fuel-logs, /expenses | Cost tracking | FINANCIAL_ANALYST, FLEET_MANAGER, DRIVER |
| GET /dashboard | All KPI counts in one call | any role |
| GET /reports/vehicles (+ `?format=csv`) | Per-vehicle cost/efficiency/ROI + CSV export | any role |

Every error returns `{ "error": "human-readable message" }` with a proper status code (400 validation, 401 auth, 403 role, 404 missing, 409 conflict) — the frontend shows these directly, which nails the "graceful validation" judging criterion.

## 5. RBAC Matrix

| Module | Fleet Manager | Driver | Safety Officer | Financial Analyst |
|---|---|---|---|---|
| Dashboard | Fleet KPIs | Trip KPIs | Compliance KPIs | Financial KPIs |
| Vehicles | **CRUD** | read | read | read |
| Drivers | read | read (+assign via trips) | **CRUD** | read |
| Trips | read | **create · dispatch · complete · cancel** | read | read |
| Maintenance | **CRUD** | read | read | read |
| Fuel Logs | read | ✗ no access | read | **CRUD** |
| Expenses | read | ✗ no access | read | **CRUD** |
| Reports | operational | operational | compliance | financial |

Enforced twice: `authorize(...roles)` middleware on the API (403 with a clear message), and the UI hides buttons/nav items the role can't use (Drivers never see the Expenses page). The dashboard reorders its KPI cards per role so each persona leads with their own lens.

## 6. KPI & Report Formulas

- **Fleet Utilization %** = vehicles ON_TRIP ÷ (total − RETIRED) × 100
- **Fuel Efficiency** = total distance (odometer deltas of completed trips) ÷ total liters
- **Operational Cost / vehicle** = Σ fuel cost + Σ maintenance cost (+ Σ other expenses shown separately)
- **Vehicle ROI** = (Σ trip revenue − (maintenance + fuel)) ÷ acquisition cost

## 7. 8-Hour Plan — 4 parallel tracks

| Hour | M1 · Backend core | M2 · Backend rules/reports | M3 · Frontend UI | M4 · Frontend data/integration |
|---|---|---|---|---|
| 0–1 | **All together:** review this doc, run setup, agree API contracts, everyone makes 1 commit |  |  |  |
| 1–3 | Drivers CRUD + filters, RBAC checks | Trip lifecycle endpoints hands-on: test every rule with bad inputs | Drivers + Trips pages (forms, tables, status badges) | Dashboard KPIs + filters wired to API |
| 3–5 | Maintenance open/close flow | Fuel logs, expenses, reports + CSV export | Maintenance + Fuel/Expense pages | Trips page: dispatch/complete/cancel buttons, error toasts |
| 5–6.5 | Bug fixes from integration | Seed rich demo data | Reports page + charts (bonus) | Search/sort/filters, dark mode (bonus) |
| 6.5–8 | **All together:** run the 9-step demo workflow end-to-end, fix issues, rehearse presentation (everyone presents one module) |  |  |  |

**Git discipline (judged!):** every member commits to their own branch (`feat/drivers`, `feat/trips-ui`…), small commits with clear messages, merge to `main` via PRs at hours 3, 5, and 7.

## 8. Demo Script (mirrors the PDF's Example Workflow — judges will look for exactly this)

1. Log in as Fleet Manager → register vehicle **Van-05**, capacity 500 kg → appears Available on dashboard.
2. Log in as Safety Officer → register driver **Alex** with valid license.
3. As Driver role → create trip, cargo **550 kg** → show the validation error (graceful handling!). Change to **450 kg** → draft saves.
4. Dispatch → show vehicle AND driver flip to On Trip on dashboard; try to assign Van-05 to another trip → blocked.
5. Complete trip with final odometer + fuel → both back to Available, fuel log recorded.
6. Open maintenance "Oil Change" on Van-05 → status In Shop, gone from dispatch dropdown. Close it → Available again.
7. Try dispatching with driver whose license is expired (seeded: "Ravi Expired") → blocked with a clear message.
8. As Financial Analyst → reports: operational cost, fuel efficiency, ROI; download the CSV.
9. Show the Prisma schema / ERD and one transaction block in the code — this is your database-design flex.

## 9. Things judges explicitly said they score — checklist

- [x] Local PostgreSQL, real backend API, no BaaS
- [x] Normalized schema, constraints at DB level, DECIMAL for money
- [ ] All 4 members committing regularly (do this from hour 0)
- [x] Graceful validation with human messages (409 duplicate reg no, 400 overweight cargo…)
- [ ] Clean consistent UI: one color scheme, sidebar nav, status badges
- [ ] Everyone presents one module they built and can explain
- [ ] Understand every library used: be ready to explain *why Prisma* (type-safe queries, migrations as schema history) and *why JWT* (stateless auth)
