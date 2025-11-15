// ID generation utilities for Ad Infinitum

/**
 * Generate a unique ID with a prefix
 * Format: {prefix}_{timestamp}_{random}
 * Examples: pc_1731686400000_a3f9, ad_1731686400000_b2c1, exp_1731686400000_d4e2
 */
export function generateId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Generate a product concept ID
 */
export function generateProductId(): string {
  return generateId('pc');
}

/**
 * Generate an experiment ID
 */
export function generateExperimentId(): string {
  return generateId('exp');
}

/**
 * Generate an ad variant ID
 */
export function generateAdId(): string {
  return generateId('ad');
}

/**
 * Generate a metrics snapshot ID
 */
export function generateMetricsId(): string {
  return generateId('ams');
}

/**
 * Generate a lead ID
 */
export function generateLeadId(): string {
  return generateId('lead');
}

/**
 * Generate a user profile ID
 */
export function generateUserId(): string {
  return generateId('usr');
}

/**
 * Generate a landing page ID
 */
export function generateLandingPageId(): string {
  return generateId('lp');
}

/**
 * Generate a build contract ID
 */
export function generateBuildId(): string {
  return generateId('build');
}

/**
 * Extract prefix from an ID
 */
export function getIdPrefix(id: string): string | null {
  const parts = id.split('_');
  return parts.length >= 3 ? parts[0] : null;
}

/**
 * Validate ID format
 */
export function isValidId(id: string, expectedPrefix?: string): boolean {
  const parts = id.split('_');

  if (parts.length !== 3) {
    return false;
  }

  const [prefix, timestamp, random] = parts;

  // Check prefix if specified
  if (expectedPrefix && prefix !== expectedPrefix) {
    return false;
  }

  // Check timestamp is a valid number
  if (isNaN(Number(timestamp))) {
    return false;
  }

  // Check random part exists and is alphanumeric
  if (!random || !/^[a-z0-9]+$/.test(random)) {
    return false;
  }

  return true;
}
