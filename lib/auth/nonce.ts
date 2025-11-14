import { randomBytes } from "crypto";

/**
 * Generate a secure random nonce string
 * @param length - Length of the nonce (default: 32 characters)
 * @returns A URL-safe base64-encoded nonce
 */
export function generateNonce(length: number = 32): string {
  const bytes = randomBytes(length);
  return bytes.toString("base64url");
}

/**
 * Validate nonce format
 */
export function isValidNonce(nonce: string): boolean {
  // Nonce should be base64url encoded, at least 16 characters
  return /^[A-Za-z0-9_-]{16,}$/.test(nonce);
}

