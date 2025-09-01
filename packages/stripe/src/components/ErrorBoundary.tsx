'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class StripeErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Stripe component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="stripe-error-boundary p-4 border border-red-200 bg-red-50 rounded-md">
          <h3 className="text-red-800 font-semibold mb-2">Payment System Error</h3>
          <p className="text-red-600 text-sm">
            There was an error loading the payment system. Please refresh the page or try again later.
          </p>
          <details className="mt-2">
            <summary className="text-red-600 text-xs cursor-pointer">Technical Details</summary>
            <pre className="text-red-500 text-xs mt-1 whitespace-pre-wrap">
              {this.state.error?.message}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}