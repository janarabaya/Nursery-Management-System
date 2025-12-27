/**
 * Environment Configuration
 * 
 * Loads and validates environment variables from .env file.
 * Exports typed configuration values for use throughout the application.
 */

const dotenv = require('dotenv');
const path = require('path');

// Load .env file from backend root
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Server configuration
const PORT = parseInt(process.env.PORT, 10) || 5000;
const ACCESS_DB_PORT = parseInt(process.env.ACCESS_DB_PORT, 10) || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_DEV = NODE_ENV === 'development';
const IS_PROD = NODE_ENV === 'production';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Database configuration
const ACCESS_DB_PATH = process.env.ACCESS_DB_PATH || '';

// CORS configuration
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Validate required configuration
function validateConfig() {
  const errors = [];
  
  if (!ACCESS_DB_PATH) {
    errors.push('ACCESS_DB_PATH is required in .env file');
  }
  
  if (IS_PROD && JWT_SECRET === 'default_secret_change_in_production') {
    errors.push('JWT_SECRET must be changed in production');
  }
  
  if (errors.length > 0) {
    console.error('Configuration Errors:');
    errors.forEach(err => console.error(`  - ${err}`));
    if (IS_PROD) {
      process.exit(1);
    }
  }
}

// Run validation on load
validateConfig();

module.exports = {
  PORT,
  ACCESS_DB_PORT,
  NODE_ENV,
  IS_DEV,
  IS_PROD,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  ACCESS_DB_PATH,
  FRONTEND_URL
};


