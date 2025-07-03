import { createSignal, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { appService } from "../lib/services/app-service";
import { SetupFormSchema } from "../lib/validation/input-schemas";
import { z } from "zod";
import PasswordStrength from "./PasswordStrength";

export default function Setup() {
  const [birthDate, setBirthDate] = createSignal("");
  const [passphrase, setPassphrase] = createSignal("");
  const [confirmPassphrase, setConfirmPassphrase] = createSignal("");
  const [showPassphrase, setShowPassphrase] = createSignal(false);
  const [error, setError] = createSignal("");
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      // Validate form data with Zod
      const formData = {
        birthDate: birthDate(),
        passphrase: passphrase(),
        confirmPassphrase: confirmPassphrase(),
      };

      const validatedData = SetupFormSchema.parse(formData);

      // Create account using IndexedDB service with validated data
      await appService.createAccount(validatedData.birthDate, validatedData.passphrase);
      
      // Navigate to period view
      navigate("/period");
    } catch (err) {
      console.error("Setup error:", err);
      if (err instanceof z.ZodError) {
        // Show the first validation error
        setError(err.errors[0].message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div class="setup-container">
      <h2>Welcome to MyLife Calendar</h2>
      <p>Let's get started by setting up your account. Your data will be encrypted and stored locally on your device.</p>
      
      <form onSubmit={handleSubmit} class="setup-form">
        <div class="form-group">
          <label for="birthdate">Your Birth Date</label>
          <input
            type="date"
            id="birthdate"
            value={birthDate()}
            onInput={(e) => setBirthDate(e.currentTarget.value)}
            max={new Date().toISOString().split('T')[0]}
            required
            disabled={isSubmitting()}
          />
        </div>

        <div class="form-group">
          <label for="passphrase">
            Create a Passphrase
            <span class="label-hint">This will encrypt and protect your data</span>
          </label>
          <div class="password-input-wrapper">
            <input
              type={showPassphrase() ? "text" : "password"}
              id="passphrase"
              value={passphrase()}
              onInput={(e) => setPassphrase(e.currentTarget.value)}
              placeholder="Enter a strong passphrase"
              minLength={8}
              required
              disabled={isSubmitting()}
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
          <p class="field-hint">Minimum 8 characters, must include uppercase, lowercase, and numbers.</p>
          <Show when={passphrase()}>
            <PasswordStrength password={passphrase()} />
          </Show>
        </div>

        <div class="form-group">
          <label for="confirmPassphrase">Confirm Passphrase</label>
          <input
            type={showPassphrase() ? "text" : "password"}
            id="confirmPassphrase"
            value={confirmPassphrase()}
            onInput={(e) => setConfirmPassphrase(e.currentTarget.value)}
            placeholder="Re-enter your passphrase"
            minLength={8}
            required
            disabled={isSubmitting()}
          />
        </div>

        <Show when={error()}>
          <p class="error-message" role="alert">{error()}</p>
        </Show>
        
        <div class="privacy-note">
          <h3>🔒 Privacy & Security</h3>
          <ul>
            <li>Your passphrase encrypts all your data</li>
            <li>Data never leaves your device</li>
            <li>Without your passphrase, data cannot be recovered</li>
            <li>We recommend using a password manager</li>
          </ul>
        </div>
        
        <button 
          type="submit" 
          class="btn-primary"
          disabled={isSubmitting()}
        >
          {isSubmitting() ? "Creating your calendar..." : "Create My Life Calendar"}
        </button>
      </form>
    </div>
  );
}