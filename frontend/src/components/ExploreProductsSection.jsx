import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AiFillHeart,
  AiFillStar,
  AiOutlineEye,
  AiOutlineHeart,
  AiOutlineLeft,
  AiOutlineRight,
} from "react-icons/ai";
import styles from "./ExploreProductsSection.module.css";
import {
  WISHLIST_UPDATED_EVENT,
  addToCart,
  getWishlistIds,
  toggleWishlist,
} from "../utils/shopStorage";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const FALLBACK_IMAGE = "https://via.placeholder.com/640x420?text=Product";

const resolveImageUrl = (rawUrl) => {
  if (!rawUrl) return FALLBACK_IMAGE;
  if (/^https?:\/\//i.test(rawUrl) || rawUrl.startsWith("data:")) return rawUrl;
  if (rawUrl.startsWith("/")) return API_BASE_URL ? `${API_BASE_URL}${rawUrl}` : rawUrl;
  return rawUrl;
};

const mapProducts = (rows) =>
  (Array.isArray(rows) ? rows : [])
    .map((product) => {
      const price = Number(product?.price);
      const oldPrice =
        product?.old_price === null || product?.old_price === undefined ? null : Number(product.old_price);

      return {
        id: product?.id,
        name: product?.name || "Product",
        image: resolveImageUrl(product?.image),
        price: Number.isFinite(price) ? price : 0,
        oldPrice: Number.isFinite(oldPrice) ? oldPrice : null,
        stock: Math.max(0, Number(product?.stock) || 0),
        createdAt: product?.created_at ? new Date(product.created_at).getTime() : 0,
      };
    })
    .filter((product) => Boolean(product.id));

export default function ExploreProductsSection() {
  const carouselRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [wishlistIds, setWishlistIds] = useState(() => getWishlistIds());
  const [isLoading, setIsLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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

    const loadProducts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/products`);
        const payload = await response.json().catch(() => []);
        if (!response.ok) {
          if (isMounted) setProducts([]);
          return;
        }

        const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
        const mapped = mapProducts(rows);
        if (isMounted) {
          setProducts(
            [...mapped]
              .sort((a, b) => b.createdAt - a.createdAt || b.stock - a.stock)
              .slice(0, 8),
          );
        }
      } catch {
        if (isMounted) setProducts([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  const syncArrowState = () => {
    const row = carouselRef.current;
    if (!row) return;
    const maxScrollLeft = Math.max(0, row.scrollWidth - row.clientWidth);
    setCanScrollLeft(row.scrollLeft > 4);
    setCanScrollRight(row.scrollLeft < maxScrollLeft - 4);
  };

  useEffect(() => {
    const row = carouselRef.current;
    if (!row) return undefined;

    syncArrowState();
    row.addEventListener("scroll", syncArrowState);
    window.addEventListener("resize", syncArrowState);
    return () => {
      row.removeEventListener("scroll", syncArrowState);
      window.removeEventListener("resize", syncArrowState);
    };
  }, [products.length]);

  const hasProducts = useMemo(() => products.length > 0, [products.length]);

  const scrollCards = (direction) => {
    const row = carouselRef.current;
    if (!row) return;
    row.scrollBy({
      left: direction * 280,
      behavior: "smooth",
    });
  };

  const handleToggleLove = (productId) => {
    toggleWishlist(productId);
    setWishlistIds(getWishlistIds());
  };

  return (
    <section className={styles.section}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>
            <span aria-hidden="true" />
            Our Products
          </p>
          <h2>Explore Our Products</h2>
        </div>

        <div className={styles.arrows}>
          <button
            type="button"
            aria-label="Scroll products left"
            onClick={() => scrollCards(-1)}
            disabled={!canScrollLeft}
          >
            <AiOutlineLeft />
          </button>
          <button
            type="button"
            aria-label="Scroll products right"
            onClick={() => scrollCards(1)}
            disabled={!canScrollRight}
          >
            <AiOutlineRight />
          </button>
        </div>
      </header>

      {isLoading ? (
        <p className={styles.message}>Loading products...</p>
      ) : !hasProducts ? (
        <p className={styles.message}>No products available right now.</p>
      ) : (
        <div className={styles.grid} ref={carouselRef}>
          {products.map((product) => {
            const isLoved = wishlistIds.includes(product.id);
            const isNew = Date.now() - product.createdAt < 1000 * 60 * 60 * 24 * 21;

            return (
              <article key={product.id} className={styles.card}>
                <div className={styles.imageWrap}>
                  {isNew ? <span className={styles.newBadge}>NEW</span> : null}
                  <img src={product.image} alt={product.name} loading="lazy" />

                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={`${styles.iconButton} ${isLoved ? styles.iconButtonActive : ""}`}
                      aria-label={isLoved ? "Remove from wishlist" : "Add to wishlist"}
                      onClick={() => handleToggleLove(product.id)}
                    >
                      {isLoved ? <AiFillHeart /> : <AiOutlineHeart />}
                    </button>
                    <Link to={`/product/${product.id}`} className={styles.iconButton} aria-label={`Open ${product.name}`}>
                      <AiOutlineEye />
                    </Link>
                  </div>

                  <button type="button" className={styles.cartButton} onClick={() => addToCart(product.id, 1)}>
                    Add To Cart
                  </button>
                </div>

                <h3>
                  <Link to={`/product/${product.id}`}>{product.name}</Link>
                </h3>

                <p className={styles.priceRow}>
                  <span className={styles.price}>${product.price.toFixed(2)}</span>
                  {product.oldPrice !== null && product.oldPrice > product.price ? (
                    <span className={styles.oldPrice}>${product.oldPrice.toFixed(2)}</span>
                  ) : null}
                </p>

                <p className={styles.ratingRow}>
                  <span className={styles.stars}>
                    <AiFillStar />
                    <AiFillStar />
                    <AiFillStar />
                    <AiFillStar />
                    <AiFillStar />
                  </span>
                  <span>({product.stock})</span>
                </p>
              </article>
            );
          })}
        </div>
      )}

      <div className={styles.viewAllWrap}>
        <Link to="/category/all-products" className={styles.viewAllButton}>
          View All Products
        </Link>
      </div>
    </section>
  );
}
