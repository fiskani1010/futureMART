import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AiOutlineLeft, AiOutlineRight } from "react-icons/ai";
import InlineLoader from "./InlineLoader";
import { addToCart } from "../utils/shopStorage";
import styles from "./FlashSalesCarousel.module.css";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "").replace(/\/api$/i, "");
const FALLBACK_IMAGE = "https://via.placeholder.com/640x420?text=Product";

const resolveImageUrl = (rawUrl) => {
  if (!rawUrl) return FALLBACK_IMAGE;
  if (/^https?:\/\//i.test(rawUrl) || rawUrl.startsWith("data:")) return rawUrl;
  if (rawUrl.startsWith("/")) return API_BASE_URL ? `${API_BASE_URL}${rawUrl}` : rawUrl;
  return rawUrl;
};

const computeDiscount = (price, oldPrice) => {
  if (!Number.isFinite(price) || !Number.isFinite(oldPrice) || oldPrice <= 0 || oldPrice <= price) {
    return 0;
  }

  return Math.round(((oldPrice - price) / oldPrice) * 100);
};

const mapProducts = (rows) =>
  (Array.isArray(rows) ? rows : [])
    .map((product) => {
      const price = Number(product?.price);
      const oldPrice = product?.old_price === null || product?.old_price === undefined
        ? null
        : Number(product.old_price);
      const discount = Number(product?.discount_percentage) || computeDiscount(price, oldPrice);

      return {
        id: product?.id,
        name: product?.name || "Product",
        image: resolveImageUrl(product?.image),
        price: Number.isFinite(price) ? price : 0,
        oldPrice: Number.isFinite(oldPrice) ? oldPrice : null,
        isFlash: Boolean(product?.is_flash_sale) || discount > 0,
        discount,
      };
    })
    .filter((product) => product.id && product.isFlash && product.discount > 0);

export default function FlashSalesCarousel() {
  const carouselRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const flashRes = await fetch(`${API_BASE_URL}/api/products/flash-sales`);
        const flashRows = await flashRes.json().catch(() => []);

        if (flashRes.ok) {
          if (isMounted) {
            setProducts(mapProducts(flashRows));
          }
          return;
        }

        const fallbackRes = await fetch(`${API_BASE_URL}/api/products`);
        const fallbackRows = await fallbackRes.json().catch(() => []);
        if (fallbackRes.ok && isMounted) {
          setProducts(mapProducts(fallbackRows));
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

  const scrollByCards = (direction) => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({
      left: direction * 320,
      behavior: "smooth",
    });
  };

  return (
    <section className={styles.flashSection}>
      <div className={styles.header}>
        <div>
          <p className={styles.today}>Today&apos;s</p>
          <h2>Flash Sales</h2>
        </div>

        <div className={styles.arrows}>
          <button type="button" onClick={() => scrollByCards(-1)} aria-label="Scroll flash sales left">
            <AiOutlineLeft />
          </button>
          <button type="button" onClick={() => scrollByCards(1)} aria-label="Scroll flash sales right">
            <AiOutlineRight />
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className={styles.message}>
          <InlineLoader label="Loading flash sale products..." />
        </p>
      ) : !hasProducts ? (
        <p className={styles.message}>No flash sale products available right now.</p>
      ) : (
        <div className={styles.carousel} ref={carouselRef}>
          {products.map((product) => (
            <article className={styles.card} key={product.id}>
              <span className={styles.discount}>-{product.discount}%</span>

              <img src={product.image} alt={product.name} className={styles.image} loading="lazy" />

              <h4>{product.name}</h4>

              <div className={styles.price}>
                <span className={styles.newPrice}>MWK {product.price.toFixed(2)}</span>
                {product.oldPrice !== null ? (
                  <span className={styles.oldPrice}>MWK {product.oldPrice.toFixed(2)}</span>
                ) : null}
              </div>

              <button type="button" className={styles.cartBtn} onClick={() => addToCart(product.id, 1)}>
                Add To Cart
              </button>
            </article>
          ))}
        </div>
      )}

      <div className={styles.viewAll}>
        <Link to="/category/all-products">View All Products</Link>
      </div>
    </section>
  );
}

