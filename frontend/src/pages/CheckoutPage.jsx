import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import InlineLoader from "../components/InlineLoader";
import styles from "./CheckoutPage.module.css";
import { CART_UPDATED_EVENT, clearCart, getCartItems } from "../utils/shopStorage";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "").replace(/\/api$/i, "");
const FALLBACK_IMAGE = "https://via.placeholder.com/72x72?text=Item";
const PROFILE_STORAGE_KEY = "futuremart_checkout_profile";
const COUPONS = {
  SAVE10: { discountRate: 0.1, label: "10% off applied." },
  FUTURE20: { discountRate: 0.2, label: "20% off applied." },
};

const PAYMENT_METHODS = [
  { id: "bank_card", label: "Bank / Card", detail: "Visa, Mastercard and local banks" },
  { id: "cash", label: "Cash on delivery", detail: "Pay when your order arrives" },
  { id: "mpamba", label: "TNM Mpamba", detail: "Use your Mpamba wallet" },
  { id: "airtel_money", label: "Airtel Money", detail: "Use your Airtel Money wallet" },
];

const MALAWI_BANKS = [
  "National Bank of Malawi",
  "FDH Bank",
  "Standard Bank Malawi",
  "NBS Bank",
  "First Capital Bank",
];
const PAYMENT_LABEL_BY_ID = {
  bank_card: "Bank / Card",
  cash: "Cash on delivery",
  mpamba: "TNM Mpamba",
  airtel_money: "Airtel Money",
};

