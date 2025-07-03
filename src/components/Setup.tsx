import { createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { initializeUser } from "../lib/state/store";

export default function Setup() {
  const [birthDate, setBirthDate] = createSignal("");
  const [error, setError] = createSignal("");
  const navigate = useNavigate();

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    
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
    
    // Initialize user and navigate to life view
    initializeUser(birthDate());
    navigate("/life");
  };

  return (
    <div class="setup-container">
      <h2>Welcome to MyLife Calendar</h2>
      <p>Let's get started by setting your birth date. This will be used to create your personal life calendar.</p>
      
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
          />
          {error() && <p class="error-message">{error()}</p>}
        </div>
        
        <div class="privacy-note">
          <p>🔒 Your data stays on your device</p>
          <p>We never send your personal information to any server</p>
        </div>
        
        <button type="submit" class="btn-primary">
          Create My Life Calendar
        </button>
      </form>
    </div>
  );
}