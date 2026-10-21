
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
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
      const response = await api.post("/auth/register", form);
      const data = response.data;
      const token = data.token || data.data?.token;

      if (token) {
        localStorage.setItem("token", token);
        navigate("/dashboard");
      } else {
        // Some backends register the user without logging them in.
        setError(
          "Account created. Please log in with your new credentials."
        );
        navigate("/login");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Registration failed. Please check your details and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page auth-page">
      <h1>Create your account</h1>
      <p>Start your MindSpace journey.</p>

      <form onSubmit={handleSubmit} className="auth-form">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Your name"
          autoComplete="name"
          required
        />

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
          placeholder="Create a password"
          autoComplete="new-password"
          minLength={8}
          required
        />

        {error && <p className="form-error" role="alert">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>

      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </main>
  );
}
