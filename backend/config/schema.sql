-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tada_forms table
CREATE TABLE IF NOT EXISTS tada_forms (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  designation VARCHAR(255),
  project VARCHAR(255),
  journey_purpose TEXT,
  date_from DATE,
  date_to DATE,
  time_from TIME,
  time_to TIME,
  total_amount DECIMAL(12, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tada_expenses table
CREATE TABLE IF NOT EXISTS tada_expenses (
  id SERIAL PRIMARY KEY,
  tada_id INTEGER NOT NULL REFERENCES tada_forms(id) ON DELETE CASCADE,
  date DATE,
  place_from VARCHAR(255),
  place_to VARCHAR(255),
  mode VARCHAR(50),
  fare DECIMAL(10, 2) DEFAULT 0,
  accommodation DECIMAL(10, 2) DEFAULT 0,
  conveyance DECIMAL(10, 2) DEFAULT 0,
  da DECIMAL(10, 2) DEFAULT 0,
  phone DECIMAL(10, 2) DEFAULT 0,
  internet DECIMAL(10, 2) DEFAULT 0,
  guest_entertainment DECIMAL(10, 2) DEFAULT 0,
  others DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create bank_details table
CREATE TABLE IF NOT EXISTS bank_details (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_name VARCHAR(255),
  bank_name VARCHAR(255),
  account_number VARCHAR(50),
  ifsc_code VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create uploads table
CREATE TABLE IF NOT EXISTS uploads (
  id SERIAL PRIMARY KEY,
  tada_id INTEGER NOT NULL REFERENCES tada_forms(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tada_forms_user_id ON tada_forms(user_id);
CREATE INDEX IF NOT EXISTS idx_tada_expenses_tada_id ON tada_expenses(tada_id);
CREATE INDEX IF NOT EXISTS idx_uploads_tada_id ON uploads(tada_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
