# Mini ERP + CRM Operations Portal

A small ERP/CRM system for a wholesale/distribution company: customer CRM, product & inventory management, and a sales challan flow with real stock-deduction business logic.

Built for the **Full Stack Developer Case Study**.


---

## 1. Tech Stack

| Layer      | Technology |
|------------|------------|
| Backend    | Node.js, TypeScript, Express.js, PostgreSQL (`pg`), Zod validation, JWT auth |
| Frontend   | React 18, TypeScript, Vite, React Router, Axios |
| Database   | PostgreSQL (raw SQL, no ORM — schema in `backend/sql/schema.sql`) |
| DevOps     | Docker + docker-compose (local Postgres + backend), deployable to any free host |

---

## 2. Architecture Overview

```
mini-erp-crm/
├── backend/           Express + TS REST API
│   ├── src/
│   │   ├── config/        DB pool
│   │   ├── middleware/    auth (JWT), role authorization, validation, error handling
│   │   ├── routes/        one file per resource (auth, customers, products, challans)
│   │   ├── controllers/   business logic + SQL queries
│   │   ├── utils/         pagination, JWT signing, challan number generator, seed script
│   │   └── index.ts       app entrypoint
│   └── sql/schema.sql     full Postgres schema (enums, tables, indexes)
├── frontend/          React + Vite SPA
│   └── src/
│       ├── api/            axios client + typed API calls per resource
│       ├── pages/           Login, Dashboard, Customers, Products, Challans (+ detail pages)
│       ├── components/      Layout (sidebar), ProtectedRoute (role guard)
│       └── AuthContext.tsx  JWT + user stored in localStorage, attached to every request
├── postman/           Ready-to-import Postman collection
└── docker-compose.yml Local Postgres + backend stack
```

**Request flow:** Frontend (Vite dev server / static build) → REST API (Express) → PostgreSQL.
Auth is stateless JWT — the token encodes `{ id, name, email, role }` and is verified on every
protected request; role-based authorization middleware (`authorize('Admin','Sales',...)`) gates
write endpoints per module.

**Key business logic** (Sales Challan module, `backend/src/controllers/challan.controller.ts`):
- Confirming a challan (`Draft` → `Confirmed`) row-locks the affected products (`SELECT ... FOR UPDATE`)
  inside a DB transaction, checks each item's requested quantity against current stock, and **rejects
  the whole transaction with a 400 error if any item would push stock negative** — nothing is partially applied.
- Every stock change (challan confirm, manual adjustment, cancellation reversal) writes a row to
  `stock_movements` so there's a full audit trail.
- Challan items store a **snapshot** of product name/SKU/price at the time of the challan (not just
  a foreign key), so historical challans stay accurate even if a product is later renamed or repriced.
- Cancelling a `Confirmed` challan automatically restocks the items (with a linked `IN` movement).

---

## 3. Core Modules Implemented

1. **Auth & Roles** — JWT login, 4 roles (Admin, Sales, Warehouse, Accounts). All authenticated
   users can *view* all modules; write access is role-gated (Sales → customers/challans,
   Warehouse → products/stock, Admin → everything).
2. **Customer CRM** — add/edit/search/view customers, status (Lead/Active/Inactive), follow-up
   date, and a follow-up notes timeline (separate table, not just an overwritten text field).
3. **Product & Inventory** — add/edit products, stock movement log (IN/OUT with reason + actor),
   low-stock filter based on `min_stock_alert`.
4. **Sales Challan** — multi-product challan builder, auto-generated challan number
   (`CH-2026-0001` style), Draft/Confirmed/Cancelled lifecycle, stock reduction with negative-stock
   protection, product snapshotting.

---

## 4. Local Setup

### Prerequisites
- Node.js 20+
- Docker (recommended, for Postgres) — or a local/hosted Postgres instance

### Option A — Docker Compose (fastest)

```bash
# 1. Start Postgres + backend
docker compose up -d --build

# 2. Seed demo users + sample data (run once, after containers are healthy)
docker compose exec backend npm run seed

# 3. Run the frontend separately (for hot reload)
cd frontend
cp .env.example .env      # VITE_API_URL=http://localhost:4000
npm install
npm run dev                # http://localhost:5173
```

### Option B — Fully manual

```bash
# Backend
cd backend
cp .env.example .env
# edit .env -> point DATABASE_URL at your Postgres instance (local, Neon, Supabase, Render...)
npm install
psql "$DATABASE_URL" -f sql/schema.sql   # create tables
npm run seed                              # create demo users + sample data
npm run dev                               # http://localhost:4000

# Frontend (separate terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                               # http://localhost:5173
```

### Test login credentials (all roles, after running the seed script)

| Role       | Email               | Password    |
|------------|----------------------|-------------|
| Admin      | admin@demo.com       | Passw0rd!   |
| Sales      | sales@demo.com       | Passw0rd!   |
| Warehouse  | warehouse@demo.com   | Passw0rd!   |
| Accounts   | accounts@demo.com    | Passw0rd!   |

---

## 5. Environment Variables

**Backend (`backend/.env`, see `.env.example`)**

| Variable | Description |
|---|---|
| `PORT` | API port (default 4000) |
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | Secret used to sign JWTs — set a long random string in production |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `8h` |
| `FRONTEND_ORIGIN` | Allowed CORS origin for the deployed frontend |

**Frontend (`frontend/.env`, see `.env.example`)**

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the deployed backend API |

Environment variables are never committed — both `.env` files are git-ignored, and `.env.example`
templates are provided for setup.

