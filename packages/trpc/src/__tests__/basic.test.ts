import { describe, it, expect } from 'vitest';

describe('Basic tRPC Package Test', () => {
  it('should work with basic functions', () => {
    const divide = (a: number, b: number) => a / b;
    expect(divide(6, 2)).toBe(3);
  });

  it('should work with strings', () => {
    expect('trpc').toBe('trpc');
  });
});
