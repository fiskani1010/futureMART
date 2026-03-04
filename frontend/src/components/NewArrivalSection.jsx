import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./NewArrivalSection.module.css";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

const FALLBACK_CARDS = [
  {
    id: "fallback-1",
    title: "PlayStation 5",
    subtitle: "Black and White version of the PS5 coming out on sale.",
    image_url: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80",
    cta_text: "Shop Now",
    cta_link: "/category/all-products",
  },
  {
    id: "fallback-2",
    title: "Women's Collections",
    subtitle: "Featured woman collections that give you another vibe.",
    image_url: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80",
    cta_text: "Shop Now",
    cta_link: "/category/all-products",
  },
  {
    id: "fallback-3",
    title: "Speakers",
    subtitle: "Amazon wireless speakers",
    image_url: "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1200&q=80",
    cta_text: "Shop Now",
    cta_link: "/category/all-products",
  },
  {
    id: "fallback-4",
    title: "Perfume",
    subtitle: "GUCCI INTENSE OUD EDP",
    image_url: "https://images.unsplash.com/photo-1619994403073-2cecddf8c3b5?auto=format&fit=crop&w=1200&q=80",
    cta_text: "Shop Now",
    cta_link: "/category/all-products",
  },
];

const resolveImageUrl = (rawUrl) => {
  if (!rawUrl) return "";
  if (/^https?:\/\//i.test(rawUrl) || rawUrl.startsWith("data:")) return rawUrl;
  if (rawUrl.startsWith("/")) return API_BASE_URL ? `${API_BASE_URL}${rawUrl}` : rawUrl;
  return rawUrl;
};

const mapCards = (rows) =>
  (Array.isArray(rows) ? rows : [])
    .filter((card) => card && card.title && card.image_url)
    .map((card, index) => ({
      id: card.id ?? `card-${index + 1}`,
      title: card.title,
      subtitle: card.subtitle || "",
      image_url: resolveImageUrl(card.image_url),
      cta_text: card.cta_text || "Shop Now",
      cta_link: card.cta_link || "/",
    }));

const isExternalUrl = (url) => /^https?:\/\//i.test(url);

export default function NewArrivalSection() {
  const [cards, setCards] = useState(FALLBACK_CARDS);

  useEffect(() => {
    let isMounted = true;

    const loadCards = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/new-arrivals`);
        const payload = await response.json().catch(() => []);
        if (!response.ok) return;

        const mapped = mapCards(payload);
        if (isMounted && mapped.length > 0) {
          setCards(mapped);
        }
      } catch {
        // Keep fallback cards.
      }
    };

    loadCards();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleCards = useMemo(() => {
    const fallbackById = new Map(FALLBACK_CARDS.map((card) => [card.id, card]));
    const merged = [...cards];

    for (const fallback of fallbackById.values()) {
      if (merged.length >= 4) break;
      merged.push(fallback);
    }

    return merged.slice(0, 4);
  }, [cards]);

  return (
    <section className={styles.section}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>
          <span aria-hidden="true" />
          Featured
        </p>
        <h2>New Arrival</h2>
      </header>

      <div className={styles.grid}>
        {visibleCards.map((card, index) => {
          const areaClass =
            index === 0
              ? styles.cardLarge
              : index === 1
                ? styles.cardTop
                : index === 2
                  ? styles.cardBottomLeft
                  : styles.cardBottomRight;

          const CardCta = isExternalUrl(card.cta_link)
            ? (
              <a href={card.cta_link} target="_blank" rel="noreferrer">
                {card.cta_text}
              </a>
            )
            : (
              <Link to={card.cta_link}>{card.cta_text}</Link>
            );

          return (
            <article key={card.id} className={`${styles.card} ${areaClass}`}>
              <img src={card.image_url} alt={card.title} loading="lazy" />
              <div className={styles.overlay}>
                <h3>{card.title}</h3>
                {card.subtitle ? <p>{card.subtitle}</p> : null}
                {CardCta}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
