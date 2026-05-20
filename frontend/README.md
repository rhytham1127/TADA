# TADA Management System - Frontend

A React-based frontend for the TADA (Travel Allowance & Daily Allowance) Management System.

## Features

- User authentication (Login/Register)
- Dashboard with TADA form management
- Dynamic expense tracking with auto-calculation
- Bank details management
- File upload for receipts and tickets
- Print-friendly interface
- Responsive design

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update `.env` with your backend API URL:
```
REACT_APP_API_BASE_URL=http://localhost:5000/api
```

## Running the Application

### Development Mode
```bash
npm start
```

The application will open at [http://localhost:3000](http://localhost:3000)

### Production Build
```bash
npm run build
```

## Project Structure

```
src/
├── components/        # Reusable React components
│   └── Header.js
├── pages/            # Page components
│   ├── Login.js
│   ├── Register.js
│   ├── Dashboard.js
│   └── TADAForm.js
├── context/          # React Context for state management
│   └── AuthContext.js
├── utils/            # Utility functions and API client
│   ├── api.js
│   └── ProtectedRoute.js
├── App.js            # Main app component
├── App.css           # Global styles
└── index.js          # React entry point
```

## Key Features

### 1. Authentication
- User Registration with email validation
- Login with JWT token
- Protected routes for authenticated users

### 2. Dashboard
- View all TADA forms
- Filter by status (Draft, Submitted)
- Create, edit, or delete forms
- Quick action buttons

### 3. TADA Form
- **Employee Details**: Name, Designation, Project, Journey Purpose
- **Tour Details**: Date range and time
- **Expense Tracking**: Dynamic table with auto-calculation
- **Bank Details**: Account information
- **File Uploads**: Attach receipts and tickets
- **Status Management**: Save as draft or submit

### 4. Auto-Calculation
- Row totals: Sum of all expense columns
- Grand total: Sum of all row totals
- Real-time updates as you type

## Components

### Header
Navigation bar with user profile and logout functionality

### Login/Register
Authentication pages with form validation

### Dashboard
Lists all TADA forms with filtering and actions

### TADAForm
Main form component with sections for:
- Employee details
- Tour details
- Dynamic expense table
- Bank information
- File attachments

## API Integration

All API calls are handled through `utils/api.js` with axios interceptors for JWT token management.

### Available API Methods:
- Authentication: register, login, getProfile
- TADA Forms: createForm, getForms, getFormById, updateForm, deleteForm
- Expenses: addExpense, updateExpense, deleteExpense
- Bank: saveBankDetails, getBankDetails
- Files: uploadFiles, getFiles, deleteFile

## Styling

Built with **Tailwind CSS** for responsive and modern UI design.

## Deployment

### Vercel Deployment
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables
4. Deploy

### Netlify Deployment
1. Build the project: `npm run build`
2. Deploy the `build` folder to Netlify

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### Issue: CORS errors when calling backend
- Ensure backend is running on `http://localhost:5000`
- Check CORS configuration in backend server.js
- Verify API_BASE_URL in .env matches backend URL

### Issue: Files not uploading
- Ensure backend uploads directory exists
- Check file size limit (default 5MB)
- Verify file type (PDF, JPG, PNG only)

## License

MIT
