import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import styles from "./ProductListingPage.module.css";
import {
  WISHLIST_UPDATED_EVENT,
  addToCart,
  getWishlistIds,
  toggleWishlist,
} from "../utils/shopStorage";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export default function WishlistPage() {
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
        const response = await fetch(`${API_BASE_URL}/api/products`);
        const data = await response.json().catch(() => []);

        if (!response.ok) {
          if (isMounted) {
            setErrorMessage(data.message || "Could not load wishlist products.");
            setProducts([]);
          }
          return;
        }

        if (isMounted) {
          setProducts(Array.isArray(data) ? data : []);
        }
      } catch {
        if (isMounted) {
          setErrorMessage("Network error while loading wishlist.");
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
  }, []);

  const lovedProducts = useMemo(
    () => products.filter((product) => wishlistIds.includes(product.id)),
    [products, wishlistIds],
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
        <h1>My Loved Products</h1>
        <p className={styles.subhead}>
          {lovedProducts.length} saved item{lovedProducts.length === 1 ? "" : "s"}.
        </p>
      </section>

      {loading ? (
        <section className={styles.messageCard}>Loading wishlist...</section>
      ) : errorMessage ? (
        <section className={`${styles.messageCard} ${styles.error}`}>{errorMessage}</section>
      ) : lovedProducts.length === 0 ? (
        <section className={styles.messageCard}>
          Your love list is empty.{" "}
          <Link to="/" className={styles.inlineLink}>
            Browse categories
          </Link>
        </section>
      ) : (
        <section className={styles.productGrid}>
          {lovedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isLoved
              onToggleLove={handleToggleLove}
              onBuy={handleBuy}
            />
          ))}
        </section>
      )}
    </main>
  );
}
