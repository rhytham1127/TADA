#!/bin/bash

echo "=========================================="
echo "TADA Management System - Setup Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js v14+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed. Please install npm${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm found: $(npm --version)${NC}"

if ! command -v psql &> /dev/null; then
    echo -e "${RED}PostgreSQL is not installed. Please install PostgreSQL v12+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ PostgreSQL found: $(psql --version)${NC}"

echo ""
echo -e "${YELLOW}Setting up Backend...${NC}"

# Backend setup
cd backend

if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from .env.example${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created. Please update with your database credentials.${NC}"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

echo "Installing backend dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install backend dependencies${NC}"
    exit 1
fi

cd ..

echo ""
echo -e "${YELLOW}Setting up Frontend...${NC}"

# Frontend setup
cd frontend

if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file${NC}"
    echo "REACT_APP_API_BASE_URL=http://localhost:5000/api" > .env
    echo -e "${GREEN}✓ .env file created${NC}"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

echo "Installing frontend dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install frontend dependencies${NC}"
    exit 1
fi

cd ..

echo ""
echo -e "${GREEN}=========================================="
echo "Setup Complete! ✓"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Update backend/.env with your PostgreSQL credentials"
echo "2. Create PostgreSQL database: createdb tada_db"
echo "3. Run schema: psql -U postgres -d tada_db -f backend/config/schema.sql"
echo "4. Start backend: cd backend && npm run dev"
echo "5. Start frontend: cd frontend && npm start"
echo ""
