# Finance Dashboard Backend

Backend API for a finance dashboard system with:

- user registration and management
- role-based access control
- financial record CRUD
- dashboard analytics and summaries
- validation, error handling, and Swagger docs

## Tech Stack

- Node.js
- Express
- Sequelize
- PostgreSQL
- JWT authentication
- Swagger UI

## Roles

- `VIEWER`: can access dashboard summary endpoints
- `ANALYST`: can access dashboard summary endpoints and read financial records
- `ADMIN`: full access to users and financial records

## Features Implemented

- User registration and login
- First registered user is automatically promoted to `ADMIN`
- Admin user management:
  - list users
  - create users
  - update users
  - update active or inactive status
  - fetch a user by id
- Authenticated profile endpoint: `GET /users/me`
- Financial records:
  - create
  - list
  - fetch by id
  - update
  - delete
- Record filters:
  - `type`
  - `category`
  - `startDate`
  - `endDate`
  - `minAmount`
  - `maxAmount`
  - `search`
  - `page`
  - `limit`
- Dashboard analytics:
  - total income
  - total expense
  - net balance
  - category-wise totals
  - recent activity
  - monthly trend
  - weekly trend
- Validation and centralized error handling
- Swagger docs at `/api-docs`
- Health check at `/health`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables in `.env`:

```env
PORT=5000
APP_URL=http://localhost:5000
DATABASE_URL=postgresql://postgres:password@db.<project-ref>.supabase.co:5432/postgres
DB_SSL=true
JWT_SECRET=supersecret
```

Alternative non-URL configuration:

```env
PORT=5000
APP_URL=http://localhost:5000
DB_HOST=db.<project-ref>.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASS=your_password
DB_SSL=true
JWT_SECRET=supersecret
```

3. Start the server:

```bash
npm start
```

## Useful Scripts

- `npm start`: start the server
- `npm run dev`: start the server
- `npm run check`: syntax-check backend source files

## API Overview

### Auth

- `POST /auth/register`
- `POST /auth/login`

### Users

- `GET /users/me`
- `GET /users`
- `GET /users/:id`
- `POST /users`
- `PUT /users/:id`
- `PATCH /users/:id/status`

### Records

- `GET /records`
- `GET /records/:id`
- `POST /records`
- `PUT /records/:id`
- `DELETE /records/:id`

### Dashboard

- `GET /dashboard/summary`

## Requirement Coverage

### 1. User and Role Management

- Users can register and log in
- Admins can create, list, update, and inspect users
- Roles supported:
  - `VIEWER`
  - `ANALYST`
  - `ADMIN`
- User status is supported through `ACTIVE` and `INACTIVE`
- Inactive users are blocked from authenticated access

### 2. Financial Records Management

- Admins can create, update, and delete financial records
- Analysts and admins can read financial records
- Records include:
  - amount
  - type
  - category
  - date
  - notes
- Filtering is supported by:
  - type
  - category
  - date range
  - amount range
  - text search
  - pagination

### 3. Dashboard Summary APIs

`GET /dashboard/summary` returns:

- total income
- total expense
- net balance
- category-wise totals
- recent activity
- monthly trend
- weekly trend

### 4. Access Control Logic

- `VIEWER`: dashboard summary only
- `ANALYST`: dashboard summary and record reads
- `ADMIN`: full access to users and records
- Authorization is enforced through middleware

### 5. Validation and Error Handling

- Input validation is applied for:
  - registration
  - login
  - user updates
  - record create or update
  - record filters
- Errors return structured JSON messages with appropriate HTTP status codes
- Centralized error middleware handles runtime and validation failures

### 6. Data Persistence

- PostgreSQL is used for relational persistence
- Sequelize models are used for data access and schema mapping

## Optional Enhancements Included

- JWT authentication
- pagination
- search support
- API documentation with Swagger
- health check endpoint
- demo seed data for role-based review

## Assumptions

- PostgreSQL is used for persistence so the backend can be deployed easily with Supabase.
- Records are global dashboard records, not private per-user budgets.
- Record deletion is implemented as a standard delete because the existing schema does not include soft-delete columns.
- A public registration endpoint is kept for ease of evaluation, while admin endpoints handle ongoing user management.

## Supabase Deployment Notes

- Create a Supabase project and copy the Postgres connection string from `Project Settings` -> `Database`.
- Set `DATABASE_URL` in your backend deployment environment.
- Keep `DB_SSL=true` for Supabase-hosted Postgres.
- Install the Postgres driver dependencies before running locally:

```bash
npm install
```

## Submission Notes

This implementation is structured to match the assignment focus areas:

- backend design and separation of concerns
- role-based authorization
- validation and reliable API behavior
- data modeling and aggregation logic
- documentation and clarity
