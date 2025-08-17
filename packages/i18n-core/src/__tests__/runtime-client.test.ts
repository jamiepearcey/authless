import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setActiveLocale,
  getActiveLocale,
  setDefaultLocale,
  getDefaultLocale,
  ensureI18nReady,
  t,
  resetForTesting,
  type Dict,
  type Vars
} from '../runtime-client';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

// Mock window.__I18N__
const mockWindowI18N = {
  locale: '',
  dict: {} as Dict
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

Object.defineProperty(window, '__I18N__', {
  value: mockWindowI18N,
  writable: true
});

// Mock fetch for I18nGate
global.fetch = vi.fn();

describe('Runtime Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWindowI18N.locale = '';
    mockWindowI18N.dict = {};
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockReturnValue(undefined);
    
    // Reset internal state
    resetForTesting();
  });

  describe('setActiveLocale', () => {
    it('should set active locale and store in localStorage', () => {
      setActiveLocale('fr');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('i18n:active', 'fr');
    });
  });

  describe('getActiveLocale', () => {
    it('should return null initially', () => {
      expect(getActiveLocale()).toBeNull();
    });

    it('should return locale from localStorage if set', () => {
      localStorageMock.getItem.mockReturnValue('de');
      expect(getActiveLocale()).toBe('de');
    });
  });

  describe('setDefaultLocale', () => {
    it('should set default locale and store in localStorage', () => {
      setDefaultLocale('en');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('i18n:default', 'en');
    });
  });

  describe('getDefaultLocale', () => {
    it('should return null initially', () => {
      expect(getDefaultLocale()).toBeNull();
    });

    it('should return locale from localStorage if set', () => {
      localStorageMock.getItem.mockReturnValue('en');
      expect(getDefaultLocale()).toBe('en');
    });
  });

  describe('ensureI18nReady', () => {
    it('should return false when no data is available', () => {
      expect(ensureI18nReady()).toBe(false);
    });

    it('should return true when window.__I18N__ is available', () => {
      mockWindowI18N.locale = 'fr';
      mockWindowI18N.dict = { hello: 'Bonjour' };
      expect(ensureI18nReady()).toBe(true);
    });

    it('should try to load from localStorage for active locale', () => {
      setActiveLocale('fr');
      localStorageMock.getItem
        .mockReturnValueOnce('fr') // getActiveLocale
        .mockReturnValueOnce('hash123') // idx lookup
        .mockReturnValueOnce('{"hello":"Bonjour"}'); // blob lookup
      
      expect(ensureI18nReady()).toBe(true);
    });

    it('should try to load from localStorage for default locale if active fails', () => {
      setActiveLocale('fr');
      setDefaultLocale('en');
      localStorageMock.getItem
        .mockReturnValueOnce('fr') // getActiveLocale
        .mockReturnValueOnce(null) // idx lookup for active
        .mockReturnValueOnce('en') // getDefaultLocale
        .mockReturnValueOnce('hash456') // idx lookup for default
        .mockReturnValueOnce('{"hello":"Hello"}'); // blob lookup for default
      
      expect(ensureI18nReady()).toBe(true);
    });
  });

  describe('t function', () => {
    beforeEach(() => {
      mockWindowI18N.locale = 'fr';
      mockWindowI18N.dict = { hello: 'Bonjour', welcome: 'Bienvenue {name}' };
    });

    it('should translate using current locale', () => {
      const result = t('hello', 'hello');
      expect(result).toBe('Bonjour');
    });

    it('should fallback to seed text when translation missing', () => {
      const result = t('unknown', 'unknown');
      expect(result).toBe('unknown');
    });

    it('should handle template variables', () => {
      const result = t('welcome', 'welcome', { name: 'John' });
      expect(result).toBe('Bienvenue John');
    });

    it('should handle missing template variables gracefully', () => {
      const result = t('welcome', 'welcome', {});
      expect(result).toBe('Bienvenue {name}');
    });

    it('should handle nested object paths', () => {
      const result = t('welcome', 'welcome', { user: { name: 'John' } });
      expect(result).toBe('Bienvenue {name}');
    });

    it('should use id parameter when provided', () => {
      const result = t('fallback text', 'hello');
      expect(result).toBe('Bonjour');
    });

    it('should fallback to seed when id is not found', () => {
      const result = t('fallback text', 'unknown');
      expect(result).toBe('fallback text');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty dictionaries', () => {
      mockWindowI18N.dict = {};
      const result = t('test');
      expect(result).toBe('test');
    });

    it('should handle null/undefined values gracefully', () => {
      const result = t('test', 'test', { name: null });
      expect(result).toBe('test');
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage not available');
      });
      
      // Should not crash
      expect(() => setActiveLocale('fr')).not.toThrow();
      expect(() => getActiveLocale()).not.toThrow();
    });
  });
});