---

## 6. Deployment

AWS is treated as a bonus per the case study; the primary path is free hosting:

- **Database**: Neon / Supabase / Render Postgres — create a DB, run `sql/schema.sql` against it,
  then `npm run seed`.
- **Backend**: Render / Railway / Fly.io — deploy `backend/` as a Node service (`npm run build && npm start`),
  or use the provided `backend/Dockerfile`. Set the env vars from section 5.
- **Frontend**: Vercel / Netlify / Render Static Site — deploy `frontend/` (`npm run build`, output
  dir `dist/`), set `VITE_API_URL` to the deployed backend URL.

Update `FRONTEND_ORIGIN` on the backend once the frontend URL is known, to keep CORS locked down.

### AWS path (optional)
- Backend: containerize with `backend/Dockerfile` and run on ECS Fargate / Elastic Beanstalk, or a
  small EC2 instance behind an ALB.
- Database: RDS for PostgreSQL (free-tier eligible instance).
- Frontend: S3 static website hosting + CloudFront.
- Secrets (`JWT_SECRET`, `DATABASE_URL`) go in AWS Secrets Manager / SSM Parameter Store rather than
  plain environment variables in production.

---

## 7. API Overview

Base URL: `http://localhost:4000` (local) — see the Postman collection in `postman/` for every
endpoint with example bodies.

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| POST | `/auth/login` | — | Returns `{ token, user }` |
| GET | `/auth/me` | any | Current user from token |
| GET | `/customers` | any | `?search=&status=&page=&limit=` |
| POST | `/customers` | Admin, Sales | |
| PUT | `/customers/:id` | Admin, Sales | |
| POST | `/customers/:id/followups` | Admin, Sales | Adds a follow-up note |
| GET | `/products` | any | `?search=&lowStock=true&page=&limit=` |
| POST | `/products` | Admin, Warehouse | |
| PUT | `/products/:id` | Admin, Warehouse | Stock is not editable here — see below |
| POST | `/products/:id/stock-movement` | Admin, Warehouse | The only way to change `current_stock`; rejects if it would go negative |
| GET | `/challans` | any | `?status=&customerId=&page=&limit=` |
| POST | `/challans` | Admin, Sales | `status: Draft \| Confirmed`; Confirmed reduces stock immediately |
| POST | `/challans/:id/confirm` | Admin, Sales, Warehouse | Draft → Confirmed, reduces stock |
| POST | `/challans/:id/cancel` | Admin, Sales | Restocks items if it was Confirmed |

All endpoints return `{ success: boolean, data, meta? }` on success and
`{ success: false, message, details? }` on error, with proper HTTP status codes (400 validation,
401 auth, 403 role, 404 not found, 409 conflict, 500 server error).

---

## 8. Assumptions Made

- Roles are fixed to the 4 listed in the brief; there's no self-signup — users are created via the
  seed script (or directly in the `users` table / an admin-only endpoint you can add later).
- "View" access is open to all authenticated roles across all modules; only *write* actions are
  role-restricted, based on the department each role would realistically own (Sales → CRM & challans,
  Warehouse → products & stock, Accounts → read-only across the board for now).
- `current_stock` on a product can only change through the stock-movement endpoint or a challan
  confirmation — never a direct field edit — so every change is always logged.
- Challan numbers reset their sequence per calendar year (`CH-2026-0001`, `CH-2027-0001`, ...).
- GST number and email are optional per the CRM fields list ("GST number, optional" in the brief);
  other customer fields are required.
- No file/image upload or PDF export is included in this submission (see Known Limitations) —
  they're listed as bonus items in the brief.

---

## 9. Known Limitations / Incomplete Parts

- No automated test suite (unit/integration tests) — out of scope for the 48-hour window; validation
  is enforced with Zod at the API boundary and business rules are covered by transaction-level checks.
- No AWS deployment performed for this submission (documented as bonus path above); deployed instead
  to free-tier hosting as described in section 6.
- Bonus items not implemented: Docker Compose covers only local dev (no CI/CD via GitHub Actions),
  no invoice PDF export, no S3 image upload for products.
- No password-reset / user-management UI — users are managed via the seed script or direct DB access;
  an Admin-only "manage users" screen would be a natural next addition.
- Frontend uses `localStorage` for the JWT (simple and common for this project size); an httpOnly
  cookie-based session would be a stronger choice for a production deployment.
- Pagination is implemented on all list endpoints, but the frontend currently only paginates by
  re-fetching page 1 (no "load more" / page controls in the UI yet) — the API fully supports `page`
  and `limit` for a future UI enhancement.

---


## 10. 🎥 Project Walkthrough

I've recorded a complete walkthrough explaining the project, its business flow, role-based permissions, and key functionality.

👉 **[Watch the Project Explanation Video]** https://drive.google.com/file/d/1BMmGkeKrxe2GK2NCCFSNQMPZ6GGKb78y/view?usp=sharing

### What is covered in the video?

- 🏢 Overview of the ERP + CRM system
- 👥 Customer CRM and follow-up management
- 📦 Product and inventory management
- 🧾 Sales challan creation and workflow
- 📊 Stock IN / OUT management
- 🔄 Stock deduction when a challan is confirmed
- 👨‍💼 Role-based access for Admin, Sales, Warehouse, and Accounts
- 🔐 Backend authorization and API-level permission enforcement
- 🚫 Unauthorized actions returning `403 Forbidden`
- 🔗 Complete Sales → Challan → Warehouse → Dispatch flow

---