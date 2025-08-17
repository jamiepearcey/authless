import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Basic UI Package Test', () => {
  it('should work with React components', () => {
    const TestComponent = () => <div>UI Test</div>;
    render(<TestComponent />);
    expect(screen.getByText('UI Test')).toBeInTheDocument();
  });

  it('should work with basic JSX', () => {
    const element = <span>Test</span>;
    expect(element).toBeDefined();
  });
});
