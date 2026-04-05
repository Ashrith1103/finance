# Finance Backend API Guide

This document is for assignment reviewers and testers.
It explains how to test the backend API quickly with minimal frontend dependency.

## 1. Base URLs

- Production API base URL: `https://finance-lac-seven.vercel.app`
- Health check: `GET /health`
- Swagger docs: `GET /api-docs`

## 2. Test Accounts (Sample)

Use the following sample accounts for role-based testing:

- ADMIN: `admin@example.com` / `Admin123`
- ANALYST: `analyst@example.com` / `Analyst123`
- VIEWER: `viewer@example.com` / `Viewer123`

If these accounts are not present in your environment, create them using:

1. `POST /auth/register` for initial account creation
2. `POST /auth/login` to obtain an ADMIN token
3. `POST /users` (ADMIN) to create analyst and viewer accounts

## 3. Authentication Model

- Login returns a JWT token.
- Send token in header:

```http
Authorization: Bearer <token>
```

Notes:

- Token without `Bearer` prefix is also accepted by the middleware.
- Inactive users (`status = INACTIVE`) are blocked from access.

## 4. Role Permissions

- `VIEWER`
  - Can read dashboard summary (`self` scope)
  - Can create/read/update/delete only own records
- `ANALYST`
  - Can read records
  - Can read dashboard summary (`self`, `overall`, `user`)
  - Cannot create/update/delete records or users
- `ADMIN`
  - Full access to users
  - Full access to records
  - Full access to dashboard scopes

## 5. Quick API Test Flow

Recommended evaluator flow:

1. `GET /health`
2. Login as ADMIN (`POST /auth/login`)
3. Get profile (`GET /users/me`)
4. List users (`GET /users`)
5. Create record (`POST /records`)
6. Search records by owner name (`GET /records?search=admin`)
7. Compare dashboard scopes (`GET /dashboard/summary?scope=self|overall|user`)
8. Login as ANALYST and VIEWER to verify role restrictions

## 6. Endpoint Reference

### 6.1 Auth

#### POST /auth/register

Creates a user account.
The first registered user becomes `ADMIN`; subsequent registrations default to `VIEWER`.

Request:

```json
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "Admin123"
}
```

Success `201` response:

```json
{
  "message": "First user created as ADMIN.",
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "ADMIN",
    "status": "ACTIVE"
  }
}
```

#### POST /auth/login

Request:

```json
{
  "email": "admin@example.com",
  "password": "Admin123"
}
```

Success `200` response:

```json
{
  "token": "<jwt>",
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "ADMIN",
    "status": "ACTIVE"
  }
}
```

### 6.2 Users (Authenticated)

#### GET /users/me

Returns current authenticated user.

#### GET /users (ADMIN)

Returns all users.

#### GET /users/:id (ADMIN)

Returns one user by id.

#### POST /users (ADMIN)

Creates a user with explicit role/status.

Request example:

```json
{
  "name": "Analyst User",
  "email": "analyst@example.com",
  "password": "Analyst123",
  "role": "ANALYST",
  "status": "ACTIVE"
}
```

#### PUT /users/:id (ADMIN)

Updates user fields (`name`, `email`, `password`, `role`, `status`).

#### PATCH /users/:id/status (ADMIN)

Request:

```json
{
  "status": "INACTIVE"
}
```

#### DELETE /users/:id (ADMIN)

Deletes user and their associated records.

### 6.3 Records (Authenticated)

#### POST /records (VIEWER, ADMIN)

Creates a financial record owned by the authenticated user.

Request:

```json
{
  "amount": 15000,
  "type": "INCOME",
  "category": "Salary",
  "date": "2026-04-01",
  "notes": "Monthly salary"
}
```

#### GET /records (VIEWER, ANALYST, ADMIN)

Supports query parameters:

- `page` (default: `1`)
- `limit` (default: `10`, max: `100`)
- `type` (`INCOME` or `EXPENSE`)
- `category`
- `startDate`
- `endDate`
- `minAmount`
- `maxAmount`
- `search`

Search behavior (`search`):

- category match
- notes match
- owner name match

Example:

`GET /records?search=admin&limit=8&page=1`

#### GET /records/:id (VIEWER, ANALYST, ADMIN)

Returns a record by id.
VIEWER can access only own records.

#### PUT /records/:id (VIEWER, ADMIN)

Updates a record.
VIEWER can update only own records.

#### DELETE /records/:id (VIEWER, ADMIN)

Deletes a record.
VIEWER can delete only own records.

### 6.4 Dashboard (Authenticated)

#### GET /dashboard/summary

Query params:

- `scope=self` (default)
- `scope=overall` (ANALYST/ADMIN)
- `scope=user&userId=<id>` (ANALYST/ADMIN)

Response includes:

- `totalIncome`
- `totalExpense`
- `netBalance`
- `categoryTotals`
- `recentActivity`
- `monthlyTrend`
- `weeklyTrend`

#### GET /dashboard/users (ANALYST, ADMIN)

Returns users list for summary user selection.

## 7. Error Response Format

Typical error body:

```json
{
  "message": "Error message"
}
```

Common status codes:

- `400` validation errors
- `401` unauthenticated or invalid token
- `403` forbidden by role/status
- `404` resource not found
- `409` conflict (for example duplicate email)
- `500` internal/server errors

## 8. Minimal Frontend Note

Frontend should call this backend using:

- `REACT_APP_API_URL=https://finance-lac-seven.vercel.app`

No additional frontend setup is required for API review.

## 9. Submission Checklist

Before submission, verify:

1. `GET /health` returns status ok
2. Swagger is reachable at `/api-docs`
3. All three sample accounts can log in
4. Role restrictions are enforced correctly
5. Record search by owner name works
6. Dashboard scope behavior (`self/overall/user`) works as expected
