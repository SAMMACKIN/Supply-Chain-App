// Mock environment first
jest.mock('../../../config/environment', () => ({
  env: {
    FRONTEND_URL: 'http://localhost:5173',
    NODE_ENV: 'test',
  },
}));

// Mock the cors module
jest.mock('cors');
import cors from 'cors';
import { env } from '../../../config/environment';

// Import cors middleware to trigger configuration
import '../cors';

describe('CORS Middleware', () => {
  let mockCors: jest.MockedFunction<typeof cors>;
  let corsConfig: any;

  beforeEach(() => {
    mockCors = cors as jest.MockedFunction<typeof cors>;
    mockCors.mockImplementation((options: any) => {
      corsConfig = options;
      return jest.fn();
    });

    // Import the middleware to trigger the cors configuration
    jest.isolateModules(() => {
      require('../cors');
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Origin validation', () => {
    it('should allow requests with no origin', () => {
      const callback = jest.fn();
      corsConfig.origin(undefined, callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should allow requests from FRONTEND_URL', () => {
      const callback = jest.fn();
      corsConfig.origin(env.FRONTEND_URL, callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should allow requests from localhost:3000', () => {
      const callback = jest.fn();
      corsConfig.origin('http://localhost:3000', callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should allow requests from localhost:5173 (Vite)', () => {
      const callback = jest.fn();
      corsConfig.origin('http://localhost:5173', callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should allow requests from main Vercel app', () => {
      const callback = jest.fn();
      corsConfig.origin('https://supply-chain-app.vercel.app', callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should allow requests from dev Vercel app', () => {
      const callback = jest.fn();
      corsConfig.origin('https://supply-chain-app-five-dev.vercel.app', callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should allow requests from any Vercel preview deployment', () => {
      const callback = jest.fn();
      const previewUrls = [
        'https://supply-chain-app-git-feature-branch.vercel.app',
        'https://supply-chain-app-pr-123.vercel.app',
        'https://supply-chain-app-abc123def.vercel.app',
      ];

      previewUrls.forEach(url => {
        callback.mockClear();
        corsConfig.origin(url, callback);
        expect(callback).toHaveBeenCalledWith(null, true);
      });
    });

    it('should reject requests from unauthorized origins', () => {
      const callback = jest.fn();
      const unauthorizedOrigins = [
        'https://evil-site.com',
        'http://malicious-app.herokuapp.com',
        'https://fake-supply-chain-app.vercel.app.evil.com',
        'https://supply-chain-appvercel.app', // Missing dot
        'https://vercel.app', // Not our app
      ];

      unauthorizedOrigins.forEach(url => {
        callback.mockClear();
        corsConfig.origin(url, callback);
        expect(callback).toHaveBeenCalledWith(expect.any(Error), undefined);
        expect(callback.mock.calls[0][0].message).toBe('Not allowed by CORS');
      });
    });

    it('should handle empty origin (null origin)', () => {
      const callback = jest.fn();
      corsConfig.origin(null, callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should handle empty string origin', () => {
      const callback = jest.fn();
      corsConfig.origin('', callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });
  });

  describe('CORS configuration', () => {
    it('should enable credentials', () => {
      expect(corsConfig.credentials).toBe(true);
    });

    it('should allow correct HTTP methods', () => {
      expect(corsConfig.methods).toEqual([
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS',
      ]);
    });

    it('should allow correct headers', () => {
      expect(corsConfig.allowedHeaders).toEqual([
        'Content-Type',
        'Authorization',
      ]);
    });
  });

  describe('RegExp pattern matching', () => {
    it('should correctly match Vercel preview deployment patterns', () => {
      const pattern = /^https:\/\/supply-chain-app-.*\.vercel\.app$/;
      
      const validUrls = [
        'https://supply-chain-app-feature-auth.vercel.app',
        'https://supply-chain-app-pr-123.vercel.app',
        'https://supply-chain-app-git-main-team.vercel.app',
        'https://supply-chain-app-abc123.vercel.app',
      ];

      validUrls.forEach(url => {
        expect(pattern.test(url)).toBe(true);
      });
    });

    it('should not match invalid Vercel patterns', () => {
      const pattern = /^https:\/\/supply-chain-app-.*\.vercel\.app$/;
      
      const invalidUrls = [
        'http://supply-chain-app-test.vercel.app', // HTTP not HTTPS
        'https://supply-chain-app.vercel.app', // No suffix
        'https://other-app-test.vercel.app', // Different app name
        'https://supply-chain-app-test.vercel.com', // Wrong domain
        'https://supply-chain-app-test.vercel.app.evil.com', // Extra domain
      ];

      invalidUrls.forEach(url => {
        expect(pattern.test(url)).toBe(false);
      });
    });
  });

  describe('Environment variable handling', () => {
    it('should include FRONTEND_URL from environment', () => {
      const callback = jest.fn();
      const frontendUrl = env.FRONTEND_URL;
      
      corsConfig.origin(frontendUrl, callback);
      
      expect(callback).toHaveBeenCalledWith(null, true);
    });
  });
});