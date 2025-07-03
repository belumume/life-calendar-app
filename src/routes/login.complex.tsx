import { createSignal, Show, onMount } from "solid-js";
import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import { appState, authenticate, initializeApp } from "../lib/state/store";

export default function Login() {
  const [passphrase, setPassphrase] = createSignal("");
  const [showPassphrase, setShowPassphrase] = createSignal(false);
  const [error, setError] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(true);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const navigate = useNavigate();

  onMount(async () => {
    // Initialize app to check for user
    await initializeApp();
    setIsLoading(false);
    
    // If no user exists, redirect to setup
    if (!appState.user) {
      navigate("/setup");
      return;
    }
    
    // If already authenticated, redirect to home
    if (appState.isAuthenticated) {
      navigate("/");
      return;
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (!passphrase()) {
        setError("Please enter your passphrase");
        return;
      }

      const success = await authenticate(passphrase());
      
      if (success) {
        navigate("/");
      } else {
        setError("Invalid passphrase. Please try again.");
        // Clear the passphrase field for security
        setPassphrase("");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassphrase = () => {
    if (confirm("Without your passphrase, your data cannot be recovered. Would you like to start fresh with a new calendar?")) {
      // TODO: Implement data reset functionality
      navigate("/reset");
    }
  };

  return (
    <main class="container">
      <Title>Login - MyLife Calendar</Title>
      
      <Show when={!isLoading()} fallback={<div class="loading">Loading...</div>}>
        <div class="login-container">
          <h1>Welcome Back</h1>
          <p>Enter your passphrase to unlock your life calendar.</p>
          
          <form onSubmit={handleSubmit} class="login-form">
            <div class="form-group">
              <label for="passphrase">Your Passphrase</label>
              <div class="password-input-wrapper">
                <input
                  type={showPassphrase() ? "text" : "password"}
                  id="passphrase"
                  value={passphrase()}
                  onInput={(e) => setPassphrase(e.currentTarget.value)}
                  placeholder="Enter your passphrase"
                  required
                  disabled={isSubmitting()}
                  autofocus
                />
                <button
                  type="button"
                  class="toggle-password"
                  onClick={() => setShowPassphrase(!showPassphrase())}
                  aria-label={showPassphrase() ? "Hide passphrase" : "Show passphrase"}
                  disabled={isSubmitting()}
                >
                  {showPassphrase() ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <Show when={error()}>
              <p class="error-message" role="alert">{error()}</p>
            </Show>
            
            <button 
              type="submit" 
              class="btn-primary"
              disabled={isSubmitting() || !passphrase()}
            >
              {isSubmitting() ? "Unlocking..." : "Unlock Calendar"}
            </button>
          </form>

          <div class="login-footer">
            <button 
              type="button"
              class="link-button"
              onClick={handleForgotPassphrase}
            >
              Forgot your passphrase?
            </button>
          </div>

          <div class="privacy-note">
            <p>🔒 Your passphrase is never sent to any server</p>
            <p>All decryption happens locally on your device</p>
          </div>
        </div>
      </Show>
    </main>
  );
}