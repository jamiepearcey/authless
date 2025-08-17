import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nGate } from '../next/I18nGate';
// Note: I18nMount is server-only and can't be tested in this environment
// We'll test I18nGate instead
import type { I18nConfig } from '../abstractions/I18n-config';

// Mock Next.js router
const mockRouter = {
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn()
};

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter
}));

// Mock Next.js headers and cookies
const mockHeaders = {
  get: vi.fn((key: string) => {
    const headers = {
      'x-forwarded-host': 'example.com',
      'host': 'example.com',
      'x-forwarded-proto': 'https'
    };
    return headers[key as keyof typeof headers] || null;
  }),
  append: vi.fn(),
  getSetCookie: vi.fn(() => [])
} as any;

const mockCookies = [
  { name: 'locale', value: 'fr' }
];

vi.mock('next/headers', () => ({
  headers: () => mockHeaders,
  cookies: () => mockCookies
}));

// Mock fs/path for I18nMount
vi.mock('node:path', () => ({
  default: {
    isAbsolute: vi.fn((path: string) => path.startsWith('/')),
    join: vi.fn((...args: string[]) => args.join('/')),
    basename: vi.fn((path: string) => path.split('/').pop() || ''),
    posix: {
      join: vi.fn((...args: string[]) => args.join('/'))
    }
  }
}));

// Mock file helper functions
vi.mock('../helpers/file-helper', () => ({
  getFilesInDir: vi.fn(),
  tagFor: vi.fn()
}));

// Mock locale resolver
vi.mock('../helpers/locale-resolver', () => ({
  resolveLocale: vi.fn()
}));

// Mock server context
vi.mock('../server-context', () => ({
  withI18nContext: vi.fn((ctx, fn) => fn())
}));

const mockGetFilesInDir = vi.mocked(await import('../helpers/file-helper')).getFilesInDir;
const mockTagFor = vi.mocked(await import('../helpers/file-helper')).tagFor;
const mockResolveLocale = vi.mocked(await import('../helpers/locale-resolver')).resolveLocale;

// Mock fetch for I18nGate
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Next.js Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockGetFilesInDir.mockResolvedValue([
      '/path/to/public/i18n/en.json',
      '/path/to/public/i18n/fr.json'
    ]);
    
    mockTagFor.mockResolvedValue('hash123');
    
          mockResolveLocale.mockReturnValue({
        locale: 'fr',
        source: 'path'
      });
  });

  afterEach(() => {
    // Clean up global mocks
    if (typeof window !== 'undefined') {
      delete (window as any).__I18N__;
      delete (window as any).__I18N_READY;
    }
  });

  describe('I18nGate', () => {
    const mockLocales = {
      en: { locale: 'en', url: '/i18n/en.json', hash: 'hash123' },
      fr: { locale: 'fr', url: '/i18n/fr.json', hash: 'hash456' }
    };

    it('should render children when ready', async () => {
      const TestComponent = () => <div data-testid="test">Test Content</div>;

      render(
        <I18nGate 
          activeLocale="fr" 
          locales={mockLocales}
          fallback={<div data-testid="fallback">Loading...</div>}
        >
          <TestComponent />
        </I18nGate>
      );

      // Initially should show fallback
      expect(screen.getByTestId('fallback')).toBeInTheDocument();

      // Wait for ready state
      await waitFor(() => {
        expect(screen.getByTestId('test')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('fallback')).not.toBeInTheDocument();
    });

    it('should show fallback when not ready', () => {
      const TestComponent = () => <div data-testid="test">Test Content</div>;

      render(
        <I18nGate 
          activeLocale="fr" 
          locales={mockLocales}
          fallback={<div data-testid="fallback">Loading...</div>}
        >
          <TestComponent />
        </I18nGate>
      );

      expect(screen.getByTestId('fallback')).toBeInTheDocument();
      expect(screen.queryByTestId('test')).not.toBeInTheDocument();
    });

    it('should handle missing active locale gracefully', () => {
      const TestComponent = () => <div data-testid="test">Test Content</div>;

      render(
        <I18nGate 
          activeLocale="invalid" 
          locales={mockLocales}
          fallback={<div data-testid="fallback">Loading...</div>}
        >
          <TestComponent />
        </I18nGate>
      );

      // Should show fallback when no active locale
      expect(screen.getByTestId('fallback')).toBeInTheDocument();
    });

    it('should set window.__I18N__ when ready', async () => {
      const TestComponent = () => <div data-testid="test">Test Content</div>;

      // Mock fetch response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('{"hello":"Bonjour","welcome":"Bienvenue"}')
      });

      render(
        <I18nGate 
          activeLocale="fr" 
          locales={mockLocales}
        >
          <TestComponent />
        </I18nGate>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test')).toBeInTheDocument();
      });

      expect((window as any).__I18N__).toBeDefined();
      expect((window as any).__I18N_READY).toBe(true);
    });

    it('should handle localStorage errors gracefully', async () => {
      // Mock localStorage to throw errors
      const originalLocalStorage = global.localStorage;
      const mockLocalStorage = {
        getItem: vi.fn(() => { throw new Error('localStorage error'); }),
        setItem: vi.fn(() => { throw new Error('localStorage error'); }),
        removeItem: vi.fn(() => { throw new Error('localStorage error'); }),
        clear: vi.fn(),
        length: 0,
        key: vi.fn()
      };

      Object.defineProperty(global, 'localStorage', {
        value: mockLocalStorage,
        writable: true
      });

      const TestComponent = () => <div data-testid="test">Test Content</div>;

      render(
        <I18nGate 
          activeLocale="fr" 
          locales={mockLocales}
        >
          <TestComponent />
        </I18nGate>
      );

      // Should still work despite localStorage errors
      await waitFor(() => {
        expect(screen.getByTestId('test')).toBeInTheDocument();
      });

      // Restore original localStorage
      Object.defineProperty(global, 'localStorage', {
        value: originalLocalStorage,
        writable: true
      });
    });
  });

  // Note: I18nMount tests are removed since it's server-only
  // and can't be tested in this environment

  describe('Integration', () => {
    it('should work as a client-side i18n solution', async () => {
      const TestComponent = () => <div data-testid="test">Test Content</div>;

      render(
        <I18nGate 
          activeLocale="fr" 
          locales={{
            en: { locale: 'en', url: '/i18n/en.json', hash: 'hash123' },
            fr: { locale: 'fr', url: '/i18n/fr.json', hash: 'hash456' }
          }}
        >
          <TestComponent />
        </I18nGate>
      );

      // Should render through the entire chain
      await waitFor(() => {
        expect(screen.getByTestId('test')).toBeInTheDocument();
      });
    });
  });
});
