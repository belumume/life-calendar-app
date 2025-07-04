import { ErrorBoundary as SolidErrorBoundary, createSignal, Show } from "solid-js";
import { A } from "@solidjs/router";
import { errorHandler } from "../lib/utils/error-handler";

import { JSX } from "solid-js";

interface Props {
  children: JSX.Element;
}

export default function ErrorBoundary(props: Props) {
  const [showDetails, setShowDetails] = createSignal(false);
  const isDevelopment = import.meta.env.DEV;
  
  const handleError = (error: Error) => {
    // Report to global error handler
    errorHandler.reportError(error, {
      component: 'ErrorBoundary',
      location: window.location.href,
    });
  };
  
  return (
    <SolidErrorBoundary
      fallback={(err, reset) => {
        handleError(err);
        
        return (
          <div class="error-boundary">
            <h2>Something went wrong</h2>
            <p>We're sorry, but something unexpected happened.</p>
            
            <Show when={err.message}>
              <p class="error-message">{err.message}</p>
            </Show>
            
            <div class="error-actions">
              <button class="btn-primary" onClick={reset}>
                Try Again
              </button>
              <A href="/" class="btn-secondary">
                Go Home
              </A>
              <Show when={isDevelopment}>
                <button 
                  class="btn-secondary"
                  onClick={() => setShowDetails(!showDetails())}
                >
                  {showDetails() ? 'Hide' : 'Show'} Details
                </button>
              </Show>
            </div>
            
            <Show when={showDetails() && isDevelopment}>
              <details open>
                <summary>Error details</summary>
                <pre>{err.stack || err.toString()}</pre>
              </details>
            </Show>
          </div>
        );
      }}
    >
      {props.children}
    </SolidErrorBoundary>
  );
}