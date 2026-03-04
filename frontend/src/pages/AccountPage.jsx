import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./AccountPage.module.css";
import { WISHLIST_UPDATED_EVENT, getWishlistCount } from "../utils/shopStorage";
import { clearAuthUser } from "../utils/authStorage";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "").replace(/\/api$/i, "");

const formatMoney = (value) => `Mkw ${Number(value || 0).toFixed(2)}`;
const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const PAYMENT_METHOD_OPTIONS = [
  "Cash on delivery",
  "TNM Mpamba",
  "Airtel Money",
  "Bank / Card",
];

const normalizeOrderList = (payload) => (Array.isArray(payload) ? payload : []);

const DEFAULT_FORM = {
  first_name: "",
  last_name: "",
  email: "",
  phone_number: "",
  address_line: "",
  city: "",
  payment_method: "Cash on delivery",
};

export default function AccountPage() {
  const navigate = useNavigate();
  const [authLoading, setAuthLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [activePanel, setActivePanel] = useState("profile");
  const [profileLoading, setProfileLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [wishlistCount, setWishlistCount] = useState(() => getWishlistCount());
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [initialFormData, setInitialFormData] = useState(DEFAULT_FORM);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const syncWishlist = () => setWishlistCount(getWishlistCount());
    window.addEventListener(WISHLIST_UPDATED_EVENT, syncWishlist);
    window.addEventListener("storage", syncWishlist);
    return () => {
      window.removeEventListener(WISHLIST_UPDATED_EVENT, syncWishlist);
      window.removeEventListener("storage", syncWishlist);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadAccountData = async () => {
      setAuthLoading(true);
      setProfileLoading(true);
      setOrdersLoading(true);
      setAuthRequired(false);

      try {
        const profileResponse = await fetch(`${API_BASE_URL}/api/account/profile`, {
          credentials: "include",
        });

        if (profileResponse.status === 401) {
          if (isMounted) setAuthRequired(true);
          return;
        }

        const profilePayload = await profileResponse.json().catch(() => ({}));
        if (!profileResponse.ok) {
          if (isMounted) {
            setSaveError(profilePayload.message || "Could not load profile.");
          }
          return;
        }

        if (isMounted) {
          const profile = profilePayload?.profile || {};
          const user = profilePayload?.user || {};
          const normalizedForm = {
            first_name: profile.first_name || "",
            last_name: profile.last_name || "",
            email: user.email || "",
            phone_number: profile.phone_number || "",
            address_line: profile.address_line || "",
            city: profile.city || "",
            payment_method: profile.payment_method || "Cash on delivery",
          };
          setFormData(normalizedForm);
          setInitialFormData(normalizedForm);
        }
      } catch {
        if (isMounted) setSaveError("Network error while loading your account.");
      } finally {
        if (isMounted) {
          setProfileLoading(false);
          setAuthLoading(false);
        }
      }

      try {
        const ordersResponse = await fetch(`${API_BASE_URL}/api/orders/my-orders`, {
          credentials: "include",
        });
        const ordersPayload = await ordersResponse.json().catch(() => []);
        if (ordersResponse.ok && isMounted) {
          setOrders(normalizeOrderList(ordersPayload));
        } else if (isMounted) {
          setOrders([]);
        }
      } catch {
        if (isMounted) setOrders([]);
      } finally {
        if (isMounted) setOrdersLoading(false);
      }
    };

    loadAccountData();
    return () => {
      isMounted = false;
    };
  }, []);

  const totalSpent = useMemo(
    () => orders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0),
    [orders],
  );

  const handleFormField = (field) => (event) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handlePasswordField = (field) => (event) => {
    setPasswordForm((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleCancelEdit = () => {
    setFormData(initialFormData);
    setPasswordForm({
      current_password: "",
      new_password: "",
      confirm_password: "",
    });
    setSaveError("");
    setSaveMessage("");
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    if (isSaving) return;

    setSaveMessage("");
    setSaveError("");

    if (!formData.first_name.trim()) {
      setSaveError("First name is required.");
      return;
    }

    if (!formData.email.trim()) {
      setSaveError("Email is required.");
      return;
    }

    if (passwordForm.new_password && passwordForm.new_password !== passwordForm.confirm_password) {
      setSaveError("New password and confirm password do not match.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/account/profile`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone_number: formData.phone_number,
          address_line: formData.address_line,
          city: formData.city,
          payment_method: formData.payment_method,
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSaveError(payload.message || "Could not save changes.");
        return;
      }

      const normalizedForm = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone_number: formData.phone_number,
        address_line: formData.address_line,
        city: formData.city,
        payment_method: formData.payment_method,
      };
      setFormData(normalizedForm);
      setInitialFormData(normalizedForm);
      setSaveMessage(payload.message || "Profile updated successfully.");
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch {
      setSaveError("Network error while saving profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignore network/logout failures and clear local auth state.
    } finally {
      clearAuthUser();
      setIsLoggingOut(false);
      navigate("/login");
    }
  };

  if (authLoading) {
    return (
      <main className={styles.page}>
        <section className={styles.messageCard}>Loading your account...</section>
      </main>
    );
  }

  if (authRequired) {
    return (
      <main className={styles.page}>
        <section className={styles.messageCard}>
          <h1>My Account</h1>
          <p>Please log in to view your account details and purchase history.</p>
          <Link to="/login" className={styles.primaryButton}>
            Login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link to="/">Home</Link>
        <span>/</span>
        <span>My Account</span>
      </div>

      <section className={styles.topMeta}>
        <p>
          Orders: <strong>{orders.length}</strong>
        </p>
        <p>
          Total Spent: <strong>{formatMoney(totalSpent)}</strong>
        </p>
        <button type="button" className={styles.logoutButton} onClick={handleLogout} disabled={isLoggingOut}>
          {isLoggingOut ? "Logging out..." : "Log Out"}
        </button>
      </section>

      <section className={styles.layout}>
        <aside className={styles.sidebar}>
          <h3>Manage My Account</h3>
          <button
            type="button"
            className={activePanel === "profile" ? styles.activeNav : ""}
            onClick={() => setActivePanel("profile")}
          >
            My Profile
          </button>
          <button
            type="button"
            className={activePanel === "address" ? styles.activeNav : ""}
            onClick={() => setActivePanel("address")}
          >
            Address Book
          </button>
          <button
            type="button"
            className={activePanel === "payments" ? styles.activeNav : ""}
            onClick={() => setActivePanel("payments")}
          >
            My Payment Options
          </button>

          <h3>My Orders</h3>
          <button
            type="button"
            className={activePanel === "orders" ? styles.activeNav : ""}
            onClick={() => setActivePanel("orders")}
          >
            Purchase History
          </button>
          <button
            type="button"
            className={activePanel === "returns" ? styles.activeNav : ""}
            onClick={() => setActivePanel("returns")}
          >
            My Returns
          </button>
          <button
            type="button"
            className={activePanel === "cancellations" ? styles.activeNav : ""}
            onClick={() => setActivePanel("cancellations")}
          >
            My Cancellations
          </button>

          <h3>My Wishlist</h3>
          <Link to="/wishlist">Saved items ({wishlistCount})</Link>
        </aside>

        <section className={styles.mainPanel}>
          {activePanel === "profile" || activePanel === "address" || activePanel === "payments" ? (
            <form className={styles.profileCard} onSubmit={handleSaveProfile}>
              <h2>Edit Your Profile</h2>

              {profileLoading ? (
                <p className={styles.inlineMessage}>Loading profile...</p>
              ) : (
                <>
                  <div className={styles.twoCols}>
                    <label>
                      First Name
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={handleFormField("first_name")}
                        required
                      />
                    </label>
                    <label>
                      Last Name
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={handleFormField("last_name")}
                      />
                    </label>
                  </div>

                  <div className={styles.twoCols}>
                    <label>
                      Email
                      <input
                        type="email"
                        value={formData.email}
                        onChange={handleFormField("email")}
                        required
                      />
                    </label>
                    <label>
                      Address
                      <input
                        type="text"
                        value={formData.address_line}
                        onChange={handleFormField("address_line")}
                        placeholder="Mzuzu, Chibavi"
                      />
                    </label>
                  </div>

                  <div className={styles.twoCols}>
                    <label>
                      Phone Number
                      <input
                        type="tel"
                        value={formData.phone_number}
                        onChange={handleFormField("phone_number")}
                        placeholder="0889874468"
                      />
                    </label>
                    <label>
                      Town / City
                      <input
                        type="text"
                        value={formData.city}
                        onChange={handleFormField("city")}
                      />
                    </label>
                  </div>

                  <label>
                    Preferred Payment Method
                    <select value={formData.payment_method} onChange={handleFormField("payment_method")}>
                      {PAYMENT_METHOD_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <h3>Password Changes</h3>
                  <label>
                    Current Password
                    <input
                      type="password"
                      value={passwordForm.current_password}
                      onChange={handlePasswordField("current_password")}
                    />
                  </label>
                  <label>
                    New Password
                    <input
                      type="password"
                      value={passwordForm.new_password}
                      onChange={handlePasswordField("new_password")}
                    />
                  </label>
                  <label>
                    Confirm New Password
                    <input
                      type="password"
                      value={passwordForm.confirm_password}
                      onChange={handlePasswordField("confirm_password")}
                    />
                  </label>
                </>
              )}

              {saveError ? <p className={styles.errorMessage}>{saveError}</p> : null}
              {saveMessage ? <p className={styles.successMessage}>{saveMessage}</p> : null}

              <div className={styles.actions}>
                <button type="button" className={styles.cancelButton} onClick={handleCancelEdit}>
                  Cancel
                </button>
                <button type="submit" className={styles.saveButton} disabled={isSaving || profileLoading}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          ) : null}

          {activePanel === "orders" ? (
            <section className={styles.ordersCard}>
              <h2>Purchase History</h2>
              {ordersLoading ? (
                <p className={styles.inlineMessage}>Loading purchase history...</p>
              ) : orders.length === 0 ? (
                <p className={styles.inlineMessage}>
                  No purchases yet. <Link to="/category/all-products">Start shopping</Link>.
                </p>
              ) : (
                <div className={styles.ordersList}>
                  {orders.map((order) => (
                    <article key={order.id} className={styles.orderItem}>
                      <header>
                        <p>
                          <strong>Order #{order.id}</strong>
                        </p>
                        <p>{formatDate(order.created_at)}</p>
                        <p className={styles.statusBadge}>{order.status || "pending"}</p>
                      </header>

                      <div className={styles.orderMeta}>
                        <span>{order.payment?.payment_method || "N/A"}</span>
                        {order.payment?.bank_name ? <span>{order.payment.bank_name}</span> : null}
                        <strong>{formatMoney(order.total_amount)}</strong>
                      </div>

                      <div className={styles.orderProducts}>
                        {(Array.isArray(order.items) ? order.items : []).map((item) => (
                          <div key={`${order.id}-${item.product_id}-${item.product_name}`} className={styles.orderProductRow}>
                            <span>{item.product_name}</span>
                            <span>x{item.quantity}</span>
                            <span>{formatMoney((Number(item.price) || 0) * (Number(item.quantity) || 0))}</span>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          {activePanel === "returns" ? (
            <section className={styles.infoCard}>
              <h2>My Returns</h2>
              <p>Returns are currently tracked through customer support. Contact us to process a return request.</p>
            </section>
          ) : null}

          {activePanel === "cancellations" ? (
            <section className={styles.infoCard}>
              <h2>My Cancellations</h2>
              <p>No cancelled orders found for this account.</p>
            </section>
          ) : null}
        </section>
      </section>
    </main>
  );
}

