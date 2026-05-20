# TADA Backend API Documentation

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Setup Database
```bash
# Create PostgreSQL database
createdb tada_db

# Run schema
psql -U postgres -d tada_db -f config/schema.sql
```

### 3. Configure Environment
Copy `.env.example` to `.env` and update values:
```bash
cp .env.example .env
```

### 4. Start Server
```bash
npm run dev
```

## API Endpoints

### Authentication
- **POST /api/auth/register** - Register new user
- **POST /api/auth/login** - Login user
- **GET /api/auth/profile** - Get user profile (protected)

### TADA Forms
- **POST /api/tada** - Create new TADA form (protected)
- **GET /api/tada** - Get all TADA forms (protected)
- **GET /api/tada/:id** - Get specific TADA form (protected)
- **PUT /api/tada/:id** - Update TADA form (protected)
- **DELETE /api/tada/:id** - Delete TADA form (protected)

### Expenses
- **POST /api/tada/:tadaId/expenses** - Add expense (protected)
- **PUT /api/tada/:tadaId/expenses/:expenseId** - Update expense (protected)
- **DELETE /api/tada/:tadaId/expenses/:expenseId** - Delete expense (protected)

### Bank Details
- **POST /api/bank** - Save bank details (protected)
- **GET /api/bank** - Get bank details (protected)

### File Upload
- **POST /api/upload/:tadaId** - Upload files (protected)
- **GET /api/upload/:tadaId** - Get uploaded files (protected)
- **DELETE /api/upload/:fileId** - Delete file (protected)
- **GET /api/upload/download/:fileId** - Download file (protected)

## Request/Response Examples

### Register
**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Login
**Request:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Create TADA Form
**Request:**
```json
{
  "designation": "Manager",
  "project": "Project Alpha",
  "journey_purpose": "Client Meeting",
  "date_from": "2026-05-15",
  "date_to": "2026-05-17",
  "time_from": "09:00:00",
  "time_to": "17:00:00",
  "status": "draft"
}
```

**Response:**
```json
{
  "message": "TADA form created successfully",
  "tadaForm": {
    "id": 1,
    "user_id": 1,
    "designation": "Manager",
    "project": "Project Alpha",
    "journey_purpose": "Client Meeting",
    "date_from": "2026-05-15",
    "date_to": "2026-05-17",
    "total_amount": "0.00",
    "status": "draft",
    "created_at": "2026-05-13T10:00:00.000Z"
  }
}
```
