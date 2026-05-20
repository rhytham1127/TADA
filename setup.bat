@echo off

echo ==========================================
echo TADA Management System - Setup Script
echo ==========================================
echo.

REM Colors not available in batch, using simple output
echo Checking prerequisites...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js is not installed. Please install Node.js v14+
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js found: %NODE_VERSION%

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo npm is not installed. Please install npm
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] npm found: %NPM_VERSION%

where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo PostgreSQL is not installed. Please install PostgreSQL v12+
    exit /b 1
)
echo [OK] PostgreSQL found

echo.
echo Setting up Backend...

cd backend

if not exist .env (
    echo Creating .env file from .env.example
    copy .env.example .env
    echo [OK] .env file created. Please update with your database credentials.
) else (
    echo [OK] .env file exists
)

echo Installing backend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install backend dependencies
    exit /b 1
)
echo [OK] Backend dependencies installed

cd ..

echo.
echo Setting up Frontend...

cd frontend

if not exist .env (
    echo Creating .env file
    (
        echo REACT_APP_API_BASE_URL=http://localhost:5000/api
    ) > .env
    echo [OK] .env file created
) else (
    echo [OK] .env file exists
)

echo Installing frontend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install frontend dependencies
    exit /b 1
)
echo [OK] Frontend dependencies installed

cd ..

echo.
echo ==========================================
echo Setup Complete!
echo ==========================================
echo.
echo Next steps:
echo 1. Update backend\.env with your PostgreSQL credentials
echo 2. Create PostgreSQL database: createdb tada_db
echo 3. Run schema: psql -U postgres -d tada_db -f backend/config/schema.sql
echo 4. Start backend: cd backend ^&^& npm run dev
echo 5. Start frontend: cd frontend ^&^& npm start
echo.
pause
