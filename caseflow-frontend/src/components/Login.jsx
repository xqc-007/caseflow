import { useState } from "react";

function Login({ onLogin }) {
  const [email, setEmail] = useState("admin@caseflow.com");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5001/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        throw new Error("Invalid credentials");
      }

      const data = await res.json();

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

            <form onSubmit={handleSubmit} className="form-grid">
              <input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button className="glow-button" disabled={loading} type="submit">
                {loading ? "Signing in..." : "Login"}
              </button>

              {error && <p style={{ color: "#ff8d8d", marginTop: 6 }}>{error}</p>}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;