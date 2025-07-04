import { Component, createSignal, JSX, Show } from 'solid-js';
import { ErrorBoundary } from 'solid-js';

interface ErrorFallbackProps {
  error: Error;
  reset: () => void;
}

const ErrorFallback: Component<ErrorFallbackProps> = (props) => {
  const [showDetails, setShowDetails] = createSignal(false);
  
  const isDevelopment = import.meta.env.DEV;
  
  return (
    <div class="error-boundary-container">
      <div class="error-content">
        <h1>Something went wrong</h1>
        <p class="error-message">
          {props.error.message || 'An unexpected error occurred'}
        </p>
        
        <div class="error-actions">
          <button 
            onClick={props.reset}
            class="btn btn-primary"
          >
            Try again
          </button>
          
          <Show when={isDevelopment}>
            <button 
              onClick={() => setShowDetails(!showDetails())}
              class="btn btn-secondary"
            >
              {showDetails() ? 'Hide' : 'Show'} details
            </button>
          </Show>
        </div>
        
        <Show when={showDetails() && isDevelopment}>
          <div class="error-details">
            <h3>Error Details:</h3>
            <pre>{props.error.stack || props.error.toString()}</pre>
          </div>
        </Show>
      </div>
    </div>
  );
};

export const GlobalErrorBoundary: Component<{ children: JSX.Element }> = (props) => {
  return (
    <ErrorBoundary
      fallback={(error, reset) => <ErrorFallback error={error} reset={reset} />}
    >
      {props.children}
    </ErrorBoundary>
  );
};

// Add styles for error boundary
const styles = `
  .error-boundary-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
    background-color: var(--bg-color, #ffffff);
  }
  
  .error-content {
    max-width: 600px;
    width: 100%;
    text-align: center;
  }
  
  .error-content h1 {
    font-size: 2rem;
    margin-bottom: 1rem;
    color: var(--error-color, #dc3545);
  }
  
  .error-message {
    font-size: 1.1rem;
    margin-bottom: 2rem;
    color: var(--text-color, #333333);
  }
  
  .error-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 2rem;
  }
  
  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.25rem;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-primary {
    background-color: var(--primary-color, #007bff);
    color: white;
  }
  
  .btn-primary:hover {
    background-color: var(--primary-hover, #0056b3);
  }
  
  .btn-secondary {
    background-color: var(--secondary-color, #6c757d);
    color: white;
  }
  
  .btn-secondary:hover {
    background-color: var(--secondary-hover, #545b62);
  }
  
  .error-details {
    text-align: left;
    background-color: var(--code-bg, #f5f5f5);
    padding: 1rem;
    border-radius: 0.25rem;
    overflow-x: auto;
  }
  
  .error-details h3 {
    margin-bottom: 0.5rem;
    color: var(--text-color, #333333);
  }
  
  .error-details pre {
    margin: 0;
    font-family: monospace;
    font-size: 0.875rem;
    white-space: pre-wrap;
    word-break: break-word;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}