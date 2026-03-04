import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./CartPage.module.css";
import {
  CART_UPDATED_EVENT,
  clearCart,
  getCartItems,
  removeFromCart,
  setCartItemQuantity,
} from "../utils/shopStorage";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const FALLBACK_IMAGE = "https://via.placeholder.com/80x80?text=Item";
const COUPONS = {
  SAVE10: { discountRate: 0.1, label: "10% off applied." },
  FUTURE20: { discountRate: 0.2, label: "20% off applied." },
};

const resolveImageUrl = (rawUrl) => {
  if (!rawUrl) return FALLBACK_IMAGE;
  if (/^https?:\/\//i.test(rawUrl) || rawUrl.startsWith("data:")) return rawUrl;
  if (rawUrl.startsWith("/")) return API_BASE_URL ? `${API_BASE_URL}${rawUrl}` : rawUrl;
  return rawUrl;
};

const formatMoney = (value) => `Mkw ${Number(value || 0).toFixed(2)}`;

const toProductMap = (rows) =>
  (Array.isArray(rows) ? rows : []).reduce((acc, row) => {
    acc[row.id] = row;
    return acc;
  }, {});

export default function CartPage() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState(() => getCartItems());
  const [productsById, setProductsById] = useState({});
  const [quantityDraft, setQuantityDraft] = useState({});
  const [couponInput, setCouponInput] = useState("");
  const [activeCoupon, setActiveCoupon] = useState(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncCart = () => setCartItems(getCartItems());
    window.addEventListener(CART_UPDATED_EVENT, syncCart);
    window.addEventListener("storage", syncCart);

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchProducts = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/products`);
        const data = await response.json().catch(() => []);
        if (!response.ok) return;
        if (isMounted) {
          setProductsById(toProductMap(Array.isArray(data?.data) ? data.data : data));
        }
      } catch {
        if (isMounted) setProductsById({});
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setQuantityDraft((prev) => {
      const next = { ...prev };
      cartItems.forEach((item) => {
        if (!next[item.productId]) {
          next[item.productId] = item.quantity;
        }
      });

      Object.keys(next).forEach((key) => {
        const numericId = Number(key);
        if (!cartItems.some((item) => item.productId === numericId)) {
          delete next[key];
        }
      });

      return next;
    });
  }, [cartItems]);

  const cartRows = useMemo(
    () =>
      cartItems
        .map((item) => {
          const product = productsById[item.productId];
          if (!product) return null;
          return {
            productId: item.productId,
            quantity: item.quantity,
            name: product.name,
            price: Number(product.price) || 0,
            image: resolveImageUrl(product.image),
          };
        })
        .filter(Boolean),
    [cartItems, productsById],
  );

  const subtotal = useMemo(
    () =>
      cartRows.reduce((total, row) => {
        const quantity = Number(quantityDraft[row.productId] || row.quantity || 1);
        return total + row.price * Math.max(1, quantity);
      }, 0),
    [cartRows, quantityDraft],
  );

  const discount = useMemo(() => {
    if (!activeCoupon) return 0;
    return subtotal * activeCoupon.discountRate;
  }, [activeCoupon, subtotal]);

  const total = Math.max(0, subtotal - discount);

  const handleUpdateCart = () => {
    cartRows.forEach((row) => {
      const nextQty = Math.max(1, Number(quantityDraft[row.productId] || 1));
      setCartItemQuantity(row.productId, nextQty);
    });
    setCartItems(getCartItems());
  };

  const handleApplyCoupon = () => {
    const normalized = couponInput.trim().toUpperCase();
    if (!normalized) {
      setActiveCoupon(null);
      setCouponMessage("Enter a coupon code first.");
      return;
    }

    const matchedCoupon = COUPONS[normalized];
    if (!matchedCoupon) {
      setActiveCoupon(null);
      setCouponMessage("Coupon code is invalid.");
      return;
    }

    setActiveCoupon(matchedCoupon);
    setCouponMessage(matchedCoupon.label);
  };

  const handleProceedToCheckout = () => {
    navigate("/checkout", {
      state: {
        couponCode: activeCoupon ? couponInput.trim().toUpperCase() : "",
      },
    });
  };

  return (
    <main className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link to="/">Home</Link>
        <span>/</span>
        <span>Cart</span>
      </div>

      {loading ? (
        <section className={styles.emptyState}>Loading cart...</section>
      ) : cartRows.length === 0 ? (
        <section className={styles.emptyState}>
          <p>Your cart is empty.</p>
          <Link to="/" className={styles.primaryAction}>
            Return To Shop
          </Link>
        </section>
      ) : (
        <>
          <section className={styles.tableWrap}>
            <header className={styles.tableHead}>
              <span>Product</span>
              <span>Price</span>
              <span>Quantity</span>
              <span>Subtotal</span>
            </header>

            <div className={styles.tableBody}>
              {cartRows.map((row) => {
                const selectedQty = Math.max(1, Number(quantityDraft[row.productId] || row.quantity));
                const rowSubtotal = row.price * selectedQty;

                return (
                  <article key={row.productId} className={styles.row}>
                    <div className={styles.productCell}>
                      <button
                        type="button"
                        className={styles.removeBtn}
                        aria-label={`Remove ${row.name} from cart`}
                        onClick={() => removeFromCart(row.productId)}
                      >
                        ×
                      </button>
                      <img src={row.image} alt={row.name} loading="lazy" />
                      <span>{row.name}</span>
                    </div>
                    <span>{formatMoney(row.price)}</span>
                    <label className={styles.qtyCell}>
                      <select
                        value={selectedQty}
                        onChange={(event) =>
                          setQuantityDraft((prev) => ({
                            ...prev,
                            [row.productId]: Number(event.target.value),
                          }))
                        }
                        aria-label={`Quantity for ${row.name}`}
                      >
                        {Array.from({ length: 10 }, (_, index) => index + 1).map((qty) => (
                          <option key={qty} value={qty}>
                            {String(qty).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                    </label>
                    <span>{formatMoney(rowSubtotal)}</span>
                  </article>
                );
              })}
            </div>
          </section>

          <section className={styles.rowActions}>
            <Link to="/" className={styles.secondaryAction}>
              Return To Shop
            </Link>
            <button type="button" className={styles.secondaryAction} onClick={handleUpdateCart}>
              Update Cart
            </button>
          </section>

          <section className={styles.summaryLayout}>
            <div className={styles.couponBox}>
              <input
                type="text"
                value={couponInput}
                onChange={(event) => setCouponInput(event.target.value)}
                placeholder="Coupon Code"
                aria-label="Coupon code"
              />
              <button type="button" className={styles.couponBtn} onClick={handleApplyCoupon}>
                Apply Coupon
              </button>
              {couponMessage ? <p className={styles.couponMessage}>{couponMessage}</p> : null}
            </div>

            <aside className={styles.totalCard}>
              <h2>Cart Total</h2>
              <div className={styles.totalRow}>
                <span>Subtotal:</span>
                <strong>{formatMoney(subtotal)}</strong>
              </div>
              <div className={styles.totalRow}>
                <span>Shipping:</span>
                <strong>Free</strong>
              </div>
              <div className={styles.totalRow}>
                <span>Discount:</span>
                <strong>- {formatMoney(discount)}</strong>
              </div>
              <div className={styles.totalRow}>
                <span>Total:</span>
                <strong>{formatMoney(total)}</strong>
              </div>

              <button type="button" className={styles.checkoutBtn} onClick={handleProceedToCheckout}>
                Process to checkout
              </button>
              <button type="button" className={styles.clearBtn} onClick={clearCart}>
                Clear Cart
              </button>
            </aside>
          </section>
        </>
      )}
    </main>
  );
}
