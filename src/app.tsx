import { MetaProvider, Title } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense, onMount } from "solid-js";
import { registerServiceWorker, requestPersistentStorage } from "./lib/sw/register";
import ErrorBoundary from "./components/ErrorBoundary";
import { AppProvider } from "./lib/context/AppContext";
import { themeService } from "./lib/services/theme-service";
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