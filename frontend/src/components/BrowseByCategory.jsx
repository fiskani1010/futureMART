import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AiOutlineLeft, AiOutlineRight } from "react-icons/ai";
import { SlCamera, SlClock, SlEarphones, SlGameController, SlScreenDesktop, SlScreenSmartphone } from "react-icons/sl";
import styles from "./BrowseByCategory.module.css";
import { STORE_CATEGORIES } from "../constants/storeCategories";
import { normalizeCategoryKey, slugifyCategoryName } from "../utils/categoryUtils";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

const FALLBACK_CATEGORIES = STORE_CATEGORIES.map((category) => ({
  name: category.name,
  slug: category.slug,
  count: 0,
}));

const getCategoryIcon = (categoryName) => {
  const normalized = normalizeCategoryKey(categoryName);

  if (normalized.includes("phone") || normalized.includes("mobile")) return SlScreenSmartphone;
  if (normalized.includes("computer") || normalized.includes("laptop") || normalized.includes("desktop")) {
    return SlScreenDesktop;
  }
  if (normalized.includes("watch")) return SlClock;
  if (normalized.includes("camera")) return SlCamera;
  if (
    normalized.includes("headphone") ||
    normalized.includes("earphone") ||
    normalized.includes("audio") ||
    normalized.includes("music")
  ) {
    return SlEarphones;
  }
  if (normalized.includes("gaming") || normalized.includes("game") || normalized.includes("console")) {
    return SlGameController;
  }

  return SlScreenDesktop;
};

const mapApiProducts = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export default function BrowseByCategory() {
  const rowRef = useRef(null);
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const cards = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        Icon: getCategoryIcon(category.name),
        featured: normalizeCategoryKey(category.name).includes("camera"),
      })),
    [categories],
  );

  const syncArrowState = () => {
    const row = rowRef.current;
    if (!row) return;

    const maxScrollLeft = Math.max(0, row.scrollWidth - row.clientWidth);
    setCanScrollLeft(row.scrollLeft > 4);
    setCanScrollRight(row.scrollLeft < maxScrollLeft - 4);
  };

  useEffect(() => {
    let isMounted = true;

    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/products`);
        const payload = await response.json().catch(() => []);
        if (!response.ok) return;

        const products = mapApiProducts(payload);
        const categoryMap = new Map();

        products.forEach((product) => {
          const name = String(product?.category_name || "").trim();
          if (!name) return;

          const key = normalizeCategoryKey(name);
          const slug = slugifyCategoryName(name);
          if (!key || !slug) return;

          const existing = categoryMap.get(key);
          if (existing) {
            existing.count += 1;
            return;
          }

          categoryMap.set(key, { name, slug, count: 1 });
        });

        const nextCategories = Array.from(categoryMap.values()).sort(
          (a, b) => b.count - a.count || a.name.localeCompare(b.name),
        );

        if (isMounted && nextCategories.length > 0) {
          setCategories(nextCategories);
        }
      } catch {
        // keep fallback categories
      }
    };

    fetchCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return undefined;

    syncArrowState();
    row.addEventListener("scroll", syncArrowState);
    window.addEventListener("resize", syncArrowState);

    return () => {
      row.removeEventListener("scroll", syncArrowState);
      window.removeEventListener("resize", syncArrowState);
    };
  }, [cards.length]);

  const scrollCards = (direction) => {
    const row = rowRef.current;
    if (!row) return;
    row.scrollBy({
      left: direction * 240,
      behavior: "smooth",
    });
  };

  return (
    <section className={styles.section}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>
            <span aria-hidden="true" />
            Categories
          </p>
          <h2>Browse By Category</h2>
        </div>

        <div className={styles.arrows}>
          <button
            type="button"
            onClick={() => scrollCards(-1)}
            aria-label="Scroll categories left"
            disabled={!canScrollLeft}
          >
            <AiOutlineLeft />
          </button>
          <button
            type="button"
            onClick={() => scrollCards(1)}
            aria-label="Scroll categories right"
            disabled={!canScrollRight}
          >
            <AiOutlineRight />
          </button>
        </div>
      </header>

      <div className={styles.grid} ref={rowRef}>
        {cards.map((category) => {
          const Icon = category.Icon;
          return (
            <Link
              key={category.slug}
              to={`/category/${category.slug}`}
              className={`${styles.card} ${category.featured ? styles.cardFeatured : ""}`}
            >
              <Icon />
              <span>{category.name}</span>
              {category.count > 0 ? <small>{category.count} product{category.count === 1 ? "" : "s"}</small> : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
