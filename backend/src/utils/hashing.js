/**
 * Password Hashing Utilities
 * 
 * Wrapper around bcrypt for password hashing and comparison.
 */

const bcrypt = require('bcrypt');

// Number of salt rounds for bcrypt
const SALT_ROUNDS = 10;

/**
 * Hash a plain text password
 * @param {string} plainPassword - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Compare a plain text password with a hash
 * @param {string} plainPassword - Plain text password
 * @param {string} hashedPassword - Hashed password to compare against
 * @returns {Promise<boolean>} - True if passwords match
 */
async function comparePassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

module.exports = {
  hashPassword,
  comparePassword,
  SALT_ROUNDS
};


