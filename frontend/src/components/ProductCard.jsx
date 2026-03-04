import { AiFillHeart, AiOutlineHeart, AiOutlineShoppingCart } from "react-icons/ai";
import { Link } from "react-router-dom";
import styles from "./ProductCard.module.css";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "").replace(/\/api$/i, "");
const FALLBACK_IMAGE = "https://via.placeholder.com/640x420?text=Product";

const resolveImageUrl = (rawUrl) => {
  if (!rawUrl) return FALLBACK_IMAGE;
  if (/^https?:\/\//i.test(rawUrl) || rawUrl.startsWith("data:")) {
    return rawUrl;
  }
  if (rawUrl.startsWith("/")) {
    return API_BASE_URL ? `${API_BASE_URL}${rawUrl}` : rawUrl;
  }
  return rawUrl;
};

const getStockLabel = (stock) => {
  if (stock <= 0) return "Out of Stock";
  if (stock <= 5) return `Only ${stock} left`;
  return "In Stock";
};

export default function ProductCard({ product, isLoved, onToggleLove, onBuy }) {
  const stockValue = Number(product.stock) || 0;
  const isOutOfStock = stockValue <= 0;
  const imageSrc = resolveImageUrl(product.image);

  return (
    <article className={styles.card}>
      <div className={styles.imageWrap}>
        <Link to={`/product/${product.id}`} aria-label={`Open ${product.name}`}>
          <img
            src={imageSrc}
            alt={product.name}
            onError={(event) => {
              if (event.currentTarget.src !== FALLBACK_IMAGE) {
                event.currentTarget.src = FALLBACK_IMAGE;
              }
            }}
            loading="lazy"
          />
        </Link>
        <button
          type="button"
          className={`${styles.loveButton} ${isLoved ? styles.loveButtonActive : ""}`}
          aria-label={isLoved ? "Remove from wishlist" : "Add to wishlist"}
          onClick={() => onToggleLove(product.id)}
        >
          {isLoved ? <AiFillHeart /> : <AiOutlineHeart />}
        </button>
      </div>

      <div className={styles.content}>
        <p className={styles.category}>{product.category_name || "Uncategorized"}</p>
        <h3 className={styles.title}>
          <Link to={`/product/${product.id}`}>{product.name}</Link>
        </h3>
        <p className={styles.description}>{product.description || "No description available."}</p>

        <div className={styles.metaRow}>
          <strong className={styles.price}>MWK {Number(product.price || 0).toFixed(2)}</strong>
          <span className={`${styles.stock} ${isOutOfStock ? styles.stockOut : styles.stockIn}`}>
            {getStockLabel(stockValue)}
          </span>
        </div>

        <button
          type="button"
          className={styles.buyButton}
          onClick={() => onBuy(product.id)}
          disabled={isOutOfStock}
        >
          <AiOutlineShoppingCart />
          {isOutOfStock ? "Unavailable" : "Buy"}
        </button>
      </div>
    </article>
  );
}

