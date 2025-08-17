import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Basic API App Test', () => {
  it('should work with React components', () => {
    const TestComponent = () => <div>API Test</div>;
    render(<TestComponent />);
    expect(screen.getByText('API Test')).toBeInTheDocument();
  });

  it('should work with basic JSX', () => {
    const element = <span>Test</span>;
    expect(element).toBeDefined();
  });
});
