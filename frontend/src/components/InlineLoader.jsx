import styles from "./InlineLoader.module.css";

export default function InlineLoader({ label = "Loading..." }) {
  return (
    <span className={styles.loader} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

