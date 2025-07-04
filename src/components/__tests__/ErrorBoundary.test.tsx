import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { Router } from '@solidjs/router';
import ErrorBoundary from '../ErrorBoundary';
import { errorHandler } from '../../lib/utils/error-handler';

// Mock the error handler
vi.mock('../../lib/utils/error-handler', () => ({
  errorHandler: {
    reportError: vi.fn()
  }
}));

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when there is no error', () => {
    render(() => (
      <Router>
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      </Router>
    ));

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders error UI when an error is thrown', () => {
    const ThrowError = () => {
      throw new Error('Test error message');
    };

    render(() => (
      <Router>
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      </Router>
    ));

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('reports error to error handler', () => {
    const testError = new Error('Test error');
    const ThrowError = () => {
      throw testError;
    };

    render(() => (
      <Router>
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      </Router>
    ));

    expect(errorHandler.reportError).toHaveBeenCalledWith(
      testError,
      expect.objectContaining({
        component: 'ErrorBoundary',
        location: expect.any(String)
      })
    );
  });

  it('allows resetting the error boundary', () => {
    let shouldThrow = true;
    const ConditionalError = () => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>No error</div>;
    };

    const { container } = render(() => (
      <Router>
        <ErrorBoundary>
          <ConditionalError />
        </ErrorBoundary>
      </Router>
    ));

    // Error is shown
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Fix the error condition
    shouldThrow = false;

    // Click reset button
    const resetButton = screen.getByText('Try Again');
    fireEvent.click(resetButton);

    // Should render normally now
    expect(screen.getByText('No error')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('shows error details in development mode', () => {
    const originalEnv = import.meta.env.DEV;
    Object.defineProperty(import.meta.env, 'DEV', {
      value: true,
      configurable: true
    });

    const ThrowError = () => {
      throw new Error('Test error with stack');
    };

    render(() => (
      <Router>
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      </Router>
    ));

    const detailsButton = screen.getByText('Show Details');
    fireEvent.click(detailsButton);

    expect(screen.getByText(/Error details/)).toBeInTheDocument();

    // Restore original env
    Object.defineProperty(import.meta.env, 'DEV', {
      value: originalEnv,
      configurable: true
    });
  });

  it('provides navigation options', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    render(() => (
      <Router>
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      </Router>
    ));

    expect(screen.getByText('Go Home')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });
});