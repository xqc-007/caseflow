import { useState } from "react";

import { apiRequest } from "../api";

function Login({ onLogin, message }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/auth/login", {
        auth: false, method: "POST", body: { email, password },
      });
      if (typeof data?.token !== "string" || !Number.isInteger(data?.user?.id)) {
        throw new Error("CaseFlow returned an invalid sign-in response. Please try again.");
      }
      localStorage.setItem("caseflow_token", data.token);
      localStorage.setItem("caseflow_user", JSON.stringify(data.user));

      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-left">
          <div>
            <div className="soft-label" style={{ marginBottom: 20 }}>
              Internal Operations Platform
            </div>
            <h1>Clarity in complexity.</h1>
            <p>
              CaseFlow helps teams manage structured case workflows with notes,
              activity history, search, and operational visibility.
            </p>
          </div>
        </div>

        <div className="login-right">
          <div className="login-form">
            <h2>Sign in to CaseFlow</h2>
            <p>Access your internal workspace and continue managing cases.</p>

            {message && <p role="status">{message}</p>}
            <form onSubmit={handleSubmit} className="form-grid">
              <input
                type="email"
                aria-label="Email"
                autoComplete="username"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <input
                type="password"
                aria-label="Password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button className="glow-button" disabled={loading} type="submit">
                {loading ? "Signing in..." : "Login"}
              </button>

              {error && <p role="alert" style={{ color: "#ff8d8d", marginTop: 6 }}>{error}</p>}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;