const resolveImageUrl = (rawUrl) => {
  if (!rawUrl) return FALLBACK_IMAGE;
  if (/^https?:\/\//i.test(rawUrl) || rawUrl.startsWith("data:")) return rawUrl;
  if (rawUrl.startsWith("/")) return API_BASE_URL ? `${API_BASE_URL}${rawUrl}` : rawUrl;
  return rawUrl;
};

const toProductMap = (rows) =>
  (Array.isArray(rows) ? rows : []).reduce((acc, row) => {
    acc[row.id] = row;
    return acc;
  }, {});

const normalizeProductRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const formatMoney = (value) => `MWK ${Number(value || 0).toFixed(2)}`;

const readCheckoutProfile = () => {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState(() => getCartItems());
  const [productsById, setProductsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(() => ({
    firstName: "",
    companyName: "",
    streetAddress: "",
    apartment: "",
    city: "",
    phoneNumber: "",
    email: "",
    saveInfo: true,
  }));
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [selectedBank, setSelectedBank] = useState(MALAWI_BANKS[0]);
  const [couponInput, setCouponInput] = useState("");
  const [activeCoupon, setActiveCoupon] = useState(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);

  useEffect(() => {
    const storedProfile = readCheckoutProfile();
    if (storedProfile) {
      setFormData((prev) => ({
        ...prev,
        ...storedProfile,
        saveInfo: true,
      }));
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSessionAndProfile = async () => {
      try {
        const sessionRes = await fetch(`${API_BASE_URL}/api/auth/me`, {
          method: "GET",
          credentials: "include",
        });
        if (!sessionRes.ok) {
          if (isMounted) setSessionUser(null);
          return;
        }

        const sessionPayload = await sessionRes.json().catch(() => ({}));
        const user = sessionPayload?.user || null;
        if (isMounted) setSessionUser(user);
        if (!user) return;

        const profileRes = await fetch(`${API_BASE_URL}/api/account/profile`, {
          credentials: "include",
        });
        if (!profileRes.ok) return;

        const profilePayload = await profileRes.json().catch(() => ({}));
        if (!isMounted) return;

        const profile = profilePayload?.profile || {};
        const accountUser = profilePayload?.user || {};
        setFormData((prev) => ({
          ...prev,
          firstName: profile.first_name || prev.firstName,
          streetAddress: profile.address_line || prev.streetAddress,
          city: profile.city || prev.city,
          phoneNumber: profile.phone_number || prev.phoneNumber,
          email: accountUser.email || prev.email,
        }));
      } catch {
        if (isMounted) setSessionUser(null);
      }
    };

    loadSessionAndProfile();
    return () => {
      isMounted = false;
    };
  }, []);

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

    const loadProducts = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/products`);
        const payload = await response.json().catch(() => []);
        if (!response.ok) {
          if (isMounted) setProductsById({});
          return;
        }

        if (isMounted) {
          setProductsById(toProductMap(normalizeProductRows(payload)));
        }
      } catch {
        if (isMounted) setProductsById({});
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const initialCoupon = String(location.state?.couponCode || "")
      .trim()
      .toUpperCase();
    if (!initialCoupon) return;

    const matchedCoupon = COUPONS[initialCoupon];
    if (!matchedCoupon) return;

    setCouponInput(initialCoupon);
    setActiveCoupon(matchedCoupon);
    setCouponMessage(matchedCoupon.label);
  }, [location.state]);

  const checkoutRows = useMemo(
    () =>
      cartItems
        .map((item) => {
          const product = productsById[item.productId];
          if (!product) return null;

          return {
            productId: item.productId,
            quantity: Math.max(1, Number(item.quantity) || 1),
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
      checkoutRows.reduce((total, row) => {
        return total + row.price * row.quantity;
      }, 0),
    [checkoutRows],
  );

  const discount = useMemo(() => {
    if (!activeCoupon) return 0;
    return subtotal * activeCoupon.discountRate;
  }, [activeCoupon, subtotal]);

  const total = Math.max(0, subtotal - discount);

  const handleFieldChange = (field) => (event) => {
    const nextValue = field === "saveInfo" ? event.target.checked : event.target.value;
    setFormData((prev) => ({
      ...prev,
      [field]: nextValue,
    }));
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

  const validateCheckout = () => {
    if (!formData.firstName.trim()) return "First name is required.";
    if (!formData.streetAddress.trim()) return "Street address is required.";
    if (!formData.city.trim()) return "Town/City is required.";
    if (!formData.phoneNumber.trim()) return "Phone number is required.";
    if (!formData.email.trim()) return "Email address is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      return "Enter a valid email address.";
    }
    return "";
  };

  const handlePlaceOrder = async () => {
    if (isPlacingOrder) return;
    if (checkoutRows.length === 0) {
      setErrorMessage("Your cart is empty.");
      setSuccessMessage("");
      return;
    }

    const validationError = validateCheckout();
    if (validationError) {
      setErrorMessage(validationError);
      setSuccessMessage("");
      return;
    }

    if (!sessionUser) {
      setErrorMessage("Please log in first to place an order and keep purchase history in My Account.");
      setSuccessMessage("");
      return;
    }

    setIsPlacingOrder(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const orderPayload = {
        items: checkoutRows.map((row) => ({
          product_id: row.productId,
          quantity: row.quantity,
        })),
        first_name: formData.firstName.trim(),
        last_name: "",
        company_name: formData.companyName.trim(),
        street_address: formData.streetAddress.trim(),
        apartment: formData.apartment.trim(),
        city: formData.city.trim(),
        phone_number: formData.phoneNumber.trim(),
        email: formData.email.trim(),
        payment_method: PAYMENT_LABEL_BY_ID[paymentMethod] || paymentMethod,
        bank_name: paymentMethod === "bank_card" ? selectedBank : "",
        coupon_code: activeCoupon ? couponInput.trim().toUpperCase() : "",
        discount_amount: discount,
      };

      const orderResponse = await fetch(`${API_BASE_URL}/api/orders`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const orderResult = await orderResponse.json().catch(() => ({}));
      if (!orderResponse.ok) {
        setErrorMessage(orderResult.message || "Could not place order.");
        return;
      }

      if (formData.saveInfo) {
        await fetch(`${API_BASE_URL}/api/account/profile`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: formData.firstName.trim(),
            last_name: "",
            email: formData.email.trim(),
            phone_number: formData.phoneNumber.trim(),
            address_line: formData.streetAddress.trim(),
            city: formData.city.trim(),
            payment_method: PAYMENT_LABEL_BY_ID[paymentMethod] || paymentMethod,
            current_password: "",
            new_password: "",
          }),
        }).catch(() => null);

        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(formData));
      }

      clearCart();
      const orderId = orderResult?.order?.id;
      setSuccessMessage(
        orderId
          ? `Order #${orderId} placed successfully. It is now available in your purchase history.`
          : "Order placed successfully. It is now available in your purchase history.",
      );
      setCouponInput("");
      setActiveCoupon(null);
      setCouponMessage("");
    } catch {
      setErrorMessage("Could not place order right now. Please try again.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link to="/">Account</Link>
        <span>/</span>
        <Link to="/about">My Account</Link>
        <span>/</span>
        <Link to="/category/all-products">Product</Link>
        <span>/</span>
        <Link to="/cart">View Cart</Link>
        <span>/</span>
        <span>CheckOut</span>
      </div>

      {loading ? (
        <section className={styles.message}>
          <InlineLoader label="Loading checkout details..." />
        </section>
      ) : checkoutRows.length === 0 ? (
        <section className={styles.emptyState}>
          <h1>Checkout</h1>
          <p>Your cart is empty.</p>
          {successMessage ? <p className={styles.successMessage}>{successMessage}</p> : null}
          <div className={styles.emptyActions}>
            <Link to="/" className={styles.primaryButton}>
              Return To Shop
            </Link>
            <button type="button" className={styles.secondaryButton} onClick={() => navigate("/cart")}>
              Back To Cart
            </button>
          </div>
        </section>
      ) : (
        <section className={styles.layout}>
          <section className={styles.billingSection}>
            <h1>Billing Details</h1>

            <label>
              First Name*
              <input
                type="text"
                value={formData.firstName}
                onChange={handleFieldChange("firstName")}
                autoComplete="given-name"
              />
            </label>

            <label>
              Company Name
              <input
                type="text"
                value={formData.companyName}
                onChange={handleFieldChange("companyName")}
                autoComplete="organization"
              />
            </label>

            <label>
              Street Address*
              <input
                type="text"
                value={formData.streetAddress}
                onChange={handleFieldChange("streetAddress")}
                autoComplete="street-address"
              />
            </label>

            <label>
              Apartment, floor, etc. (optional)
              <input
                type="text"
                value={formData.apartment}
                onChange={handleFieldChange("apartment")}
                autoComplete="address-line2"
              />
            </label>

            <label>
              Town/City*
              <input
                type="text"
                value={formData.city}
                onChange={handleFieldChange("city")}
                autoComplete="address-level2"
              />
            </label>

            <label>
              Phone Number*
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={handleFieldChange("phoneNumber")}
                autoComplete="tel"
                placeholder="e.g. 0889874468"
              />
            </label>

            <label>
              Email Address*
              <input
                type="email"
                value={formData.email}
                onChange={handleFieldChange("email")}
                autoComplete="email"
              />
            </label>

            <label className={styles.saveInfo}>
              <input
                type="checkbox"
                checked={formData.saveInfo}
                onChange={handleFieldChange("saveInfo")}
              />
              <span>Save this information for faster check-out next time</span>
            </label>
          </section>

          <aside className={styles.summarySection}>
            <div className={styles.productList}>
              {checkoutRows.map((row) => (
                <div key={row.productId} className={styles.productRow}>
                  <div className={styles.productMeta}>
                    <img src={row.image} alt={row.name} loading="lazy" />
                    <span>
                      {row.name} {row.quantity > 1 ? `x${row.quantity}` : ""}
                    </span>
                  </div>
                  <strong>{formatMoney(row.price * row.quantity)}</strong>
                </div>
              ))}
            </div>

            <div className={styles.totalRows}>
              <div>
                <span>Subtotal:</span>
                <strong>{formatMoney(subtotal)}</strong>
              </div>
              <div>
                <span>Shipping:</span>
                <strong>Free</strong>
              </div>
              <div>
                <span>Discount:</span>
                <strong>- {formatMoney(discount)}</strong>
              </div>
              <div className={styles.totalLine}>
                <span>Total:</span>
                <strong>{formatMoney(total)}</strong>
              </div>
            </div>

            <div className={styles.paymentMethods}>
              {PAYMENT_METHODS.map((method) => (
                <label key={method.id} className={styles.paymentOption}>
                  <input
                    type="radio"
                    name="payment_method"
                    value={method.id}
                    checked={paymentMethod === method.id}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                  />
                  <span>
                    <strong>{method.label}</strong>
                    <small>{method.detail}</small>
                  </span>
                </label>
              ))}
            </div>

            {paymentMethod === "bank_card" ? (
              <label className={styles.bankSelectWrap}>
                Malawi Bank
                <select value={selectedBank} onChange={(event) => setSelectedBank(event.target.value)}>
                  {MALAWI_BANKS.map((bankName) => (
                    <option key={bankName} value={bankName}>
                      {bankName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <div className={styles.couponRow}>
              <input
                type="text"
                placeholder="Coupon Code"
                value={couponInput}
                onChange={(event) => setCouponInput(event.target.value)}
                aria-label="Coupon code"
              />
              <button type="button" onClick={handleApplyCoupon}>
                Apply Coupon
              </button>
            </div>

            <button
              type="button"
              className={styles.placeOrderButton}
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder}
            >
              {isPlacingOrder ? "Placing..." : "Place Order"}
            </button>

            {couponMessage ? <p className={styles.couponMessage}>{couponMessage}</p> : null}
            {!sessionUser ? (
              <p className={styles.authNote}>
                Login is required for placing orders and tracking history. <Link to="/login">Go to Login</Link>
              </p>
            ) : null}
            {errorMessage ? <p className={styles.errorMessage}>{errorMessage}</p> : null}
            {successMessage ? <p className={styles.successMessage}>{successMessage}</p> : null}
          </aside>
        </section>
      )}
    </main>
  );
}

