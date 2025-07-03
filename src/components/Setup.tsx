import { createSignal, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { appService } from "../lib/services/app-service";

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
      // Validate birth date
      if (!birthDate()) {
        setError("Please enter your birth date");
        return;
      }
      
      const birth = new Date(birthDate());
      const now = new Date();
      
      if (birth > now) {
        setError("Birth date cannot be in the future");
        return;
      }
      
      if (birth.getFullYear() < 1900) {
        setError("Please enter a valid birth date");
        return;
      }

      // Validate passphrase
      if (!passphrase()) {
        setError("Please enter a passphrase");
        return;
      }

      if (passphrase().length < 8) {
        setError("Passphrase must be at least 8 characters long");
        return;
      }

      if (passphrase() !== confirmPassphrase()) {
        setError("Passphrases do not match");
        return;
      }

      // Create account using IndexedDB service
      await appService.createAccount(birthDate(), passphrase());
      
      // Keep localStorage for backward compatibility temporarily
      localStorage.setItem("birthDate", birthDate());
      localStorage.setItem("user", JSON.stringify({ birthDate: birthDate() }));
      
      navigate("/period");
    } catch (err) {
      console.error("Setup error:", err);
      setError("Something went wrong. Please try again.");
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
          <p class="field-hint">Minimum 8 characters. Choose something memorable but secure.</p>
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