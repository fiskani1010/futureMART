import { useState } from "react";
import { AiOutlineLock, AiOutlineMail, AiOutlineUser } from "react-icons/ai";
import { Link } from "react-router-dom";
import styles from "./Login.module.css";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export default function Register({ onSwitchToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState("details");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetAll = () => {
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setOtpCode("");
    setStep("details");
  };

  const requestCode = async () => {
    const res = await fetch(`${API_BASE_URL}/api/auth/register/request-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    return res.json().catch(() => ({})).then((data) => ({ ok: res.ok, data }));
  };

  const verifyCode = async () => {
    const res = await fetch(`${API_BASE_URL}/api/auth/register/verify-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: otpCode }),
    });
    return res.json().catch(() => ({})).then((data) => ({ ok: res.ok, data }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setMessage("");
    setIsError(false);

    if (step === "details") {
      if (password !== confirmPassword) {
        setMessage("Passwords do not match.");
        setIsError(true);
        return;
      }

      setIsSubmitting(true);
      try {
        const result = await requestCode();
        if (result.ok) {
          setStep("verify");
          setMessage(result.data.message || "Verification code sent to your email.");
          setIsError(false);
        } else {
          setMessage(result.data.message || "Could not send verification code.");
          setIsError(true);
        }
      } catch {
        setMessage("Server error");
        setIsError(true);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setMessage("Enter the 6-digit verification code sent to your email.");
      setIsError(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await verifyCode();
      if (result.ok) {
        setMessage(result.data.message || "Registration completed. You can now log in.");
        setIsError(false);
        resetAll();
      } else {
        setMessage(result.data.message || "Invalid verification code.");
        setIsError(true);
      }
    } catch {
      setMessage("Server error");
      setIsError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setMessage("");
    setIsError(false);
    try {
      const result = await requestCode();
      if (result.ok) {
        setMessage(result.data.message || "A new code has been sent.");
        setIsError(false);
      } else {
        setMessage(result.data.message || "Could not resend verification code.");
        setIsError(true);
      }
    } catch {
      setMessage("Server error");
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
          <p className={styles.subtitle}>
            {step === "details" ? "Enter your details below" : "Enter the 6-digit code sent to your email"}
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            {step === "details" ? (
              <>
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
              </>
            ) : (
              <>
                <div className={styles.inputGroup}>
                  <AiOutlineMail className={styles.icon} />
                  <input type="email" value={email} disabled aria-label="Registered email" />
                </div>

                <div className={styles.inputGroup}>
                  <AiOutlineLock className={styles.icon} />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="6-digit verification code"
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, ""))}
                    required
                  />
                </div>

                <div className={styles.secondaryActions}>
                  <button type="button" className={styles.ghostActionBtn} onClick={() => setStep("details")}>
                    Edit details
                  </button>
                  <button type="button" className={styles.ghostActionBtn} onClick={handleResendCode}>
                    Resend code
                  </button>
                </div>
              </>
            )}

            <div className={styles.actions}>
              <button type="submit" className={styles.loginBtn}>
                {isSubmitting
                  ? "Please wait..."
                  : step === "details"
                    ? "Send Verification Code"
                    : "Verify & Create Account"}
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
