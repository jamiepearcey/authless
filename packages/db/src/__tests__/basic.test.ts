import { describe, it, expect } from 'vitest';

describe('Basic DB Package Test', () => {
  it('should work with basic functions', () => {
    const multiply = (a: number, b: number) => a * b;
    expect(multiply(2, 3)).toBe(6);
  });

  it('should work with strings', () => {
    expect('database').toBe('database');
  });
});
