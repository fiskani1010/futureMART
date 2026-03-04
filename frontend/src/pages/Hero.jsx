import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AiOutlineArrowRight, AiOutlineRight } from "react-icons/ai";
import styles from "./Hero.module.css";
import { STORE_CATEGORIES } from "../constants/storeCategories";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

const fallbackSlides = [
  {
    id: 1,
    image_url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9",
    subtitle: "iPhone 14 Series",
    title: "Up to 10% off Voucher",
    cta_text: "Shop Now",
    cta_link: "/",
  },
  {
    id: 2,
    image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
    subtitle: "New Collection",
    title: "Latest Sneakers",
    cta_text: "Explore",
    cta_link: "/",
  },
  {
    id: 3,
    image_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
    subtitle: "Upgrade Your Style",
    title: "Smart Watches",
    cta_text: "Discover",
    cta_link: "/",
  },
];

const resolveImageUrl = (rawUrl) => {
  if (!rawUrl) return "";
  if (/^https?:\/\//i.test(rawUrl) || rawUrl.startsWith("data:")) {
    return rawUrl;
  }

  if (rawUrl.startsWith("/")) {
    return API_BASE_URL ? `${API_BASE_URL}${rawUrl}` : rawUrl;
  }

  return rawUrl;
};

const normalizeSlides = (rows) =>
  rows
    .filter((slide) => slide && slide.image_url && slide.title)
    .map((slide, index) => ({
      id: slide.id ?? index + 1,
      image_url: resolveImageUrl(slide.image_url),
      subtitle: slide.subtitle || "FutureMart",
      title: slide.title,
      cta_text: slide.cta_text || "Shop Now",
      cta_link: slide.cta_link || "/",
    }));

const isExternalUrl = (url) => /^https?:\/\//i.test(url);

export default function Hero() {
  const [slides, setSlides] = useState(fallbackSlides);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchSlides = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/hero-slides`);
        if (!response.ok) return;

        const data = await response.json();
        if (!Array.isArray(data)) return;

        const mappedSlides = normalizeSlides(data);
        if (isMounted && mappedSlides.length > 0) {
          setSlides(mappedSlides);
        }
      } catch {
        // Fallback slides remain in place if API is unavailable.
      }
    };

    fetchSlides();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return () => {};

    const autoSlide = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);

    return () => clearInterval(autoSlide);
  }, [slides.length]);

  const activeSlideIndex = slides.length > 0 ? currentSlide % slides.length : 0;

  return (
    <section className={styles.hero}>
      <aside className={styles.heroLeft}>
        <p className={styles.menuTitle}>Browse Categories</p>
        <div className={styles.categoryList}>
          {STORE_CATEGORIES.map((category, index) => (
            <Link key={index} to={category.path}>
              <span>{category.name}</span>
              <AiOutlineRight />
            </Link>
          ))}
        </div>
      </aside>

      <div className={styles.heroRight}>
        <div
          className={styles.carousel}
          style={{
            transform: `translateX(-${activeSlideIndex * 100}%)`,
          }}
        >
          {slides.map((slide) => (
            <div key={slide.id} className={styles.slide}>
              <img src={slide.image_url} alt={slide.title} />

              <div className={styles.overlay}>
                <p className={styles.subhead}>
                  <span className={styles.fmBadge}>FM</span>
                  <span>{slide.subtitle}</span>
                </p>
                <h1>{slide.title}</h1>
                {isExternalUrl(slide.cta_link || "") ? (
                  <a
                    href={slide.cta_link}
                    className={styles.shopLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>{slide.cta_text || "Shop Now"}</span>
                    <AiOutlineArrowRight />
                  </a>
                ) : (
                  <Link to={slide.cta_link || "/"} className={styles.shopLink}>
                    <span>{slide.cta_text || "Shop Now"}</span>
                    <AiOutlineArrowRight />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.dots}>
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              className={`${styles.dot} ${index === activeSlideIndex ? styles.dotActive : ""}`}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
