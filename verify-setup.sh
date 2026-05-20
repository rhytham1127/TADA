#!/bin/bash
# TADA System - Verification Checklist Script

echo "🔍 TADA Management System - Implementation Verification"
echo "======================================================="
echo ""

# Check backend files
echo "✓ Backend Structure:"
backend_files=(
  "backend/db/schema.sql"
  "backend/server.js"
  "backend/package.json"
  "backend/controllers/authController.js"
  "backend/controllers/tadaController.js"
  "backend/controllers/bankController.js"
  "backend/controllers/uploadController.js"
  "backend/routes/auth.js"
  "backend/routes/tadaRoutes.js"
  "backend/routes/uploadRoutes.js"
  "backend/middleware/auth.js"
  "backend/utils/fileUpload.js"
)

for file in "${backend_files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (MISSING)"
  fi
done

echo ""
echo "✓ Frontend Structure:"
frontend_files=(
  "frontend/src/App.js"
  "frontend/src/utils/api.js"
  "frontend/src/context/AuthContext.js"
  "frontend/src/pages/Login.js"
  "frontend/src/pages/Register.js"
  "frontend/src/pages/Dashboard.js"
  "frontend/src/pages/NewClaim.js"
  "frontend/src/pages/BankDetails.js"
  "frontend/src/components/Layout.js"
  "frontend/package.json"
)

for file in "${frontend_files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (MISSING)"
  fi
done

echo ""
echo "======================================================="
echo "Next Steps:"
echo "1. Configure PostgreSQL database"
echo "2. Create .env files (backend and frontend)"
echo "3. Run: cd backend && npm install && npm run dev"
echo "4. Run: cd frontend && npm install && npm start"
echo "======================================================="
