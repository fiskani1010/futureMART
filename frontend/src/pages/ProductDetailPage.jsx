import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AiFillStar, AiOutlineHeart, AiOutlineReload, AiOutlineTruck } from "react-icons/ai";
import InlineLoader from "../components/InlineLoader";
import styles from "./ProductDetailPage.module.css";
import { addToCart } from "../utils/shopStorage";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "").replace(/\/api$/i, "");
const FALLBACK_IMAGE = "https://via.placeholder.com/780x620?text=Product";

const resolveImageUrl = (rawUrl) => {
  if (!rawUrl) return FALLBACK_IMAGE;
  if (/^https?:\/\//i.test(rawUrl) || rawUrl.startsWith("data:")) return rawUrl;
  if (rawUrl.startsWith("/")) return API_BASE_URL ? `${API_BASE_URL}${rawUrl}` : rawUrl;
  return rawUrl;
};

const normalizeRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export default function ProductDetailPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const numericProductId = Number(productId);

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedImage, setSelectedImage] = useState(FALLBACK_IMAGE);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setErrorMessage("");

    const loadProduct = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/products/${numericProductId}`);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (isMounted) {
            setErrorMessage(data.message || "Could not load this product.");
            setProduct(null);
          }
          return;
        }

        if (isMounted) {
          setProduct(data);
          setSelectedImage(resolveImageUrl(data.image));
        }
      } catch {
        if (isMounted) {
          setErrorMessage("Network error while loading product details.");
          setProduct(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProduct();
    return () => {
      isMounted = false;
    };
  }, [numericProductId]);

  useEffect(() => {
    if (!product) return;
    let isMounted = true;

    const loadRelated = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/products`);
        const data = await response.json().catch(() => []);
        if (!response.ok) return;

        const allProducts = normalizeRows(data);
        const filtered = allProducts
          .filter((item) => item.id !== product.id)
          .filter((item) =>
            product.category_name
              ? item.category_name === product.category_name
              : true,
          )
          .slice(0, 4);

        if (isMounted) {
          setRelatedProducts(filtered);
        }
      } catch {
        if (isMounted) setRelatedProducts([]);
      }
    };

    loadRelated();
    return () => {
      isMounted = false;
    };
  }, [product]);

  const gallery = useMemo(() => {
    if (!product) return [];
    const main = resolveImageUrl(product.image);
    const relatedImages = relatedProducts.map((item) => resolveImageUrl(item.image));
    return [main, ...relatedImages].slice(0, 4);
  }, [product, relatedProducts]);

  const stockValue = Number(product?.stock) || 0;
  const inStock = stockValue > 0;
  const subtotal = (Number(product?.price) || 0) * quantity;

  const handleBuyNow = () => {
    if (!product || !inStock) return;
    addToCart(product.id, quantity);
    navigate("/checkout");
  };

  if (loading) {
    return (
      <main className={styles.page}>
        <section className={styles.message}>
          <InlineLoader label="Loading product details..." />
        </section>
      </main>
    );
  }

  if (!product || errorMessage) {
    return (
      <main className={styles.page}>
        <section className={styles.message}>
          <p>{errorMessage || "Product not found."}</p>
          <Link to="/" className={styles.linkBack}>Back to Home</Link>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link to="/">Account</Link>
        <span>/</span>
        <span>{product.category_name || "Products"}</span>
        <span>/</span>
        <span>{product.name}</span>
      </div>

      <section className={styles.mainLayout}>
        <div className={styles.galleryStrip}>
          {gallery.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              className={`${styles.thumbBtn} ${selectedImage === image ? styles.thumbBtnActive : ""}`}
              onClick={() => setSelectedImage(image)}
            >
              <img src={image} alt={`${product.name} preview ${index + 1}`} />
            </button>
          ))}
        </div>

        <div className={styles.mainImageWrap}>
          <img src={selectedImage} alt={product.name} />
        </div>

        <aside className={styles.detailCard}>
          <h1>{product.name}</h1>
          <div className={styles.ratingRow}>
            <span className={styles.stars}>
              {Array.from({ length: 5 }).map((_, index) => (
                <AiFillStar key={index} />
              ))}
            </span>
            <span className={styles.reviewCount}>(150 Reviews)</span>
            <span className={inStock ? styles.stockIn : styles.stockOut}>
              {inStock ? "In Stock" : "Out of Stock"}
            </span>
          </div>

          <p className={styles.price}>MWK {Number(product.price).toFixed(2)}</p>
          <p className={styles.description}>
            {product.description || "No product description available."}
          </p>

          <div className={styles.divider} />

          <div className={styles.optionRow}>
            <span>Colours:</span>
            <div className={styles.colorDots}>
              <span className={styles.dotBlue} />
              <span className={styles.dotRed} />
            </div>
          </div>

          <div className={styles.optionRow}>
            <span>Size:</span>
            <div className={styles.sizeList}>
              {["XS", "S", "M", "L", "XL"].map((size) => (
                <button key={size} type="button">{size}</button>
              ))}
            </div>
          </div>

          <div className={styles.buyRow}>
            <div className={styles.qtyControl}>
              <button type="button" onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}>-</button>
              <span>{quantity}</span>
              <button type="button" onClick={() => setQuantity((prev) => prev + 1)}>+</button>
            </div>

            <button type="button" className={styles.buyBtn} onClick={handleBuyNow} disabled={!inStock}>
              Buy Now
            </button>
            <button type="button" className={styles.wishBtn} aria-label="Add to wishlist">
              <AiOutlineHeart />
            </button>
          </div>

          <p className={styles.subtotal}>Subtotal: MWK {subtotal.toFixed(2)}</p>

          <div className={styles.deliveryCard}>
            <article>
              <AiOutlineTruck />
              <div>
                <h3>Free Delivery</h3>
                <p>Enter your postal code for delivery availability.</p>
              </div>
            </article>
            <article>
              <AiOutlineReload />
              <div>
                <h3>Return Delivery</h3>
                <p>Free 30 Days Delivery Returns.</p>
              </div>
            </article>
          </div>
        </aside>
      </section>

      <section className={styles.relatedSection}>
        <p className={styles.relatedTag}>Related Item</p>
        <div className={styles.relatedGrid}>
          {relatedProducts.map((item) => (
            <article key={item.id} className={styles.relatedCard}>
              <Link to={`/product/${item.id}`}>
                <img src={resolveImageUrl(item.image)} alt={item.name} />
                <h2>{item.name}</h2>
              </Link>
              <p>MWK {Number(item.price).toFixed(2)}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

