# TADA – Travel & Daily Allowance Portal

A full-stack web application for managing employee travel allowance (TADA) claims.

## Tech Stack
- **Frontend**: React 18, React Router v6, Axios
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Auth**: JWT (JSON Web Tokens)
- **File Upload**: Multer

## Features
- Employee registration & login/logout
- Submit TADA claims with trip details
- Add multiple expense line items (auto-calculates total)
- Upload PDF/image bills and tickets
- Save bank account details for reimbursement
- View all submitted claims with status tracking
- Responsive design for mobile & desktop

## Project Structure
```
tada-app/
├── backend/
│   ├── db/
│   │   ├── index.js        # DB connection pool
│   │   └── schema.sql      # PostgreSQL schema
│   ├── middleware/
│   │   └── auth.js         # JWT middleware
│   ├── routes/
│   │   ├── auth.js         # Register, Login, Me
│   │   ├── claims.js       # CRUD for TADA claims
│   │   └── bank.js         # Bank details
│   ├── uploads/            # Uploaded files (auto-created)
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── public/
    ├── src/
    │   ├── components/
    │   │   └── Layout.js   # Sidebar + topbar
    │   ├── context/
    │   │   └── AuthContext.js
    │   ├── pages/
    │   │   ├── Login.js
    │   │   ├── Register.js
    │   │   ├── Dashboard.js
    │   │   ├── NewClaim.js
    │   │   ├── ClaimDetail.js
    │   │   └── BankDetails.js
    │   ├── App.js
    │   └── index.css
    └── package.json
```

## Setup Instructions

### 1. PostgreSQL Setup
```bash
# Create database
createdb tada_db

# Run schema
psql -d tada_db -f backend/db/schema.sql
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET
npm start
```

Your `.env` file:
```
PORT=5000
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/tada_db
JWT_SECRET=change_this_to_a_long_random_string
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```

Frontend runs on **http://localhost:3000**
Backend API runs on **http://localhost:5000**

The frontend proxies API calls to the backend automatically (configured in package.json).

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/register | Register new user | No |
| POST | /api/auth/login | Login | No |
| GET | /api/auth/me | Get current user | Yes |
| GET | /api/claims | Get user's claims | Yes |
| POST | /api/claims | Submit new claim | Yes |
| GET | /api/claims/:id | Get claim details | Yes |
| GET | /api/bank | Get bank details | Yes |
| POST | /api/bank | Save/update bank details | Yes |

## Deployment Notes
- For production, set `NODE_ENV=production` in the backend .env
- Set `FRONTEND_URL` to your actual frontend domain (for CORS)
- Ensure the `uploads/` directory is writable
- Consider using cloud storage (S3) for uploaded files in production
