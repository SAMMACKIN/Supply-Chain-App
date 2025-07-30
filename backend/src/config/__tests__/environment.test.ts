// Remove unused imports - these will be dynamically required in tests

// Store original environment variables
const originalEnv = process.env;

// Mock console methods to prevent noise in test output
const originalConsoleError = console.error;

describe('Environment Configuration', () => {
  beforeEach(() => {
    // Reset modules to ensure fresh env parsing
    jest.resetModules();
    // Mock console.error to suppress expected error messages
    console.error = jest.fn();
  });

  afterEach(() => {
    // Restore original environment and console
    process.env = originalEnv;
    console.error = originalConsoleError;
  });

  describe('Valid Configuration', () => {
    it('should parse valid environment variables with all required fields', () => {
      // Set up valid environment
      process.env = {
        ...originalEnv,
        NODE_ENV: 'production',
        PORT: '3001',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/dbname',
        CLERK_SECRET_KEY: 'sk_test_1234567890abcdef',
        CLERK_PUBLISHABLE_KEY: 'pk_test_1234567890abcdef',
        FRONTEND_URL: 'https://example.com',
        API_SECRET_KEY: 'secret123',
        RATE_LIMIT_WINDOW_MS: '600000',
        RATE_LIMIT_MAX_REQUESTS: '50',
      };

      // Re-import to trigger parsing with new env
      const { env: parsedEnv } = require('../environment');

      expect(parsedEnv).toMatchObject({
        NODE_ENV: 'production',
        PORT: '3001',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/dbname',
        CLERK_SECRET_KEY: 'sk_test_1234567890abcdef',
        CLERK_PUBLISHABLE_KEY: 'pk_test_1234567890abcdef',
        FRONTEND_URL: 'https://example.com',
        API_SECRET_KEY: 'secret123',
        RATE_LIMIT_WINDOW_MS: 600000,
        RATE_LIMIT_MAX_REQUESTS: 50,
      });
    });

    it('should apply default values when optional fields are missing', () => {
      // Set up minimal valid environment
      process.env = {
        ...originalEnv,
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/dbname',
        CLERK_SECRET_KEY: 'sk_test_1234567890abcdef',
        CLERK_PUBLISHABLE_KEY: 'pk_test_1234567890abcdef',
      };

      // Re-import to trigger parsing
      const { env: parsedEnv } = require('../environment');

      expect(parsedEnv).toMatchObject({
        NODE_ENV: 'test', // In test environment, NODE_ENV is set to 'test'
        PORT: '3001', // default
        FRONTEND_URL: 'http://localhost:3000', // default
        RATE_LIMIT_WINDOW_MS: 900000, // default (15 minutes)
        RATE_LIMIT_MAX_REQUESTS: 100, // default
      });
      expect(parsedEnv.API_SECRET_KEY).toBeUndefined();
    });

    it('should handle all valid NODE_ENV values', () => {
      const validNodeEnvs = ['development', 'production', 'test'];

      validNodeEnvs.forEach((nodeEnv) => {
        jest.resetModules();
        process.env = {
          ...originalEnv,
          NODE_ENV: nodeEnv,
          DATABASE_URL: 'postgresql://user:pass@localhost:5432/dbname',
          CLERK_SECRET_KEY: 'sk_test_1234567890abcdef',
          CLERK_PUBLISHABLE_KEY: 'pk_test_1234567890abcdef',
        };

        const { env: parsedEnv } = require('../environment');
        expect(parsedEnv.NODE_ENV).toBe(nodeEnv);
      });
    });

    it('should transform string numbers to actual numbers', () => {
      process.env = {
        ...originalEnv,
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/dbname',
        CLERK_SECRET_KEY: 'sk_test_1234567890abcdef',
        CLERK_PUBLISHABLE_KEY: 'pk_test_1234567890abcdef',
        RATE_LIMIT_WINDOW_MS: '300000', // 5 minutes as string
        RATE_LIMIT_MAX_REQUESTS: '200', // as string
      };

      const { env: parsedEnv } = require('../environment');

      expect(parsedEnv.RATE_LIMIT_WINDOW_MS).toBe(300000);
      expect(parsedEnv.RATE_LIMIT_MAX_REQUESTS).toBe(200);
      expect(typeof parsedEnv.RATE_LIMIT_WINDOW_MS).toBe('number');
      expect(typeof parsedEnv.RATE_LIMIT_MAX_REQUESTS).toBe('number');
    });
  });

  describe('Missing Required Variables', () => {
    it('should throw error when DATABASE_URL is missing', () => {
      process.env = {
        ...originalEnv,
        CLERK_SECRET_KEY: 'sk_test_1234567890abcdef',
        CLERK_PUBLISHABLE_KEY: 'pk_test_1234567890abcdef',
        // DATABASE_URL missing
      };
      delete process.env.DATABASE_URL;

      expect(() => {
        require('../environment');
      }).toThrow('Invalid environment variables');

      expect(console.error).toHaveBeenCalledWith(
        '❌ Invalid environment variables:'
      );
    });

    it('should throw error when CLERK_SECRET_KEY is missing', () => {
      process.env = {
        ...originalEnv,
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/dbname',
        CLERK_PUBLISHABLE_KEY: 'pk_test_1234567890abcdef',
        // CLERK_SECRET_KEY missing
      };
      delete process.env.CLERK_SECRET_KEY;

      expect(() => {
        require('../environment');
      }).toThrow('Invalid environment variables');
    });

    it('should throw error when CLERK_PUBLISHABLE_KEY is missing', () => {
      process.env = {
        ...originalEnv,
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/dbname',
        CLERK_SECRET_KEY: 'sk_test_1234567890abcdef',
        // CLERK_PUBLISHABLE_KEY missing
      };
      delete process.env.CLERK_PUBLISHABLE_KEY;

      expect(() => {
        require('../environment');
      }).toThrow('Invalid environment variables');
    });

    it('should throw error when CLERK_SECRET_KEY is empty string', () => {
      process.env = {
        ...originalEnv,
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/dbname',
        CLERK_SECRET_KEY: '', // empty string
        CLERK_PUBLISHABLE_KEY: 'pk_test_1234567890abcdef',
      };

      expect(() => {
        require('../environment');
      }).toThrow('Invalid environment variables');
    });
  });

  describe('Invalid URL Formats', () => {
    it('should throw error for invalid DATABASE_URL format', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://invalid-protocol.com',
        'postgresql://', // missing host
        'postgresql://user@', // incomplete
        'postgresql://user:pass@:5432/db', // missing host
        '', // empty string
      ];

      invalidUrls.forEach((url) => {
        jest.resetModules();
        process.env = {
          NODE_ENV: 'test',
          DATABASE_URL: url,
          CLERK_SECRET_KEY: 'sk_test_1234567890abcdef',
          CLERK_PUBLISHABLE_KEY: 'pk_test_1234567890abcdef',
        };

        expect(() => {
          require('../environment');
        }).toThrow('Invalid environment variables');
      });
    });

    it('should throw error for invalid FRONTEND_URL format', () => {
      process.env = {
        ...originalEnv,
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/dbname',
        CLERK_SECRET_KEY: 'sk_test_1234567890abcdef',
        CLERK_PUBLISHABLE_KEY: 'pk_test_1234567890abcdef',
        FRONTEND_URL: 'not-a-valid-url',
      };

      expect(() => {
        require('../environment');
      }).toThrow('Invalid environment variables');
    });

    it('should accept valid URL formats', () => {
      const validUrls = [
        'https://example.com',
        'http://localhost:3000',
        'https://sub.domain.com:8080',
        'postgresql://user:pass@host:5432/db',
        'postgres://user:pass@host:5432/db',
        'mysql://user:pass@host:3306/db',
      ];

      validUrls.forEach((url) => {
        jest.resetModules();
        process.env = {
          ...originalEnv,
          DATABASE_URL: url,
          CLERK_SECRET_KEY: 'sk_test_1234567890abcdef',
          CLERK_PUBLISHABLE_KEY: 'pk_test_1234567890abcdef',
          FRONTEND_URL: url.startsWith('http') ? url : undefined,
        };

        expect(() => {
          require('../environment');
        }).not.toThrow();
      });
    });
  });

  describe('Invalid Enum Values', () => {
    it('should throw error for invalid NODE_ENV value', () => {
      const invalidNodeEnvs = ['staging', 'dev', 'prod', 'debug', ''];

      invalidNodeEnvs.forEach((nodeEnv) => {
        jest.resetModules();
        process.env = {
          ...originalEnv,
          NODE_ENV: nodeEnv,
          DATABASE_URL: 'postgresql://user:pass@localhost:5432/dbname',
          CLERK_SECRET_KEY: 'sk_test_1234567890abcdef',
          CLERK_PUBLISHABLE_KEY: 'pk_test_1234567890abcdef',
        };

        expect(() => {
          require('../environment');
        }).toThrow('Invalid environment variables');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle environment variables with special characters', () => {
      process.env = {
        ...originalEnv,
        DATABASE_URL: 'postgresql://user:p@$$w0rd!@localhost:5432/dbname',
        CLERK_SECRET_KEY: 'sk_test_$pecial#char@cters!',
        CLERK_PUBLISHABLE_KEY: 'pk_test_$pecial#char@cters!',
        API_SECRET_KEY: 'key_with_unicode_é_ñ_中文',
      };

      const { env: parsedEnv } = require('../environment');

      expect(parsedEnv.CLERK_SECRET_KEY).toBe('sk_test_$pecial#char@cters!');
      expect(parsedEnv.API_SECRET_KEY).toBe('key_with_unicode_é_ñ_中文');
    });

    it('should handle very large port numbers', () => {
      process.env = {
        ...originalEnv,
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/dbname',
        CLERK_SECRET_KEY: 'sk_test_1234567890abcdef',
        CLERK_PUBLISHABLE_KEY: 'pk_test_1234567890abcdef',
        PORT: '65535', // Max valid port
      };

      const { env: parsedEnv } = require('../environment');
      expect(parsedEnv.PORT).toBe('65535');
    });

    it('should handle rate limit values at boundaries', () => {
      process.env = {
        ...originalEnv,
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/dbname',
        CLERK_SECRET_KEY: 'sk_test_1234567890abcdef',
        CLERK_PUBLISHABLE_KEY: 'pk_test_1234567890abcdef',
        RATE_LIMIT_WINDOW_MS: '0',
        RATE_LIMIT_MAX_REQUESTS: '0',
      };

      const { env: parsedEnv } = require('../environment');
      expect(parsedEnv.RATE_LIMIT_WINDOW_MS).toBe(0);
      expect(parsedEnv.RATE_LIMIT_MAX_REQUESTS).toBe(0);
    });

    it('should handle non-numeric strings for numeric fields', () => {
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/dbname',
        CLERK_SECRET_KEY: 'sk_test_1234567890abcdef',
        CLERK_PUBLISHABLE_KEY: 'pk_test_1234567890abcdef',
        RATE_LIMIT_WINDOW_MS: 'not-a-number',
        RATE_LIMIT_MAX_REQUESTS: 'invalid',
      };

      expect(() => {
        require('../environment');
      }).toThrow('Invalid environment variables');
    });

    it('should handle environment variables with whitespace', () => {
      process.env = {
        ...originalEnv,
        DATABASE_URL: '  postgresql://user:pass@localhost:5432/dbname  ',
        CLERK_SECRET_KEY: '  sk_test_1234567890abcdef  ',
        CLERK_PUBLISHABLE_KEY: '  pk_test_1234567890abcdef  ',
        PORT: '  3001  ',
      };

      // Note: Zod's string validator will handle these as-is with whitespace
      // If trimming is desired, it should be added to the schema
      const { env: parsedEnv } = require('../environment');
      
      // The current implementation doesn't trim, so these will include whitespace
      expect(parsedEnv.DATABASE_URL).toBe('  postgresql://user:pass@localhost:5432/dbname  ');
      expect(parsedEnv.CLERK_SECRET_KEY).toBe('  sk_test_1234567890abcdef  ');
    });
  });

  describe('Error Reporting', () => {
    it('should provide detailed error information for multiple missing fields', () => {
      // Explicitly clear required env vars
      const testEnv = { ...originalEnv };
      delete testEnv.DATABASE_URL;
      delete testEnv.CLERK_SECRET_KEY;
      delete testEnv.CLERK_PUBLISHABLE_KEY;
      
      process.env = testEnv;

      const mockConsoleError = jest.fn();
      console.error = mockConsoleError;

      expect(() => {
        require('../environment');
      }).toThrow('Invalid environment variables');

      expect(mockConsoleError).toHaveBeenCalledWith('❌ Invalid environment variables:');
      
      // Check that the second call contains error details
      const errorDetails = mockConsoleError.mock.calls[1][0];
      expect(errorDetails).toHaveProperty('CLERK_SECRET_KEY');
      expect(errorDetails).toHaveProperty('CLERK_PUBLISHABLE_KEY');
      // DATABASE_URL should also be present if properly cleared
      if (!testEnv.DATABASE_URL) {
        expect(errorDetails).toHaveProperty('DATABASE_URL');
      }
    });

    it('should show specific validation errors', () => {
      process.env = {
        ...originalEnv,
        DATABASE_URL: 'invalid-url',
        CLERK_SECRET_KEY: '',
        CLERK_PUBLISHABLE_KEY: 'pk_test_1234567890abcdef',
        NODE_ENV: 'invalid-env',
      };

      const mockConsoleError = jest.fn();
      console.error = mockConsoleError;

      expect(() => {
        require('../environment');
      }).toThrow('Invalid environment variables');

      const errorCall = mockConsoleError.mock.calls[1][0];
      expect(errorCall.DATABASE_URL).toBeDefined();
      expect(errorCall.CLERK_SECRET_KEY).toBeDefined();
      expect(errorCall.NODE_ENV).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    it('should export correct TypeScript types', () => {
      // This test ensures the exported type matches the schema
      process.env = {
        ...originalEnv,
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/dbname',
        CLERK_SECRET_KEY: 'sk_test_1234567890abcdef',
        CLERK_PUBLISHABLE_KEY: 'pk_test_1234567890abcdef',
      };

      const { env: parsedEnv } = require('../environment');

      // Type checks (these would be compile-time checks in TS)
      expect(typeof parsedEnv.NODE_ENV).toBe('string');
      expect(typeof parsedEnv.PORT).toBe('string');
      expect(typeof parsedEnv.DATABASE_URL).toBe('string');
      expect(typeof parsedEnv.CLERK_SECRET_KEY).toBe('string');
      expect(typeof parsedEnv.CLERK_PUBLISHABLE_KEY).toBe('string');
      expect(typeof parsedEnv.FRONTEND_URL).toBe('string');
      expect(typeof parsedEnv.RATE_LIMIT_WINDOW_MS).toBe('number');
      expect(typeof parsedEnv.RATE_LIMIT_MAX_REQUESTS).toBe('number');
      
      // Optional field
      if (parsedEnv.API_SECRET_KEY !== undefined) {
        expect(typeof parsedEnv.API_SECRET_KEY).toBe('string');
      }
    });
  });
});