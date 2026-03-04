import { useEffect, useState } from "react";
import { AiOutlineLock, AiOutlineMail, AiOutlineUser } from "react-icons/ai";
import { Link } from "react-router-dom";
import styles from "./Login.module.css";
import { setAuthUser } from "../../utils/authStorage";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

const getUserDisplayName = (user) => {
  if (!user) return "";
  return user.name || user.username || user.email || `User ${user.id ?? ""}`.trim();
};

export default function Login({ onSwitchToRegister, onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [welcomeUser, setWelcomeUser] = useState("");

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotStep, setForgotStep] = useState("request");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotIsError, setForgotIsError] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          credentials: "include",
        });
        if (!response.ok) return;

        const payload = await response.json().catch(() => ({}));
        if (!isMounted) return;

        const user = payload?.user || null;
        setWelcomeUser(getUserDisplayName(user));
        setAuthUser(user);
      } catch {
        // Ignore session lookup errors; user may not be logged in.
      }
    };

    loadSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setIsError(false);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, role }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.user) {
        const displayName = getUserDisplayName(data.user) || email;
        setWelcomeUser(displayName);
        setAuthUser(data.user);
        onLoginSuccess?.(data.user);
        setMessage("Login successful.");
        setIsError(false);
      } else {
        setMessage(data.message || "Login failed");
        setIsError(true);
      }
    } catch (error) {
      console.error(error);
      setMessage("Server error");
      setIsError(true);
    }
  };

  const requestResetCode = async () => {
    if (!forgotEmail.trim()) {
      setForgotMessage("Enter your email first.");
      setForgotIsError(true);
      return;
    }

    setForgotLoading(true);
    setForgotMessage("");
    setForgotIsError(false);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/password/request-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const payload = await response.json().catch(() => ({}));

      if (response.ok) {
        setForgotStep("reset");
        setForgotMessage(payload.message || "If your email exists, a reset code has been sent.");
        setForgotIsError(false);
      } else {
        setForgotMessage(payload.message || "Could not send reset code.");
        setForgotIsError(true);
      }
    } catch {
      setForgotMessage("Server error while requesting reset code.");
      setForgotIsError(true);
    } finally {
      setForgotLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!forgotEmail.trim() || !forgotCode.trim() || !forgotPassword || !forgotConfirmPassword) {
      setForgotMessage("Fill in all reset fields.");
      setForgotIsError(true);
      return;
    }

    if (forgotPassword !== forgotConfirmPassword) {
      setForgotMessage("New password and confirm password do not match.");
      setForgotIsError(true);
      return;
    }

    setForgotLoading(true);
    setForgotMessage("");
    setForgotIsError(false);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail,
          code: forgotCode,
          new_password: forgotPassword,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (response.ok) {
        setForgotMessage(payload.message || "Password reset successfully.");
        setForgotIsError(false);
        setForgotCode("");
        setForgotPassword("");
        setForgotConfirmPassword("");
      } else {
        setForgotMessage(payload.message || "Could not reset password.");
        setForgotIsError(true);
      }
    } catch {
      setForgotMessage("Server error while resetting password.");
      setForgotIsError(true);
    } finally {
      setForgotLoading(false);
    }
  };

  const toggleForgotPanel = () => {
    setForgotOpen((prev) => !prev);
    setForgotMessage("");
    setForgotIsError(false);
  };

  return (
    <section className={styles.authPage}>
      <div className={styles.authCard}>
        <div className={styles.imagePanel} aria-hidden="true">
          <img
            src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1100&q=80"
            alt=""
          />
        </div>

        <div className={styles.formPanel}>
          <Link to="/" className={styles.backHome}>
            Back to Home
          </Link>
          <h2 className={styles.title}>Log in to Exclusive</h2>
          <p className={styles.subtitle}>Enter your details below</p>
          {welcomeUser && <p className={styles.welcome}>Welcome, {welcomeUser}</p>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <AiOutlineMail className={styles.icon} />
              <input
                type="email"
                placeholder="Email or Phone Number"
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
              <AiOutlineUser className={styles.icon} />
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                aria-label="Select login role"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className={styles.actions}>
              <button type="submit" className={styles.loginBtn}>
                Log In
              </button>
              <button type="button" className={styles.forgotLink} onClick={toggleForgotPanel}>
                {forgotOpen ? "Close Forgot Password" : "Forgot Password?"}
              </button>
            </div>
          </form>

          {forgotOpen ? (
            <section className={styles.forgotPanel}>
              <h3>Forgot Password</h3>
              <p>Request a 6-digit reset code and use it to set a new password.</p>

              <div className={styles.inputGroup}>
                <AiOutlineMail className={styles.icon} />
                <input
                  type="email"
                  placeholder="Your account email"
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                />
              </div>

              {forgotStep === "reset" ? (
                <>
                  <div className={styles.inputGroup}>
                    <AiOutlineLock className={styles.icon} />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      placeholder="6-digit code"
                      value={forgotCode}
                      onChange={(event) => setForgotCode(event.target.value.replace(/\D/g, ""))}
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <AiOutlineLock className={styles.icon} />
                    <input
                      type="password"
                      placeholder="New password"
                      value={forgotPassword}
                      onChange={(event) => setForgotPassword(event.target.value)}
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <AiOutlineLock className={styles.icon} />
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      value={forgotConfirmPassword}
                      onChange={(event) => setForgotConfirmPassword(event.target.value)}
                    />
                  </div>
                </>
              ) : null}

              <div className={styles.secondaryActions}>
                <button type="button" className={styles.ghostActionBtn} onClick={requestResetCode}>
                  {forgotLoading ? "Please wait..." : "Send Code"}
                </button>

                {forgotStep === "reset" ? (
                  <button type="button" className={styles.ghostActionBtn} onClick={resetPassword}>
                    {forgotLoading ? "Please wait..." : "Reset Password"}
                  </button>
                ) : null}
              </div>

              {forgotMessage ? (
                <p className={`${styles.message} ${forgotIsError ? styles.errorMessage : styles.successMessage}`}>
                  {forgotMessage}
                </p>
              ) : null}
            </section>
          ) : null}

          {message && (
            <p className={`${styles.message} ${isError ? styles.errorMessage : styles.successMessage}`}>
              {message}
            </p>
          )}

          {onSwitchToRegister && (
            <p className={styles.switchText}>
              Do not have an account?
              <button
                type="button"
                className={styles.switchBtn}
                onClick={onSwitchToRegister}
              >
                Sign up
              </button>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
