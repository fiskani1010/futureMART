import { useState } from "react";
import { Link } from "react-router-dom";
import { AiOutlineMail, AiOutlinePhone } from "react-icons/ai";
import styles from "./ContactPage.module.css";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/meelblpd";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [status, setStatus] = useState({ type: "", text: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: "", text: "" });

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Unable to send message");
      }

      setStatus({
        type: "success",
        text: "Message sent successfully. We will contact you soon.",
      });
      setFormData({ name: "", email: "", phone: "", message: "" });
    } catch {
      setStatus({
        type: "error",
        text: "Message failed to send. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link to="/">Home</Link>
        <span>/</span>
        <span>Contact</span>
      </div>

      <section className={styles.layout}>
        <aside className={styles.infoCard}>
          <div className={styles.infoBlock}>
            <div className={styles.iconWrap}>
              <AiOutlinePhone />
            </div>
            <h2>Call To Us</h2>
            <p>We are available 24/7, 7 days a week.</p>
            <p>Phone: +8801611112222</p>
          </div>

          <div className={styles.divider} />

          <div className={styles.infoBlock}>
            <div className={styles.iconWrap}>
              <AiOutlineMail />
            </div>
            <h2>Write To Us</h2>
            <p>Fill out our form and we will contact you within 24 hours.</p>
            <p>Email: customer@futuremart.com</p>
            <p>Email: support@futuremart.com</p>
          </div>
        </aside>

        <form className={styles.formCard} onSubmit={handleSubmit}>
          <div className={styles.inputRow}>
            <input
              type="text"
              name="name"
              placeholder="Your Name *"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Your Email *"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <input
              type="tel"
              name="phone"
              placeholder="Your Phone *"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>

          <textarea
            name="message"
            placeholder="Your Message"
            value={formData.message}
            onChange={handleChange}
            required
          />

          {status.text && (
            <p className={`${styles.status} ${status.type === "error" ? styles.error : styles.success}`}>
              {status.text}
            </p>
          )}

          <div className={styles.actions}>
            <button
              type="submit"
              disabled={isSubmitting}
              className={isSubmitting ? styles.submitting : ""}
            >
              {isSubmitting ? (
                <>
                  <span className={styles.spinner} aria-hidden="true" />
                  Sending Message...
                </>
              ) : (
                "Send Message"
              )}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
