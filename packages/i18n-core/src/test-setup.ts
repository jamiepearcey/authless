import { t } from "@i18n-core";import '@testing-library/jest-dom';
import { afterAll, beforeAll, vi } from 'vitest';
import React from 'react';

// Make React available globally for JSX
global.React = React;

// Mock server-only module for testing
vi.mock('server-only', () => ({}));

// Mock localStorage to prevent hanging in tests
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

beforeAll(() => {
  console.error = (...args: any[]) => {
    // Only show errors that aren't expected test errors
    if (typeof args[0] === 'string' && args[0].includes('Warning: ReactDOM.render is no longer supported')) {
      return;
    }
    originalConsoleError(...args);
  };

  console.warn = (...args: any[]) => {
    // Suppress React warnings about deprecated methods
    if (typeof args[0] === 'string' && args[0].includes('Warning:')) {
      return;
    }
    originalConsoleWarn(...args);
  };

  console.log = (...args: any[]) => {
    // Suppress runtime locale change logs during tests
    if (typeof args[0] === 'string' && args[0].includes('Locale changed to:')) {
      return;
    }
    originalConsoleLog(...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
});