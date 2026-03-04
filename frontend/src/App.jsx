import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import Header from "./components/Header";
import SiteFooter from "./components/SiteFooter";
import AboutPage from "./pages/AboutPage";
import AdminPage from "./pages/AdminPage";
import AccountPage from "./pages/AccountPage";
import CartPage from "./pages/CartPage";
import CategoryProductsPage from "./pages/CategoryProductsPage";
import ContactPage from "./pages/ContactPage";
import CheckoutPage from "./pages/CheckoutPage";
import HomePage from "./pages/HomePage";
import ProductDetailPage from "./pages/ProductDetailPage";
import SearchResultsPage from "./pages/SearchResultsPage";
import WishlistPage from "./pages/WishlistPage";
import "./App.css";

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const showHeader = !location.pathname.startsWith("/admin");
  const showFooter = showHeader;

  return (
    <div className="app">
      {showHeader && <Header />}

      <div className="appRoutes">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="/product/:productId" element={<ProductDetailPage />} />
          <Route path="/category/:categorySlug" element={<CategoryProductsPage />} />
          <Route
            path="/login"
            element={
              <Login
                onSwitchToRegister={() => navigate("/signup")}
                onLoginSuccess={(payload) => navigate(payload?.role === "admin" ? "/admin" : "/")}
              />
            }
          />
          <Route
            path="/signup"
            element={<Register onSwitchToLogin={() => navigate("/login")} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {showFooter ? <SiteFooter /> : null}
    </div>
  );
}

export default App;
