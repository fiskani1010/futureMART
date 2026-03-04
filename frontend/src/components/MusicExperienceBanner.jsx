import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./MusicExperienceBanner.module.css";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const FALLBACK_IMAGE = "https://via.placeholder.com/900x420?text=Music+Product";

const AUDIO_HINTS = ["music", "speaker", "audio", "headphone", "earphone", "sound"];

const resolveImageUrl = (rawUrl) => {
  if (!rawUrl) return FALLBACK_IMAGE;
  if (/^https?:\/\//i.test(rawUrl) || rawUrl.startsWith("data:")) return rawUrl;
  if (rawUrl.startsWith("/")) return API_BASE_URL ? `${API_BASE_URL}${rawUrl}` : rawUrl;
  return rawUrl;
};

const normalizeValue = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");

const mapProducts = (rows) =>
  (Array.isArray(rows) ? rows : [])
    .map((product) => ({
      id: product?.id,
      name: product?.name || "Premium Audio Device",
      image: resolveImageUrl(product?.image),
      category: product?.category_name || "",
      totalSold: Math.max(0, Number(product?.total_sold) || 0),
      stock: Math.max(0, Number(product?.stock) || 0),
    }))
    .filter((product) => Boolean(product.id));

const pickMusicProduct = (rows) => {
  const products = mapProducts(rows);
  if (products.length === 0) {
    return {
      id: null,
      name: "Premium Audio Device",
      image: FALLBACK_IMAGE,
      category: "Audio",
      totalSold: 0,
      stock: 0,
    };
  }

  const audioCandidate = products.find((product) => {
    const searchable = normalizeValue(`${product.name} ${product.category}`);
    return AUDIO_HINTS.some((hint) => searchable.includes(hint));
  });

  if (audioCandidate) return audioCandidate;
  return products[0];
};

const getMonthEndTimestamp = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0).getTime();
};

const getRemainingTime = (targetTimestamp) => {
  const remainingMs = Math.max(0, targetTimestamp - Date.now());
  const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remainingMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((remainingMs / (1000 * 60)) % 60);
  const seconds = Math.floor((remainingMs / 1000) % 60);
  return { total: remainingMs, days, hours, minutes, seconds };
};

export default function MusicExperienceBanner() {
  const [product, setProduct] = useState(() => pickMusicProduct([]));
  const [targetTimestamp, setTargetTimestamp] = useState(() => getMonthEndTimestamp());
  const [remaining, setRemaining] = useState(() => getRemainingTime(getMonthEndTimestamp()));

  useEffect(() => {
    let isMounted = true;

    const loadProduct = async () => {
      try {
        const bestRes = await fetch(`${API_BASE_URL}/api/products/best-sellers?limit=20`);
        const bestRows = await bestRes.json().catch(() => []);
        if (bestRes.ok) {
          if (isMounted) setProduct(pickMusicProduct(bestRows));
          return;
        }

        const fallbackRes = await fetch(`${API_BASE_URL}/api/products`);
        const fallbackRows = await fallbackRes.json().catch(() => []);
        if (fallbackRes.ok && isMounted) {
          setProduct(pickMusicProduct(fallbackRows));
        }
      } catch {
        if (isMounted) setProduct(pickMusicProduct([]));
      }
    };

    loadProduct();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const tick = () => {
      const next = getRemainingTime(targetTimestamp);
      if (next.total <= 0) {
        const nextTarget = getMonthEndTimestamp();
        setTargetTimestamp(nextTarget);
        setRemaining(getRemainingTime(nextTarget));
        return;
      }
      setRemaining(next);
    };

    tick();
    const timerId = window.setInterval(tick, 1000);
    return () => window.clearInterval(timerId);
  }, [targetTimestamp]);

  const ctaLink = useMemo(
    () => (product?.id ? `/product/${product.id}` : "/category/all-products"),
    [product?.id],
  );

  return (
    <section className={styles.section}>
      <article className={styles.content}>
        <p className={styles.eyebrow}>Categories</p>
        <h2>Enhance Your Music Experience</h2>
        <p className={styles.productName}>{product.name}</p>

        <div className={styles.timerRow}>
          <div className={styles.timerItem}>
            <strong>{String(remaining.days).padStart(2, "0")}</strong>
            <span>Days</span>
          </div>
          <div className={styles.timerItem}>
            <strong>{String(remaining.hours).padStart(2, "0")}</strong>
            <span>Hours</span>
          </div>
          <div className={styles.timerItem}>
            <strong>{String(remaining.minutes).padStart(2, "0")}</strong>
            <span>Minutes</span>
          </div>
          <div className={styles.timerItem}>
            <strong>{String(remaining.seconds).padStart(2, "0")}</strong>
            <span>Seconds</span>
          </div>
        </div>

        <Link to={ctaLink} className={styles.buyNow}>
          Buy Now!
        </Link>
      </article>

      <div className={styles.media}>
        <img src={product.image} alt={product.name} loading="lazy" />
      </div>
    </section>
  );
}
