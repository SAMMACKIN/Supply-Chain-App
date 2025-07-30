import { UserRole } from '@prisma/client';
import {
  mapClerkRoleToUserRole,
  extractBusinessUnit,
  extractWarehouseIds,
  isValidRole,
  createDefaultUserProfile,
  type ClerkUserMetadata,
} from '../role-mapping';

describe('role-mapping utils', () => {
  // Mock console.warn
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('mapClerkRoleToUserRole', () => {
    describe('Positive scenarios', () => {
      it('should map admin role correctly', () => {
        expect(mapClerkRoleToUserRole('admin')).toBe(UserRole.ADMIN);
        expect(mapClerkRoleToUserRole('Admin')).toBe(UserRole.ADMIN);
        expect(mapClerkRoleToUserRole('ADMIN')).toBe(UserRole.ADMIN);
        expect(mapClerkRoleToUserRole(' admin ')).toBe(UserRole.ADMIN);
      });

      it('should map ops/operations role correctly', () => {
        expect(mapClerkRoleToUserRole('ops')).toBe(UserRole.OPS);
        expect(mapClerkRoleToUserRole('OPS')).toBe(UserRole.OPS);
        expect(mapClerkRoleToUserRole('operations')).toBe(UserRole.OPS);
        expect(mapClerkRoleToUserRole('Operations')).toBe(UserRole.OPS);
        expect(mapClerkRoleToUserRole(' ops ')).toBe(UserRole.OPS);
      });

      it('should map trade/trader/planner roles to OPS', () => {
        expect(mapClerkRoleToUserRole('trade')).toBe(UserRole.OPS);
        expect(mapClerkRoleToUserRole('Trade')).toBe(UserRole.OPS);
        expect(mapClerkRoleToUserRole('trader')).toBe(UserRole.OPS);
        expect(mapClerkRoleToUserRole('Trader')).toBe(UserRole.OPS);
        expect(mapClerkRoleToUserRole('planner')).toBe(UserRole.OPS);
        expect(mapClerkRoleToUserRole('Planner')).toBe(UserRole.OPS);
      });

      it('should map read-only variations correctly', () => {
        expect(mapClerkRoleToUserRole('read_only')).toBe(UserRole.READ_ONLY);
        expect(mapClerkRoleToUserRole('READ_ONLY')).toBe(UserRole.READ_ONLY);
        expect(mapClerkRoleToUserRole('readonly')).toBe(UserRole.READ_ONLY);
        expect(mapClerkRoleToUserRole('ReadOnly')).toBe(UserRole.READ_ONLY);
        expect(mapClerkRoleToUserRole('viewer')).toBe(UserRole.READ_ONLY);
        expect(mapClerkRoleToUserRole('Viewer')).toBe(UserRole.READ_ONLY);
        expect(mapClerkRoleToUserRole(' viewer ')).toBe(UserRole.READ_ONLY);
      });
    });

    describe('Negative scenarios', () => {
      it('should default to READ_ONLY for undefined role', () => {
        expect(mapClerkRoleToUserRole(undefined)).toBe(UserRole.READ_ONLY);
        expect(mapClerkRoleToUserRole()).toBe(UserRole.READ_ONLY);
      });

      it('should default to READ_ONLY for empty string', () => {
        expect(mapClerkRoleToUserRole('')).toBe(UserRole.READ_ONLY);
        expect(mapClerkRoleToUserRole('  ')).toBe(UserRole.READ_ONLY);
      });

      it('should default to READ_ONLY for unknown roles and warn', () => {
        expect(mapClerkRoleToUserRole('superuser')).toBe(UserRole.READ_ONLY);
        expect(console.warn).toHaveBeenCalledWith(
          'Unknown Clerk role: superuser, defaulting to READ-only'
        );

        expect(mapClerkRoleToUserRole('guest')).toBe(UserRole.READ_ONLY);
        expect(console.warn).toHaveBeenCalledWith(
          'Unknown Clerk role: guest, defaulting to READ-only'
        );
      });
    });

    describe('Edge cases', () => {
      it('should handle roles with special characters', () => {
        expect(mapClerkRoleToUserRole('admin!')).toBe(UserRole.READ_ONLY);
        expect(mapClerkRoleToUserRole('ops@123')).toBe(UserRole.READ_ONLY);
        expect(mapClerkRoleToUserRole('read-only')).toBe(UserRole.READ_ONLY);
        expect(console.warn).toHaveBeenCalledTimes(3);
      });

      it('should handle roles with mixed spacing', () => {
        expect(mapClerkRoleToUserRole('  admin  ')).toBe(UserRole.ADMIN);
        expect(mapClerkRoleToUserRole('\tadmin\t')).toBe(UserRole.ADMIN);
        expect(mapClerkRoleToUserRole('\nadmin\n')).toBe(UserRole.ADMIN);
      });

      it('should handle very long role strings', () => {
        const longRole = 'a'.repeat(1000);
        expect(mapClerkRoleToUserRole(longRole)).toBe(UserRole.READ_ONLY);
        expect(console.warn).toHaveBeenCalled();
      });

      it('should handle roles with unicode characters', () => {
        expect(mapClerkRoleToUserRole('admin😊')).toBe(UserRole.READ_ONLY);
        expect(mapClerkRoleToUserRole('管理者')).toBe(UserRole.READ_ONLY);
        expect(console.warn).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('extractBusinessUnit', () => {
    describe('Positive scenarios', () => {
      it('should extract business unit from metadata', () => {
        const metadata: ClerkUserMetadata = {
          businessUnit: 'BU123',
        };
        expect(extractBusinessUnit(metadata)).toBe('BU123');
      });

      it('should return business unit with other metadata present', () => {
        const metadata: ClerkUserMetadata = {
          role: 'admin',
          businessUnit: 'BU456',
          warehouseIds: ['WH001'],
        };
        expect(extractBusinessUnit(metadata)).toBe('BU456');
      });
    });

    describe('Negative scenarios', () => {
      it('should return default BU001 when metadata is undefined', () => {
        expect(extractBusinessUnit(undefined)).toBe('BU001');
        expect(extractBusinessUnit()).toBe('BU001');
      });

      it('should return default BU001 when businessUnit is missing', () => {
        const metadata: ClerkUserMetadata = {
          role: 'admin',
          warehouseIds: ['WH001'],
        };
        expect(extractBusinessUnit(metadata)).toBe('BU001');
      });

      it('should return default BU001 for empty object', () => {
        expect(extractBusinessUnit({})).toBe('BU001');
      });
    });

    describe('Edge cases', () => {
      it('should handle empty string business unit', () => {
        const metadata: ClerkUserMetadata = {
          businessUnit: '',
        };
        expect(extractBusinessUnit(metadata)).toBe('BU001');
      });

      it('should handle whitespace-only business unit', () => {
        const metadata: ClerkUserMetadata = {
          businessUnit: '   ',
        };
        expect(extractBusinessUnit(metadata)).toBe('   ');
      });

      it('should handle special characters in business unit', () => {
        const metadata: ClerkUserMetadata = {
          businessUnit: 'BU@#$%',
        };
        expect(extractBusinessUnit(metadata)).toBe('BU@#$%');
      });
    });
  });

  describe('extractWarehouseIds', () => {
    describe('Positive scenarios', () => {
      it('should extract warehouse IDs from metadata', () => {
        const metadata: ClerkUserMetadata = {
          warehouseIds: ['WH001', 'WH002', 'WH003'],
        };
        expect(extractWarehouseIds(metadata)).toEqual(['WH001', 'WH002', 'WH003']);
      });

      it('should return single warehouse ID', () => {
        const metadata: ClerkUserMetadata = {
          warehouseIds: ['WH001'],
        };
        expect(extractWarehouseIds(metadata)).toEqual(['WH001']);
      });

      it('should return empty array when specified', () => {
        const metadata: ClerkUserMetadata = {
          warehouseIds: [],
        };
        expect(extractWarehouseIds(metadata)).toEqual([]);
      });
    });

    describe('Negative scenarios', () => {
      it('should return empty array when metadata is undefined', () => {
        expect(extractWarehouseIds(undefined)).toEqual([]);
        expect(extractWarehouseIds()).toEqual([]);
      });

      it('should return empty array when warehouseIds is missing', () => {
        const metadata: ClerkUserMetadata = {
          role: 'admin',
          businessUnit: 'BU001',
        };
        expect(extractWarehouseIds(metadata)).toEqual([]);
      });

      it('should return empty array for empty object', () => {
        expect(extractWarehouseIds({})).toEqual([]);
      });
    });

    describe('Edge cases', () => {
      it('should handle warehouse IDs with special characters', () => {
        const metadata: ClerkUserMetadata = {
          warehouseIds: ['WH-001', 'WH_002', 'WH.003', 'WH@004'],
        };
        expect(extractWarehouseIds(metadata)).toEqual(['WH-001', 'WH_002', 'WH.003', 'WH@004']);
      });

      it('should preserve duplicate warehouse IDs', () => {
        const metadata: ClerkUserMetadata = {
          warehouseIds: ['WH001', 'WH001', 'WH002'],
        };
        expect(extractWarehouseIds(metadata)).toEqual(['WH001', 'WH001', 'WH002']);
      });

      it('should handle empty string warehouse IDs', () => {
        const metadata: ClerkUserMetadata = {
          warehouseIds: ['', 'WH001', ''],
        };
        expect(extractWarehouseIds(metadata)).toEqual(['', 'WH001', '']);
      });
    });
  });

  describe('isValidRole', () => {
    describe('Positive scenarios', () => {
      it('should validate all valid roles', () => {
        const validRoles = [
          'admin',
          'ops',
          'operations',
          'trade',
          'trader',
          'planner',
          'read_only',
          'readonly',
          'viewer',
        ];

        validRoles.forEach(role => {
          expect(isValidRole(role)).toBe(true);
        });
      });

      it('should validate roles case-insensitively', () => {
        expect(isValidRole('ADMIN')).toBe(true);
        expect(isValidRole('Admin')).toBe(true);
        expect(isValidRole('OPS')).toBe(true);
        expect(isValidRole('Viewer')).toBe(true);
        expect(isValidRole('READ_ONLY')).toBe(true);
      });

      it('should validate roles with surrounding whitespace', () => {
        expect(isValidRole(' admin ')).toBe(true);
        expect(isValidRole('\tops\t')).toBe(true);
        expect(isValidRole('\nviewer\n')).toBe(true);
      });
    });

    describe('Negative scenarios', () => {
      it('should reject invalid roles', () => {
        expect(isValidRole('superuser')).toBe(false);
        expect(isValidRole('guest')).toBe(false);
        expect(isValidRole('moderator')).toBe(false);
        expect(isValidRole('user')).toBe(false);
      });

      it('should reject empty or whitespace-only strings', () => {
        expect(isValidRole('')).toBe(false);
        expect(isValidRole(' ')).toBe(false);
        expect(isValidRole('\t')).toBe(false);
        expect(isValidRole('\n')).toBe(false);
      });

      it('should reject roles with special characters', () => {
        expect(isValidRole('admin!')).toBe(false);
        expect(isValidRole('ops@123')).toBe(false);
        expect(isValidRole('read-only')).toBe(false);
        expect(isValidRole('admin.user')).toBe(false);
      });
    });

    describe('Edge cases', () => {
      it('should handle roles with partial matches', () => {
        expect(isValidRole('administrator')).toBe(false);
        expect(isValidRole('opsmanager')).toBe(false);
        expect(isValidRole('readonly_user')).toBe(false);
      });

      it('should handle very long strings', () => {
        const longString = 'admin' + 'x'.repeat(1000);
        expect(isValidRole(longString)).toBe(false);
      });

      it('should handle unicode characters', () => {
        expect(isValidRole('管理者')).toBe(false);
        expect(isValidRole('admin😊')).toBe(false);
      });

      it('should handle null or undefined gracefully', () => {
        // TypeScript would normally prevent this, but testing runtime behavior
        expect(isValidRole(null as any)).toBe(false);
        expect(isValidRole(undefined as any)).toBe(false);
      });
    });
  });

  describe('createDefaultUserProfile', () => {
    describe('Positive scenarios', () => {
      it('should create profile with complete metadata', () => {
        const metadata: ClerkUserMetadata = {
          role: 'ops',
          businessUnit: 'BU123',
          warehouseIds: ['WH001', 'WH002'],
        };

        const profile = createDefaultUserProfile('user_123', metadata);

        expect(profile).toEqual({
          user_id: 'user_123',
          role: UserRole.OPS,
          business_unit: 'BU123',
          warehouse_ids: ['WH001', 'WH002'],
        });
      });

      it('should create admin profile', () => {
        const metadata: ClerkUserMetadata = {
          role: 'admin',
          businessUnit: 'BU_ADMIN',
          warehouseIds: ['WH_ALL'],
        };

        const profile = createDefaultUserProfile('admin_user', metadata);

        expect(profile).toEqual({
          user_id: 'admin_user',
          role: UserRole.ADMIN,
          business_unit: 'BU_ADMIN',
          warehouse_ids: ['WH_ALL'],
        });
      });

      it('should create read-only profile', () => {
        const metadata: ClerkUserMetadata = {
          role: 'viewer',
          businessUnit: 'BU_VIEW',
          warehouseIds: [],
        };

        const profile = createDefaultUserProfile('viewer_user', metadata);

        expect(profile).toEqual({
          user_id: 'viewer_user',
          role: UserRole.READ_ONLY,
          business_unit: 'BU_VIEW',
          warehouse_ids: [],
        });
      });
    });

    describe('Negative scenarios', () => {
      it('should create profile with defaults when metadata is undefined', () => {
        const profile = createDefaultUserProfile('user_123', undefined);

        expect(profile).toEqual({
          user_id: 'user_123',
          role: UserRole.READ_ONLY,
          business_unit: 'BU001',
          warehouse_ids: [],
        });
      });

      it('should create profile with defaults when metadata is empty', () => {
        const profile = createDefaultUserProfile('user_123', {});

        expect(profile).toEqual({
          user_id: 'user_123',
          role: UserRole.READ_ONLY,
          business_unit: 'BU001',
          warehouse_ids: [],
        });
      });

      it('should handle invalid role in metadata', () => {
        const metadata: ClerkUserMetadata = {
          role: 'invalid_role',
          businessUnit: 'BU123',
          warehouseIds: ['WH001'],
        };

        const profile = createDefaultUserProfile('user_123', metadata);

        expect(profile).toEqual({
          user_id: 'user_123',
          role: UserRole.READ_ONLY,
          business_unit: 'BU123',
          warehouse_ids: ['WH001'],
        });
        expect(console.warn).toHaveBeenCalledWith(
          'Unknown Clerk role: invalid_role, defaulting to READ-only'
        );
      });
    });

    describe('Edge cases', () => {
      it('should handle empty userId', () => {
        const metadata: ClerkUserMetadata = {
          role: 'ops',
          businessUnit: 'BU123',
          warehouseIds: ['WH001'],
        };

        const profile = createDefaultUserProfile('', metadata);

        expect(profile.user_id).toBe('');
      });

      it('should handle very long userId', () => {
        const longUserId = 'user_' + 'x'.repeat(1000);
        const profile = createDefaultUserProfile(longUserId, {});

        expect(profile.user_id).toBe(longUserId);
      });

      it('should handle metadata with partial data', () => {
        const metadata: ClerkUserMetadata = {
          role: 'ops',
          // Missing businessUnit and warehouseIds
        };

        const profile = createDefaultUserProfile('user_123', metadata);

        expect(profile).toEqual({
          user_id: 'user_123',
          role: UserRole.OPS,
          business_unit: 'BU001',
          warehouse_ids: [],
        });
      });

      it('should handle metadata with null values', () => {
        const metadata: ClerkUserMetadata = {
          role: null as any,
          businessUnit: null as any,
          warehouseIds: null as any,
        };

        const profile = createDefaultUserProfile('user_123', metadata);

        expect(profile).toEqual({
          user_id: 'user_123',
          role: UserRole.READ_ONLY,
          business_unit: 'BU001',
          warehouse_ids: [],
        });
      });

      it('should preserve special characters in userId', () => {
        const specialUserId = 'user@#$%^&*()_+-={}[]|\\:";\'<>?,./';
        const profile = createDefaultUserProfile(specialUserId, {});

        expect(profile.user_id).toBe(specialUserId);
      });

      it('should handle trade and planner roles mapping to OPS', () => {
        const tradeProfile = createDefaultUserProfile('trader_123', {
          role: 'trade',
        });
        expect(tradeProfile.role).toBe(UserRole.OPS);

        const plannerProfile = createDefaultUserProfile('planner_123', {
          role: 'planner',
        });
        expect(plannerProfile.role).toBe(UserRole.OPS);
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete user profile creation flow', () => {
      const metadata: ClerkUserMetadata = {
        role: 'operations',
        businessUnit: 'BU_WEST',
        warehouseIds: ['WH_LA', 'WH_SF', 'WH_SEA'],
      };

      // Validate role first
      expect(isValidRole(metadata.role!)).toBe(true);

      // Extract individual components
      const role = mapClerkRoleToUserRole(metadata.role);
      const businessUnit = extractBusinessUnit(metadata);
      const warehouseIds = extractWarehouseIds(metadata);

      expect(role).toBe(UserRole.OPS);
      expect(businessUnit).toBe('BU_WEST');
      expect(warehouseIds).toEqual(['WH_LA', 'WH_SF', 'WH_SEA']);

      // Create profile
      const profile = createDefaultUserProfile('user_west_ops', metadata);

      expect(profile).toEqual({
        user_id: 'user_west_ops',
        role: UserRole.OPS,
        business_unit: 'BU_WEST',
        warehouse_ids: ['WH_LA', 'WH_SF', 'WH_SEA'],
      });
    });

    it('should handle invalid role with fallback', () => {
      const metadata: ClerkUserMetadata = {
        role: 'super_admin', // Invalid role
        businessUnit: 'BU_HQ',
        warehouseIds: ['WH_MAIN'],
      };

      // Validate role
      expect(isValidRole(metadata.role!)).toBe(false);

      // Create profile with fallback
      const profile = createDefaultUserProfile('user_invalid', metadata);

      expect(profile.role).toBe(UserRole.READ_ONLY);
      expect(console.warn).toHaveBeenCalledWith(
        'Unknown Clerk role: super_admin, defaulting to READ-only'
      );
    });
  });
});