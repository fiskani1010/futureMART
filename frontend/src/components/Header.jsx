import { useEffect, useMemo, useRef, useState } from "react";
import {
  AiOutlineHome,
  AiOutlineHeart,
  AiOutlineMenu,
  AiOutlineClose,
  AiOutlineSearch,
  AiOutlineShoppingCart,
  AiOutlineLogout,
  AiOutlineUser,
} from "react-icons/ai";
import { Link, NavLink, useNavigate } from "react-router-dom";
import styles from "./Header.module.css";
import { AUTH_UPDATED_EVENT, clearAuthUser, getAuthUser, setAuthUser } from "../utils/authStorage";
import {
  CART_UPDATED_EVENT,
  WISHLIST_UPDATED_EVENT,
  getCartCount,
  getWishlistCount,
} from "../utils/shopStorage";

const NAV_LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/contact", label: "Contact" },
  { to: "/about", label: "About" },
];
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "").replace(/\/api$/i, "");

const getDisplayName = (user) => {
  const source = String(user?.name || user?.email || "").trim();
  if (!source) return "Account";
  return source.split(/\s+/)[0];
};

export default function Header() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCatalog, setSearchCatalog] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sessionUser, setSessionUser] = useState(() => getAuthUser());
  const [wishlistCount, setWishlistCount] = useState(() => getWishlistCount());
  const [cartCount, setCartCount] = useState(() => getCartCount());
  const desktopSearchRef = useRef(null);
  const mobileSearchRef = useRef(null);

  const searchSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    return searchCatalog
      .filter((item) => {
        const name = String(item?.name || "").toLowerCase();
        const category = String(item?.category_name || "").toLowerCase();
        return name.includes(query) || category.includes(query);
      })
      .slice(0, 6);
  }, [searchCatalog, searchQuery]);

  useEffect(() => {
    const syncCounts = () => {
      setWishlistCount(getWishlistCount());
      setCartCount(getCartCount());
    };

    window.addEventListener(AUTH_UPDATED_EVENT, syncCounts);
    window.addEventListener(WISHLIST_UPDATED_EVENT, syncCounts);
    window.addEventListener(CART_UPDATED_EVENT, syncCounts);
    window.addEventListener("storage", syncCounts);

    return () => {
      window.removeEventListener(AUTH_UPDATED_EVENT, syncCounts);
      window.removeEventListener(WISHLIST_UPDATED_EVENT, syncCounts);
      window.removeEventListener(CART_UPDATED_EVENT, syncCounts);
      window.removeEventListener("storage", syncCounts);
    };
  }, []);

  useEffect(() => {
    const syncSessionFromStorage = () => {
      setSessionUser(getAuthUser());
    };

    window.addEventListener(AUTH_UPDATED_EVENT, syncSessionFromStorage);
    window.addEventListener("storage", syncSessionFromStorage);
    return () => {
      window.removeEventListener(AUTH_UPDATED_EVENT, syncSessionFromStorage);
      window.removeEventListener("storage", syncSessionFromStorage);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          method: "GET",
          credentials: "include",
        });
        if (!response.ok) {
          if (isMounted) setSessionUser(null);
          clearAuthUser();
          return;
        }

        const payload = await response.json().catch(() => ({}));
        if (isMounted) {
          const user = payload?.user || null;
          setSessionUser(user);
          setAuthUser(user);
        }
      } catch {
        if (isMounted) setSessionUser(null);
      }
    };

    loadSession();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSearchCatalog = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/products`);
        const payload = await response.json().catch(() => []);
        if (!response.ok) return;

        const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
        if (isMounted) {
          setSearchCatalog(
            rows
              .filter((row) => row && row.id && row.name)
              .map((row) => ({
                id: row.id,
                name: row.name,
                category_name: row.category_name || "",
              })),
          );
        }
      } catch {
        if (isMounted) setSearchCatalog([]);
      }
    };

    loadSearchCatalog();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;
      const inDesktop = desktopSearchRef.current?.contains(target);
      const inMobile = mobileSearchRef.current?.contains(target);
      if (!inDesktop && !inMobile) {
        setShowSuggestions(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setShowSuggestions(false);
      return;
    }

    setShowSuggestions(searchSuggestions.length > 0);
  }, [searchQuery, searchSuggestions.length]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = searchQuery.trim();
    const searchPath = query ? `/search?q=${encodeURIComponent(query)}` : "/search";
    navigate(searchPath);
    setMenuOpen(false);
    setSearchOpen(false);
    setShowSuggestions(false);
  };

  const handleSearchInputChange = (event) => {
    setSearchQuery(event.target.value);
    if (!event.target.value.trim()) {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionSelect = (product) => {
    navigate(`/product/${product.id}`);
    setSearchQuery(product.name || "");
    setMenuOpen(false);
    setSearchOpen(false);
    setShowSuggestions(false);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Even when request fails, clear local session state.
    } finally {
      setSessionUser(null);
      clearAuthUser();
      setMenuOpen(false);
      setSearchOpen(false);
      navigate("/");
    }
  };

  const accountPath = sessionUser ? "/account" : "/login";

  const renderSuggestions = () => {
    if (!showSuggestions || searchSuggestions.length === 0) return null;

    return (
      <div className={styles.suggestionPanel} role="listbox" aria-label="Search suggestions">
        {searchSuggestions.map((product) => (
          <button
            key={product.id}
            type="button"
            className={styles.suggestionItem}
            onClick={() => handleSuggestionSelect(product)}
          >
            <span className={styles.suggestionTitle}>{product.name}</span>
            {product.category_name ? (
              <span className={styles.suggestionMeta}>{product.category_name}</span>
            ) : null}
          </button>
        ))}

        <button type="button" className={styles.suggestionAction} onClick={handleSearchSubmit}>
          Search for "{searchQuery.trim()}"
        </button>
      </div>
    );
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link
          to="/"
          className={styles.brand}
          onClick={() => {
            setMenuOpen(false);
            setSearchOpen(false);
          }}
        >
          <span className={styles.brandFuture}>future</span>
          <span className={styles.brandMart}>Mart</span>
        </Link>

        <div className={styles.mobileTopActions}>
          <Link
            to={accountPath}
            className={styles.quickAccountBtn}
            aria-label={sessionUser ? "My Account" : "Login"}
            onClick={() => {
              setMenuOpen(false);
              setSearchOpen(false);
            }}
          >
            <AiOutlineUser />
          </Link>

          <button
            type="button"
            className={styles.searchToggle}
            aria-label={searchOpen ? "Close search" : "Open search"}
            aria-expanded={searchOpen}
            onClick={() => {
              setSearchOpen((prev) => !prev);
              setMenuOpen(false);
            }}
          >
            <AiOutlineSearch />
          </button>

          <button
            type="button"
            className={styles.menuButton}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((prev) => !prev);
              setSearchOpen(false);
            }}
          >
            {menuOpen ? <AiOutlineClose /> : <AiOutlineMenu />}
          </button>
        </div>

        <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ""}`}>
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
              }
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}

          <div className={styles.mobileAuthBlock}>
            {sessionUser ? (
              <>
                <Link
                  to="/account"
                  className={styles.mobileAuthLink}
                  onClick={() => setMenuOpen(false)}
                >
                  My Account
                </Link>
                <button type="button" className={styles.mobileAuthBtn} onClick={handleLogout}>
                  <AiOutlineLogout />
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className={styles.mobileAuthLink}
                  onClick={() => setMenuOpen(false)}
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className={`${styles.mobileAuthLink} ${styles.mobileAuthLinkPrimary}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </nav>

        <div className={styles.actions}>
          <div className={styles.searchWrap} ref={desktopSearchRef}>
            <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
              <AiOutlineSearch className={styles.searchIcon} aria-hidden="true" />
              <input
                type="search"
                className={styles.searchInput}
                placeholder="What are you looking for?"
                aria-label="Search products"
                value={searchQuery}
                onChange={handleSearchInputChange}
                onFocus={() => {
                  if (searchQuery.trim() && searchSuggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
              />
            </form>
            {renderSuggestions()}
          </div>

          <Link
            to={accountPath}
            className={styles.iconButton}
            aria-label={sessionUser ? "My Account" : "Login"}
          >
            <AiOutlineUser />
          </Link>

          <Link
            to="/wishlist"
            className={`${styles.iconButton} ${wishlistCount > 0 ? styles.iconButtonLoveActive : ""}`}
            aria-label="Wishlist"
          >
            <AiOutlineHeart />
            {wishlistCount > 0 ? <span className={styles.countBadge}>{wishlistCount}</span> : null}
          </Link>

          <Link
            to="/cart"
            className={`${styles.iconButton} ${cartCount > 0 ? styles.iconButtonCartActive : ""}`}
            aria-label="Cart"
          >
            <AiOutlineShoppingCart />
            {cartCount > 0 ? <span className={styles.countBadge}>{cartCount}</span> : null}
          </Link>

          {sessionUser ? (
            <div className={styles.authButtons}>
              <span className={styles.userPill}>Hi, {getDisplayName(sessionUser)}</span>
              <button type="button" className={`${styles.authButton} ${styles.ghostButton}`} onClick={handleLogout}>
                <AiOutlineLogout />
                Logout
              </button>
            </div>
          ) : (
            <div className={styles.authButtons}>
              <Link
                to="/login"
                className={`${styles.authButton} ${styles.ghostButton}`}
                onClick={() => setMenuOpen(false)}
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className={`${styles.authButton} ${styles.primaryButton}`}
                onClick={() => setMenuOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>

      {searchOpen && (
        <div className={styles.mobileSearchWrap} ref={mobileSearchRef}>
          <form className={styles.mobileSearchPanel} onSubmit={handleSearchSubmit}>
            <AiOutlineSearch className={styles.searchIcon} aria-hidden="true" />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Search products"
              aria-label="Search products"
              value={searchQuery}
              onChange={handleSearchInputChange}
              onFocus={() => {
                if (searchQuery.trim() && searchSuggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
            />
          </form>
          {renderSuggestions()}
        </div>
      )}

      <nav className={styles.mobileBottomNav} aria-label="Mobile quick actions">
        <Link to="/" className={styles.mobileBottomItem}>
          <AiOutlineHome />
          <span>Home</span>
        </Link>
        <Link
          to="/wishlist"
          className={`${styles.mobileBottomItem} ${wishlistCount > 0 ? styles.mobileBottomItemActive : ""}`}
          aria-label="Wishlist"
        >
          <AiOutlineHeart />
          <span>Love</span>
          {wishlistCount > 0 ? <span className={styles.mobileCountBadge}>{wishlistCount}</span> : null}
        </Link>
        <Link
          to="/cart"
          className={`${styles.mobileBottomItem} ${cartCount > 0 ? styles.mobileBottomItemActive : ""}`}
          aria-label="Cart"
        >
          <AiOutlineShoppingCart />
          <span>Cart</span>
          {cartCount > 0 ? <span className={styles.mobileCountBadge}>{cartCount}</span> : null}
        </Link>
        <Link to={accountPath} className={styles.mobileBottomItem}>
          <AiOutlineUser />
          <span>{sessionUser ? "Account" : "Login"}</span>
        </Link>
      </nav>
    </header>
  );
}

