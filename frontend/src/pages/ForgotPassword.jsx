import { useState } from "react";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const [step, setStep] = useState("email"); // "email", "code", "reset", "success"
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    // In a real app, this would call backend: POST /auth/forgot-password
    // For now, simulating the flow
    setTimeout(() => {
      setMessage("Recovery code sent to " + email);
      setStep("code");
      setLoading(false);
    }, 1500);
  };

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!resetCode || resetCode.length < 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setStep("reset");
  };

  const handlePasswordReset = (e) => {
    e.preventDefault();
    setError("");

    if (!newPassword || !confirmPassword) {
      setError("Both password fields are required");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    // In a real app, this would call: POST /auth/reset-password
    setTimeout(() => {
      setStep("success");
      setLoading(false);
    }, 1500);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          padding: "40px",
          width: "100%",
          maxWidth: "420px",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "32px", textAlign: "center" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>
            {step === "email" && "Forgot Password?"}
            {step === "code" && "Enter Recovery Code"}
            {step === "reset" && "Create New Password"}
            {step === "success" && "Password Reset"}
          </h1>
          <p style={{ color: "#64748b", fontSize: "14px" }}>
            {step === "email" && "Enter your email to receive a recovery code"}
            {step === "code" && "Check your email for the 6-digit code"}
            {step === "reset" && "Enter your new password below"}
            {step === "success" && "Your password has been successfully reset"}
          </p>
        </div>

        {/* Success State */}
        {step === "success" && (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                background: "#f0fdf4",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                margin: "0 auto 20px",
              }}
            >
              ✓
            </div>
            <p style={{ color: "#16a34a", fontWeight: "600", marginBottom: "24px" }}>
              Your password has been reset successfully!
            </p>
            <Link
              to="/login"
              style={{
                display: "inline-block",
                padding: "12px 24px",
                background: "linear-gradient(135deg, #667eea, #764ba2)",
                color: "white",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "14px",
              }}
            >
              Back to Login
            </Link>
          </div>
        )}

        {/* Step 1: Email */}
        {step === "email" && (
          <form onSubmit={handleEmailSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {error && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  color: "#dc2626",
                  fontSize: "13px",
                }}
              >
                {error}
              </div>
            )}
            {message && (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  color: "#16a34a",
                  fontSize: "13px",
                }}
              >
                {message}
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#0f172a", marginBottom: "6px" }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@company.com"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#667eea")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "12px 16px",
                background: loading ? "#cbd5e1" : "linear-gradient(135deg, #667eea, #764ba2)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                marginTop: "8px",
              }}
            >
              {loading ? "Sending Code..." : "Send Recovery Code"}
            </button>
          </form>
        )}

        {/* Step 2: Code */}
        {step === "code" && (
          <form onSubmit={handleCodeSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {error && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  color: "#dc2626",
                  fontSize: "13px",
                }}
              >
                {error}
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#0f172a", marginBottom: "6px" }}>
                Recovery Code
              </label>
              <input
                type="text"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value.toUpperCase())}
                placeholder="E.g., ABC123"
                maxLength="6"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "16px",
                  letterSpacing: "2px",
                  outline: "none",
                  boxSizing: "border-box",
                  textAlign: "center",
                  fontWeight: "600",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#667eea")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              />
            </div>

            <button
              type="submit"
              style={{
                padding: "12px 16px",
                background: "linear-gradient(135deg, #667eea, #764ba2)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                marginTop: "8px",
              }}
            >
              Verify Code
            </button>

            <button
              type="button"
              onClick={() => setStep("email")}
              style={{
                padding: "12px 16px",
                background: "transparent",
                color: "#667eea",
                border: "1px solid #667eea",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Use Different Email
            </button>
          </form>
        )}

        {/* Step 3: Reset Password */}
        {step === "reset" && (
          <form onSubmit={handlePasswordReset} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {error && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  color: "#dc2626",
                  fontSize: "13px",
                }}
              >
                {error}
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#0f172a", marginBottom: "6px" }}>
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#667eea")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              />
              <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Min 6 characters</p>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#0f172a", marginBottom: "6px" }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#667eea")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "12px 16px",
                background: loading ? "#cbd5e1" : "linear-gradient(135deg, #667eea, #764ba2)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                marginTop: "8px",
              }}
            >
              {loading ? "Resetting Password..." : "Reset Password"}
            </button>
          </form>
        )}

        {/* Footer Links */}
        {step !== "success" && (
          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <Link
              to="/login"
              style={{
                color: "#667eea",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "13px",
              }}
            >
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
