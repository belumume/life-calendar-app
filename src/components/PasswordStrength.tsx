import { createMemo } from "solid-js";

interface PasswordStrengthProps {
  password: string;
}

export default function PasswordStrength(props: PasswordStrengthProps) {
  const strength = createMemo(() => {
    const password = props.password;
    
    if (!password) return { score: 0, label: "Enter password", color: "#ccc" };
    
    let score = 0;
    const feedback: string[] = [];
    
    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    
    // Character variety checks
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    
    // Common patterns to avoid
    if (!/(.)\1{2,}/.test(password)) score += 1; // No repeated characters
    if (!/^(123|abc|password)/i.test(password)) score += 1; // No common patterns
    
    // Determine strength label and color
    if (score <= 2) {
      return { score: 1, label: "Weak", color: "#d00" };
    } else if (score <= 4) {
      return { score: 2, label: "Fair", color: "#fa0" };
    } else if (score <= 6) {
      return { score: 3, label: "Good", color: "#fb0" };
    } else if (score <= 8) {
      return { score: 4, label: "Strong", color: "#0b0" };
    } else {
      return { score: 5, label: "Very Strong", color: "#0d0" };
    }
  });
  
  const barWidth = createMemo(() => `${(strength().score / 5) * 100}%`);
  
  return (
    <div class="password-strength">
      <div class="strength-bar-container">
        <div 
          class="strength-bar-fill" 
          style={{
            width: barWidth(),
            "background-color": strength().color,
          }}
        />
      </div>
      <span class="strength-label" style={{ color: strength().color }}>
        {strength().label}
      </span>
    </div>
  );
}