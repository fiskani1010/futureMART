import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import InlineLoader from "../components/InlineLoader";
import ProductCard from "../components/ProductCard";
import styles from "./ProductListingPage.module.css";
import { categoryMatchesSlug, findCategoryDisplayName } from "../utils/categoryUtils";
import {
  WISHLIST_UPDATED_EVENT,
  addToCart,
  getWishlistIds,
  toggleWishlist,
} from "../utils/shopStorage";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "").replace(/\/api$/i, "");

export default function CategoryProductsPage() {
  const { categorySlug = "" } = useParams();
  const [products, setProducts] = useState([]);
  const [wishlistIds, setWishlistIds] = useState(() => getWishlistIds());
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const categoryName = useMemo(
    () => findCategoryDisplayName(categorySlug),
    [categorySlug],
  );

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
            setErrorMessage(data.message || "Could not load products for this category.");
            setProducts([]);
          }
          return;
        }

        if (isMounted) {
          setProducts(Array.isArray(data) ? data : []);
        }
      } catch {
        if (isMounted) {
          setErrorMessage("Network error while loading products.");
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
  }, [categorySlug]);

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (product) => categoryMatchesSlug(product.category_name || "", categorySlug),
      ),
    [products, categorySlug],
  );

  const showAllProducts = categorySlug === "all-products";
  const visibleProducts = showAllProducts ? products : filteredProducts;

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
        <h1>{categoryName}</h1>
        <p className={styles.subhead}>
          {visibleProducts.length} product{visibleProducts.length === 1 ? "" : "s"}
          {showAllProducts ? " available." : " in this category."}
        </p>
      </section>

      {loading ? (
        <section className={styles.messageCard}>
          <InlineLoader label="Loading products..." />
        </section>
      ) : errorMessage ? (
        <section className={`${styles.messageCard} ${styles.error}`}>{errorMessage}</section>
      ) : visibleProducts.length === 0 ? (
        <section className={styles.messageCard}>
          No products available in this category yet.{" "}
          <Link to="/" className={styles.inlineLink}>
            Back to Home
          </Link>
        </section>
      ) : (
        <>
          <section className={styles.productGrid}>
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isLoved={wishlistIds.includes(product.id)}
                onToggleLove={handleToggleLove}
                onBuy={handleBuy}
              />
            ))}
          </section>
        </>
      )}
    </main>
  );
}

