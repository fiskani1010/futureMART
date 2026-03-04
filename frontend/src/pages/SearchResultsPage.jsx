import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import styles from "./ProductListingPage.module.css";
import {
  WISHLIST_UPDATED_EVENT,
  addToCart,
  getWishlistIds,
  toggleWishlist,
} from "../utils/shopStorage";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "").replace(/\/api$/i, "");

const normalizeResponseList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const query = (searchParams.get("q") || "").trim();

  const [products, setProducts] = useState([]);
  const [wishlistIds, setWishlistIds] = useState(() => getWishlistIds());
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const syncWishlist = () => setWishlistIds(getWishlistIds());
    window.addEventListener(WISHLIST_UPDATED_EVENT, syncWishlist);
    window.addEventListener("storage", syncWishlist);

    return () => {
      window.removeEventListener(WISHLIST_UPDATED_EVENT, syncWishlist);
      window.removeEventListener("storage", syncWishlist);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setErrorMessage("");

    const fetchProducts = async () => {
      try {
        const endpoint = query
          ? `${API_BASE_URL}/api/products?q=${encodeURIComponent(query)}`
          : `${API_BASE_URL}/api/products`;
        const response = await fetch(endpoint);
        const data = await response.json().catch(() => []);

        if (!response.ok) {
          if (isMounted) {
            setErrorMessage(data.message || "Could not load products for your search.");
            setProducts([]);
          }
          return;
        }

        if (isMounted) {
          setProducts(normalizeResponseList(data));
        }
      } catch {
        if (isMounted) {
          setErrorMessage("Network error while searching products.");
          setProducts([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProducts();
    return () => {
      isMounted = false;
    };
  }, [query]);

  const heading = useMemo(
    () => (query ? `Search Results for "${query}"` : "Browse All Products"),
    [query],
  );

  const handleToggleLove = (productId) => {
    toggleWishlist(productId);
    setWishlistIds(getWishlistIds());
  };

  const handleBuy = (productId) => {
    addToCart(productId, 1);
  };

  return (
    <main className={styles.page}>
      <section className={styles.head}>
        <h1>{heading}</h1>
        <p className={styles.subhead}>
          {products.length} product{products.length === 1 ? "" : "s"} found.
        </p>
      </section>

      {loading ? (
        <section className={styles.messageCard}>Searching products...</section>
      ) : errorMessage ? (
        <section className={`${styles.messageCard} ${styles.error}`}>{errorMessage}</section>
      ) : products.length === 0 ? (
        <section className={styles.messageCard}>
          No matching products found.{" "}
          <Link to="/" className={styles.inlineLink}>
            Back to Home
          </Link>
        </section>
      ) : (
        <section className={styles.productGrid}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isLoved={wishlistIds.includes(product.id)}
              onToggleLove={handleToggleLove}
              onBuy={handleBuy}
            />
          ))}
        </section>
      )}
    </main>
  );
}

