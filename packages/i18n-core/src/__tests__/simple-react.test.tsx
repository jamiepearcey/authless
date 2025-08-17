import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Simple React Test', () => {
  it('should render a simple component', () => {
    const TestComponent = () => <div>Hello World</div>;
    render(<TestComponent />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('should work with basic JSX', () => {
    const element = <span>Test</span>;
    expect(element).toBeDefined();
  });
});
