import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AiFillHeart, AiFillStar, AiOutlineEye, AiOutlineHeart } from "react-icons/ai";
import styles from "./BestSellingProducts.module.css";
import { WISHLIST_UPDATED_EVENT, addToCart, getWishlistIds, toggleWishlist } from "../utils/shopStorage";

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
        totalSold: Math.max(0, Number(product?.total_sold) || 0),
        stock: Math.max(0, Number(product?.stock) || 0),
      };
    })
    .filter((product) => Boolean(product.id));

const topByFallbackSignals = (rows) =>
  [...rows]
    .sort((a, b) => b.stock - a.stock || b.price - a.price || a.name.localeCompare(b.name))
    .slice(0, 8);

export default function BestSellingProducts() {
  const [products, setProducts] = useState([]);
  const [wishlistIds, setWishlistIds] = useState(() => getWishlistIds());
  const [isLoading, setIsLoading] = useState(true);

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

    const load = async () => {
      setIsLoading(true);
      try {
        const bestRes = await fetch(`${API_BASE_URL}/api/products/best-sellers?limit=8`);
        const bestRows = await bestRes.json().catch(() => []);
        if (bestRes.ok) {
          if (isMounted) setProducts(mapProducts(bestRows));
          return;
        }

        const fallbackRes = await fetch(`${API_BASE_URL}/api/products`);
        const fallbackRows = await fallbackRes.json().catch(() => []);
        if (fallbackRes.ok && isMounted) {
          setProducts(topByFallbackSignals(mapProducts(fallbackRows)));
        }
      } catch {
        if (isMounted) setProducts([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const hasProducts = useMemo(() => products.length > 0, [products.length]);

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
            This Month
          </p>
          <h2>Best Selling Products</h2>
        </div>

        <Link to="/category/all-products" className={styles.viewAll}>
          View All
        </Link>
      </header>

      {isLoading ? (
        <p className={styles.message}>Loading best selling products...</p>
      ) : !hasProducts ? (
        <p className={styles.message}>No best selling products available yet.</p>
      ) : (
        <div className={styles.grid}>
          {products.map((product) => {
            const isLoved = wishlistIds.includes(product.id);
            return (
              <article key={product.id} className={styles.card}>
                <div className={styles.imageWrap}>
                  <img src={product.image} alt={product.name} loading="lazy" />

                  <div className={styles.quickActions}>
                    <button
                      type="button"
                      className={`${styles.iconButton} ${isLoved ? styles.iconButtonActive : ""}`}
                      aria-label={isLoved ? "Remove from wishlist" : "Add to wishlist"}
                      onClick={() => handleToggleLove(product.id)}
                    >
                      {isLoved ? <AiFillHeart /> : <AiOutlineHeart />}
                    </button>

                    <Link
                      className={styles.iconButton}
                      to={`/product/${product.id}`}
                      aria-label={`View ${product.name}`}
                    >
                      <AiOutlineEye />
                    </Link>
                  </div>
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

                <p className={styles.salesMeta}>
                  <span className={styles.stars}>
                    <AiFillStar />
                    <AiFillStar />
                    <AiFillStar />
                    <AiFillStar />
                    <AiFillStar />
                  </span>
                  <span>({product.totalSold} sold)</span>
                </p>

                <button
                  type="button"
                  className={styles.buyButton}
                  onClick={() => addToCart(product.id, 1)}
                  disabled={product.stock <= 0}
                >
                  {product.stock > 0 ? "Add To Cart" : "Unavailable"}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
