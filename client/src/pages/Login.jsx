
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", form);
      const data = response.data;

      const token = data.token || data.data?.token;

      if (!token) {
        setError(
          "Login succeeded, but no token was found in the response. Check the backend response format."
        );
        return;
      }

      localStorage.setItem("token", token);

const user = data.user || data.data?.user;

if (user) {
  localStorage.setItem(
    "user",
    JSON.stringify({
      name: user.name || user.username || "",
      email: user.email || form.email,
    })
  );
} else {
  localStorage.setItem(
    "user",
    JSON.stringify({ name: "", email: form.email })
  );
}

      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Unable to log in. Check your details and make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page auth-page">
      <h1>Welcome back</h1>
      <p>Log in to your MindSpace account.</p>

      <form onSubmit={handleSubmit} className="auth-form">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Enter your password"
          autoComplete="current-password"
          required
        />

        {error && <p className="form-error" role="alert">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p>
        Don't have an account? <Link to="/register">Sign up</Link>
      </p>
    </main>
  );
}
