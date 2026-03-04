import { useState } from "react";
import { AiOutlineLock, AiOutlineMail, AiOutlineUser } from "react-icons/ai";
import { Link } from "react-router-dom";
import styles from "./Login.module.css";
import { buildApiUrl } from "../../utils/api";

const parseResponsePayload = async (response) => {
  const text = await response.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

export default function Register({ onSwitchToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registerAccount = async () => {
    const res = await fetch(buildApiUrl("/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password }),
    });
    const data = await parseResponsePayload(res);
    return { ok: res.ok, status: res.status, data };
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    setMessage("");
    setIsError(false);

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      setIsError(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await registerAccount();
      if (result.ok) {
        setMessage(result.data.message || "Account created successfully. You can now log in.");
        setIsError(false);
        resetForm();
      } else {
        setMessage(result.data.message || `Could not create account (${result.status}).`);
        setIsError(true);
      }
    } catch {
      setMessage("Request failed. Check API URL and CORS settings.");
      setIsError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={styles.authPage}>
      <div className={styles.authCard}>
        <div className={styles.imagePanel} aria-hidden="true">
          <img
            src="https://images.unsplash.com/photo-1607082350899-7e105aa886ae?auto=format&fit=crop&w=1100&q=80"
            alt=""
          />
        </div>

        <div className={styles.formPanel}>
          <Link to="/" className={styles.backHome}>
            Back to Home
          </Link>
          <h2 className={styles.title}>Create an account</h2>
          <p className={styles.subtitle}>Enter your details below</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <AiOutlineUser className={styles.icon} />
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <AiOutlineMail className={styles.icon} />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <AiOutlineLock className={styles.icon} />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <AiOutlineLock className={styles.icon} />
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>

            <div className={styles.actions}>
              <button type="submit" className={styles.loginBtn}>
                {isSubmitting ? "Please wait..." : "Create Account"}
              </button>
            </div>
          </form>

          {message && (
            <p className={`${styles.message} ${isError ? styles.errorMessage : styles.successMessage}`}>
              {message}
            </p>
          )}

          {onSwitchToLogin && (
            <p className={styles.switchText}>
              Already have an account?
              <button type="button" className={styles.switchBtn} onClick={onSwitchToLogin}>
                Log in
              </button>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
