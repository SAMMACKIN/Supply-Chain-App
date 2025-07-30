import { UserRole } from '@prisma/client';

/**
 * Role mapping from Clerk metadata to database UserRole enum
 * This maps the role string from Clerk user metadata to our database enum
 */
export interface ClerkUserMetadata {
  role?: string;
  businessUnit?: string;
  warehouseIds?: string[];
}

/**
 * Maps Clerk role metadata to database UserRole enum
 * @param clerkRole - Role string from Clerk metadata
 * @returns UserRole enum value
 */
export function mapClerkRoleToUserRole(clerkRole?: string): UserRole {
  if (!clerkRole) {
    return UserRole.READ_ONLY; // Default role for users without explicit role
  }

  const normalizedRole = clerkRole.toLowerCase().trim();

  switch (normalizedRole) {
    case 'admin':
      return UserRole.ADMIN;
    case 'ops':
    case 'operations':
      return UserRole.OPS;
    case 'trade':
    case 'trader':
    case 'planner':
      // Note: Database only has ADMIN, OPS, READ_ONLY
      // Trade and Planner roles map to OPS for now
      return UserRole.OPS;
    case 'read_only':
    case 'readonly':
    case 'viewer':
      return UserRole.READ_ONLY;
    default:
      console.warn(`Unknown Clerk role: ${clerkRole}, defaulting to READ-only`);
      return UserRole.READ_ONLY;
  }
}

/**
 * Extracts business unit from Clerk metadata or provides default
 * @param metadata - Clerk user metadata
 * @returns Business unit string
 */
export function extractBusinessUnit(metadata?: ClerkUserMetadata): string {
  return metadata?.businessUnit || 'BU001'; // Default business unit
}

/**
 * Extracts warehouse IDs from Clerk metadata or provides default
 * @param metadata - Clerk user metadata
 * @returns Array of warehouse ID strings
 */
export function extractWarehouseIds(metadata?: ClerkUserMetadata): string[] {
  return metadata?.warehouseIds || []; // Default to empty array
}

/**
 * Validates if a role string is valid for our system
 * @param role - Role string to validate
 * @returns boolean indicating if role is valid
 */
export function isValidRole(role: string): boolean {
  if (!role || typeof role !== 'string') {
    return false;
  }
  const validRoles = ['admin', 'ops', 'operations', 'trade', 'trader', 'planner', 'read_only', 'readonly', 'viewer'];
  return validRoles.includes(role.toLowerCase().trim());
}

/**
 * Creates default user profile data from Clerk user information
 * @param userId - Clerk user ID
 * @param metadata - Clerk user metadata
 * @returns Default user profile data
 */
export function createDefaultUserProfile(userId: string, metadata?: ClerkUserMetadata) {
  return {
    user_id: userId,
    role: mapClerkRoleToUserRole(metadata?.role),
    business_unit: extractBusinessUnit(metadata),
    warehouse_ids: extractWarehouseIds(metadata),
  };
}