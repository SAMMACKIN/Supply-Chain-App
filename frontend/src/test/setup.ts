import '@testing-library/jest-dom'
import { expect } from 'vitest'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Set default test environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_API_URL: 'http://test-api.example.com/api',
  },
  writable: true,
  configurable: true,
})

// Add custom matchers
expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received)
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be one of ${expected.join(', ')}`
          : `expected ${received} to be one of ${expected.join(', ')}`,
    }
  },
})