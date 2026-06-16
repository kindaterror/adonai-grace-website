/**
 * JWT Configuration
 * 
 * Centralized JWT secret handling with production safety
 */

// -----------------------------------------------------------------------------
// JWT Secret
// -----------------------------------------------------------------------------
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  
  // In production, JWT_SECRET must be set - no fallback allowed
  if (process.env.NODE_ENV === 'production') {
    if (!secret) {
      throw new Error("FATAL: JWT_SECRET environment variable is required in production!");
    }
    if (secret.length < 32) {
      throw new Error("FATAL: JWT_SECRET must be at least 32 characters in production!");
    }
    return secret;
  }
  
  // In development, allow fallback but warn heavily
  if (!secret) {
    console.warn("⚠️  JWT_SECRET not found in environment variables. Using insecure development fallback.");
    console.warn("⚠️  For production, please set a secure JWT_SECRET in your environment.");
    console.warn("⚠️  DO NOT use this fallback in production!");
    return "ilaw_ng_bayan_dev_secret_key_2024";
  }
  
  if (secret.length < 32) {
    console.warn("⚠️  JWT_SECRET is too short. Consider using a longer, more secure key.");
  }
  
  return secret;
}

export const JWT_SECRET = getJwtSecret();
