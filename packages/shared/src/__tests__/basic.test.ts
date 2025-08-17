import { describe, it, expect } from 'vitest';

describe('Basic Shared Package Test', () => {
  it('should work with basic functions', () => {
    const add = (a: number, b: number) => a + b;
    expect(add(2, 3)).toBe(5);
  });

  it('should work with strings', () => {
    expect('hello').toBe('hello');
  });
});
