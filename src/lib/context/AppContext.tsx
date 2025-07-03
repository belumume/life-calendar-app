import { createContext, useContext, ParentComponent, createSignal, onMount } from "solid-js";
import type { User } from "../validation/schemas";
import { appService } from "../services/app-service";

interface AppContextValue {
  user: () => User | null;
  isAuthenticated: () => boolean;
  isLoading: () => boolean;
  error: () => string | null;
  initialize: () => Promise<void>;
  login: (passphrase: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AppContext = createContext<AppContextValue>();

export const AppProvider: ParentComponent = (props) => {
  const [user, setUser] = createSignal<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  const initialize = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await appService.initialize();
      const currentUser = appService.getCurrentUser();
      
      if (currentUser) {
        setUser(currentUser);
        // Check if encryption is initialized (user has logged in this session)
        setIsAuthenticated(appService.isAuthenticated());
      }
    } catch (err) {
      console.error("Failed to initialize app:", err);
      setError(err instanceof Error ? err.message : "Failed to initialize");
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (passphrase: string): Promise<boolean> => {
    setError(null);
    
    try {
      const success = await appService.login(passphrase);
      if (success) {
        setIsAuthenticated(true);
        const currentUser = appService.getCurrentUser();
        setUser(currentUser);
      }
      return success;
    } catch (err) {
      console.error("Login failed:", err);
      setError(err instanceof Error ? err.message : "Login failed");
      return false;
    }
  };

  const logout = async () => {
    await appService.logout();
    setIsAuthenticated(false);
    // Keep user data for login page
  };

  const refreshUser = async () => {
    const currentUser = appService.getCurrentUser();
    setUser(currentUser);
  };

  // Initialize on mount
  onMount(() => {
    initialize();
  });

  const value: AppContextValue = {
    user,
    isAuthenticated,
    isLoading,
    error,
    initialize,
    login,
    logout,
    refreshUser,
  };

  return (
    <AppContext.Provider value={value}>
      {props.children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};