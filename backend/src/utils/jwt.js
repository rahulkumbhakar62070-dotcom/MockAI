import jwt from 'jsonwebtoken';

/**
 * Helper to get the JWT secret from environment variables.
 * Throws a clear error if missing to prevent generating insecure tokens.
 */
export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error('Security Error: JWT_SECRET is not defined in environment variables.');
  }
  return secret;
};

/**
 * Generate a signed JSON Web Token (JWT) containing the user ID.
 * @param {string} userId - MongoDB _id of the authenticated user
 * @returns {string} - Signed JWT string
 */
export const generateToken = (userId) => {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign({ userId }, secret, { expiresIn });
};

/**
 * Verify a JWT string against the secret key.
 * @param {string} token - The JWT string to verify
 * @returns {object} - Decoded token payload containing userId
 */
export const verifyToken = (token) => {
  const secret = getJwtSecret();
  return jwt.verify(token, secret);
};
