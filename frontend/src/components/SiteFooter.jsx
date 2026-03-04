import { useState } from "react";
import { Link } from "react-router-dom";
import { AiOutlineFacebook, AiOutlineInstagram, AiOutlineSend, AiOutlineTwitter } from "react-icons/ai";
import { FiLinkedin } from "react-icons/fi";
import styles from "./SiteFooter.module.css";

const COMPANY_NAME = "FutureMart";
const COMPANY_EMAIL = "futuremart@gmail.com";
const COMPANY_PHONE = "0889874468";

export default function SiteFooter() {
  const [subscriberEmail, setSubscriberEmail] = useState("");

  const handleSubscribe = (event) => {
    event.preventDefault();

    const cleanEmail = subscriberEmail.trim();
    const subject = encodeURIComponent("Newsletter Subscription");
    const body = encodeURIComponent(
      cleanEmail
        ? `Hello ${COMPANY_NAME},\n\nPlease subscribe this email to your newsletter:\n${cleanEmail}`
        : `Hello ${COMPANY_NAME},\n\nI want to subscribe to your newsletter.`,
    );

    window.location.href = `mailto:${COMPANY_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div>
          <h3>{COMPANY_NAME}</h3>
          <strong className={styles.blockTitle}>Subscribe</strong>
          <p>Get 10% off your first order</p>
          <form className={styles.subscribe} onSubmit={handleSubscribe}>
            <input
              type="email"
              placeholder="Enter your email"
              aria-label="Enter your email"
              value={subscriberEmail}
              onChange={(event) => setSubscriberEmail(event.target.value)}
            />
            <button type="submit" aria-label="Subscribe">
              <AiOutlineSend />
            </button>
          </form>
        </div>

        <div>
          <h4>Support</h4>
          <p>Mzuzu, Chibavi (Physical Address)</p>
          <p>{COMPANY_EMAIL}</p>
          <p>{COMPANY_PHONE}</p>
        </div>

        <div>
          <h4>Account</h4>
          <Link to="/account">My Account</Link>
          <Link to="/login">Login / Register</Link>
          <Link to="/cart">Cart</Link>
          <Link to="/wishlist">Wishlist</Link>
          <Link to="/category/all-products">Shop</Link>
        </div>

        <div>
          <h4>Quick Link</h4>
          <a href="#" onClick={(event) => event.preventDefault()}>Privacy Policy</a>
          <a href="#" onClick={(event) => event.preventDefault()}>Terms Of Use</a>
          <a href="#" onClick={(event) => event.preventDefault()}>FAQ</a>
          <Link to="/contact">Contact</Link>
        </div>

        <div>
          <h4>Download App</h4>
          <p className={styles.downloadText}>Save $3 with App New User Only</p>
          <div className={styles.downloadRow}>
            <img
              src="https://api.qrserver.com/v1/create-qr-code/?size=88x88&data=https://exclusive-store.app"
              alt="Download app QR code"
            />
            <div className={styles.storeButtons}>
              <a href="#" onClick={(event) => event.preventDefault()}>Google Play</a>
              <a href="#" onClick={(event) => event.preventDefault()}>App Store</a>
            </div>
          </div>
          <div className={styles.socials}>
            <a href="#" aria-label="Facebook" onClick={(event) => event.preventDefault()}>
              <AiOutlineFacebook />
            </a>
            <a href="#" aria-label="Twitter" onClick={(event) => event.preventDefault()}>
              <AiOutlineTwitter />
            </a>
            <a href="#" aria-label="Instagram" onClick={(event) => event.preventDefault()}>
              <AiOutlineInstagram />
            </a>
            <a href="#" aria-label="LinkedIn" onClick={(event) => event.preventDefault()}>
              <FiLinkedin />
            </a>
          </div>
        </div>
      </div>

      <div className={styles.bottom}>© Copyright Rimel 2022. All right reserved</div>
    </footer>
  );
}
