-- Trustek Database Setup Script
-- Run this in MySQL: mysql -u root -p < setup_database.sql
-- Or copy-paste into MySQL command line

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS trustek_db;

-- Switch to the database
USE trustek_db;

-- Verify database was created
SELECT 'Database trustek_db created successfully!' AS Status;

-- Show current user and host
SELECT USER(), CURRENT_USER();

-- Verify permissions
SHOW GRANTS FOR CURRENT_USER();

-- Show all databases (to verify trustek_db is there)
SHOW DATABASES;

-- Note: Tables will be created automatically by Hibernate/Spring Boot
-- Expected tables: users, analysis_history

