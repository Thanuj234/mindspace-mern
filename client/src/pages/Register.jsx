import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("details");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function requestOtp(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    const username = form.username.trim();
    if (username.length < 4) {
      setError("Username must be at least 4 characters long.");
      return;
    }
    if (!/^[a-zA-Z0-9_.]{4,30}$/.test(username)) {
      setError("Use 4–30 letters, numbers, underscores, or dots for your username.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/register/request-otp", {
        username,
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      setStep("otp");
      setMessage(response.data?.message || "Verification code sent. Check your email.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not send verification code. Check the email settings and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyAndRegister(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Enter the six-digit code sent to your email.");
      return;
    }
    setLoading(true);
    try {
      const response = await api.post("/auth/register/verify-otp", {
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        otp: otp.trim(),
      });
      const data = response.data;
      const token = data.token || data.data?.token;
      if (token) {
        localStorage.setItem("token", token);
        const user = data.user || data.data?.user;
        if (user) {
          localStorage.setItem("user", JSON.stringify({
            id: user.id || user._id || "",
            name: user.name || user.username || form.username.trim(),
            username: user.username || form.username.trim(),
            email: user.email || form.email.trim().toLowerCase(),
          }));
        }
        navigate("/dashboard");
      } else {
        setMessage("Email verified and account created. Please log in.");
        navigate("/login");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed. Check the code and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const response = await api.post("/auth/register/request-otp", {
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      setMessage(response.data?.message || "A new verification code was sent.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not resend the code yet.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page auth-page">
      <h1>Create your account</h1>
      <p>Start your MindSpace journey.</p>

      {step === "details" ? (
        <form onSubmit={requestOtp} className="auth-form">
          <label htmlFor="username">Username</label>
          <input id="username" name="username" value={form.username} onChange={handleChange}
            placeholder="Choose a username (4–30 characters)" autoComplete="username"
            minLength={4} maxLength={30} required />
          <small>Use letters, numbers, underscores, or dots.</small>

          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" value={form.email} onChange={handleChange}
            placeholder="you@example.com" autoComplete="email" required />

          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" value={form.password} onChange={handleChange}
            placeholder="Create a password" autoComplete="new-password" minLength={8} required />

          <label htmlFor="confirmPassword">Confirm password</label>
          <input id="confirmPassword" name="confirmPassword" type="password" value={form.confirmPassword}
            onChange={handleChange} placeholder="Enter your password again" autoComplete="new-password"
            minLength={8} required />

          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p role="status">{message}</p>}
          <button type="submit" disabled={loading}>
            {loading ? "Sending code..." : "Send email verification code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyAndRegister} className="auth-form">
          <p>Enter the six-digit verification code sent to <strong>{form.email}</strong>. The code expires in 10 minutes.</p>
          <label htmlFor="otp">Email verification code</label>
          <input id="otp" name="otp" type="text" inputMode="numeric" pattern="[0-9]{6}"
            maxLength={6} autoComplete="one-time-code" value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} required />
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p role="status">{message}</p>}
          <button type="submit" disabled={loading}>{loading ? "Verifying..." : "Verify and create account"}</button>
          <button type="button" disabled={loading} onClick={resendOtp}>Resend code</button>
          <button type="button" disabled={loading} onClick={() => { setStep("details"); setError(""); setMessage(""); }}>
            Back to details
          </button>
        </form>
      )}

      <p>Already have an account? <Link to="/login">Log in</Link></p>
    </main>
  );
}
