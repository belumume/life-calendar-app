import { ErrorBoundary as SolidErrorBoundary } from "solid-js";
import { A } from "@solidjs/router";

interface Props {
  children: any;
}

export default function ErrorBoundary(props: Props) {
  return (
    <SolidErrorBoundary
      fallback={(err, reset) => (
        <div class="error-boundary">
          <h2>Something went wrong</h2>
          <p>We're sorry, but something unexpected happened.</p>
          <details>
            <summary>Error details</summary>
            <pre>{err.toString()}</pre>
          </details>
          <div class="error-actions">
            <button class="btn-primary" onClick={reset}>
              Try Again
            </button>
            <A href="/" class="btn-secondary">
              Go Home
            </A>
          </div>
        </div>
      )}
    >
      {props.children}
    </SolidErrorBoundary>
  );
}