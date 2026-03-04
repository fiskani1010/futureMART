import { AiOutlineCar, AiOutlineCustomerService, AiOutlineSafety } from "react-icons/ai";
import styles from "./ServicesHighlights.module.css";

const POINTS = [
  {
    icon: AiOutlineCar,
    title: "FREE AND FAST DELIVERY",
    text: "Free delivery for all orders over $140",
  },
  {
    icon: AiOutlineCustomerService,
    title: "24/7 CUSTOMER SERVICE",
    text: "Friendly 24/7 customer support",
  },
  {
    icon: AiOutlineSafety,
    title: "MONEY BACK GUARANTEE",
    text: "We return money within 30 days",
  },
];

export default function ServicesHighlights() {
  return (
    <section className={styles.section}>
      {POINTS.map((point) => (
        <article key={point.title} className={styles.item}>
          <span className={styles.iconWrap}>
            <point.icon />
          </span>
          <h3>{point.title}</h3>
          <p>{point.text}</p>
        </article>
      ))}
    </section>
  );
}
