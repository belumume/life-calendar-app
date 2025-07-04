import { MetaProvider, Title } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense, onMount, onCleanup } from "solid-js";
import { registerServiceWorker, requestPersistentStorage } from "./lib/sw/register";
import ErrorBoundary from "./components/ErrorBoundary";
import { AppProvider } from "./lib/context/AppContext";
import { themeService } from "./lib/services/theme-service";
import { errorHandler } from "./lib/utils/error-handler";
import { setupGlobalCleanup } from "./lib/utils/cleanup";
import "./app.css";

export default function App() {
  onMount(async () => {
    // Register service worker for offline support
    if (typeof window !== "undefined") {
      await registerServiceWorker();
      // Request persistent storage to prevent data eviction
      await requestPersistentStorage();
      // Initialize theme service
      await themeService.initialize();
      // Initialize error handler (already auto-initialized but ensure it's ready)
      errorHandler.initialize();
      // Setup global cleanup handlers
      setupGlobalCleanup();
    }
  });
  
  onCleanup(() => {
    // Clean up resources when app unmounts
    if (typeof window !== "undefined") {
      import('./lib/utils/cleanup').then(({ cleanupResources }) => {
        cleanupResources();
      });
    }
  });

  return (
    <Router
      root={(props) => (
        <MetaProvider>
          <Title>MyLife Calendar</Title>
          <AppProvider>
            <ErrorBoundary>
              <Suspense>{props.children}</Suspense>
            </ErrorBoundary>
          </AppProvider>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}