import { useState, useContext } from "react";
import api from "../api/axios";
import { useNavigate, Link } from "react-router-dom";
import { UserContext } from "../context/UserContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { login } = useContext(UserContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!email || !password) {
        setError("Email and password are required");
        return;
      }

      const res = await api.post("/auth/login", { email, password });
      
      if (res.data.token && res.data.user) {
        login(res.data.user, res.data.token);
        nav("/dashboard");
      }
    } catch (err) {
      setError(
        err.response?.data?.error || 
        err.response?.data?.message || 
        "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleLogin} className="login-form">
        <h1>PeopleCore Login</h1>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          <Link to="/forgot-password" style={{ fontSize: "12px", color: "#667eea", textDecoration: "none", marginTop: "6px", display: "block" }}>
            Forgot password?
          </Link>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <div style={{ textAlign: "center", marginTop: "16px", fontSize: "14px", color: "#64748b" }}>
          Don't have an account?{" "}
          <Link 
            to="/register" 
            style={{ color: "#667eea", textDecoration: "none", fontWeight: "600" }}
          >
            Sign up
          </Link>
        </div>
      </form>
    </div>
  );
}
