import { createSignal, Show, createEffect } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { useApp } from "../lib/context/AppContext";

export default function Login() {
  const app = useApp();
  const navigate = useNavigate();
  
  const [passphrase, setPassphrase] = createSignal("");
  const [showPassphrase, setShowPassphrase] = createSignal(false);
  const [error, setError] = createSignal("");
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  
  // Redirect based on auth state
  createEffect(() => {
    if (!app.isLoading()) {
      if (!app.user()) {
        navigate("/setup");
      } else if (app.isAuthenticated()) {
        navigate("/period");
      }
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

      const success = await app.login(passphrase());
      
      if (success) {
        navigate("/period");
      } else {
        setError("Invalid passphrase. Please try again.");
        setPassphrase("");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main class="container">
      <Show when={!app.isLoading()} fallback={<div class="loading">Loading...</div>}>
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
            <A href="/setup" class="link-button">
              Create new calendar
            </A>
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