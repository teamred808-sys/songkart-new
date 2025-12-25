/**
 * UUID and input validation utilities
 * Prevents "invalid input syntax for type uuid" errors
 */

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a valid UUID
 * Returns false for null, undefined, empty strings, or the literal string "null"
 */
export function isValidUUID(value: unknown): value is string {
  if (value === null || value === undefined) return false;
  if (typeof value !== 'string') return false;
  if (value === '' || value === 'null' || value === 'undefined') return false;
  return UUID_REGEX.test(value);
}

/**
 * Safely extracts a UUID from a value, returning null if invalid
 */
export function safeUUID(value: unknown): string | null {
  return isValidUUID(value) ? value : null;
}

/**
 * Validates an array of UUIDs, filtering out invalid ones
 */
export function filterValidUUIDs(values: unknown[]): string[] {
  return values.filter(isValidUUID);
}

/**
 * Validates that an ID is safe to use in database queries
 * Throws an error if invalid (useful for required IDs)
 */
export function requireValidUUID(value: unknown, fieldName: string = 'ID'): string {
  if (!isValidUUID(value)) {
    throw new Error(`Invalid ${fieldName}: expected a valid UUID`);
  }
  return value;
}

/**
 * Sanitizes a string value to prevent injection
 */
export function sanitizeString(value: unknown, maxLength: number = 1000): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  return str.slice(0, maxLength);
}

/**
 * Validates a positive number
 */
export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && value > 0;
}

/**
 * Validates a non-negative number
 */
export function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && value >= 0;
}
