-- Drop existing database if exists and create new one
DROP DATABASE IF EXISTS cloqr;
CREATE DATABASE cloqr;

-- Connect to the database
\c cloqr;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Run the schema
\i src/database/schema.sql;

-- Insert admin user (you'll need to register through the app first)
-- This is just a placeholder to show the structure

-- Insert sample campus QR codes for testing
INSERT INTO campus_qr_codes (campus_name, qr_code, is_active) VALUES
  ('University of Nairobi', 'sample_uon_qr_code_12345', true),
  ('Kenyatta University', 'sample_ku_qr_code_67890', true),
  ('Strathmore University', 'sample_su_qr_code_abcde', true);

-- Display created QR codes
SELECT campus_name, qr_code, created_at FROM campus_qr_codes;
