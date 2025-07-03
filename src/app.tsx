import { MetaProvider, Title } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense, onMount } from "solid-js";
import { registerServiceWorker, requestPersistentStorage } from "./lib/sw/register";
import ErrorBoundary from "./components/ErrorBoundary";
import "./app.css";

export default function App() {
  onMount(async () => {
    // Register service worker for offline support
    if (typeof window !== "undefined") {
      await registerServiceWorker();
      // Request persistent storage to prevent data eviction
      await requestPersistentStorage();
    }
  });

  return (
    <Router
      root={(props) => (
        <MetaProvider>
          <Title>MyLife Calendar</Title>
          <ErrorBoundary>
            <Suspense>{props.children}</Suspense>
          </ErrorBoundary>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}