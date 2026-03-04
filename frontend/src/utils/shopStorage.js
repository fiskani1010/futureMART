import { AUTH_UPDATED_EVENT, getAuthUserId } from "./authStorage";

const WISHLIST_KEY = "futuremart_wishlist_ids";
const CART_KEY = "futuremart_cart_items";

export const WISHLIST_UPDATED_EVENT = "futuremart:wishlist-updated";
export const CART_UPDATED_EVENT = "futuremart:cart-updated";

const readJson = (key, fallbackValue) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallbackValue;

    const parsed = JSON.parse(raw);
    return parsed ?? fallbackValue;
  } catch {
    return fallbackValue;
  }
};

const writeJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const scopedStorageKey = (baseKey) => {
  const userId = getAuthUserId();
  const scope = userId ? `user-${userId}` : "guest";
  return `${baseKey}:${scope}`;
};

const readScopedJson = (baseKey, fallbackValue) => {
  return readJson(scopedStorageKey(baseKey), fallbackValue);
};

const writeScopedJson = (baseKey, value) => {
  writeJson(scopedStorageKey(baseKey), value);
};

const emitEvent = (eventName) => {
  window.dispatchEvent(new Event(eventName));
};

export const getWishlistIds = () => {
  const values = readScopedJson(WISHLIST_KEY, []);
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(
      values
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  );
};

export const isWishlisted = (productId) => getWishlistIds().includes(Number(productId));

export const toggleWishlist = (productId) => {
  const numericId = Number(productId);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return false;
  }

  const current = getWishlistIds();
  const alreadyLiked = current.includes(numericId);
  const next = alreadyLiked
    ? current.filter((id) => id !== numericId)
    : [...current, numericId];

  writeScopedJson(WISHLIST_KEY, next);
  emitEvent(WISHLIST_UPDATED_EVENT);
  return !alreadyLiked;
};

export const getWishlistCount = () => getWishlistIds().length;

export const getCartItems = () => {
  const values = readScopedJson(CART_KEY, []);
  if (!Array.isArray(values)) return [];

  return values
    .map((item) => ({
      productId: Number(item?.productId),
      quantity: Number(item?.quantity),
    }))
    .filter(
      (item) =>
        Number.isInteger(item.productId) &&
        item.productId > 0 &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0,
    );
};

export const addToCart = (productId, quantity = 1) => {
  const numericId = Number(productId);
  const numericQty = Number(quantity);

  if (!Number.isInteger(numericId) || numericId <= 0) return;
  if (!Number.isInteger(numericQty) || numericQty <= 0) return;

  const current = getCartItems();
  const existing = current.find((item) => item.productId === numericId);

  if (existing) {
    existing.quantity += numericQty;
  } else {
    current.push({ productId: numericId, quantity: numericQty });
  }

  writeScopedJson(CART_KEY, current);
  emitEvent(CART_UPDATED_EVENT);
};

export const setCartItemQuantity = (productId, quantity) => {
  const numericId = Number(productId);
  const numericQty = Number(quantity);

  if (!Number.isInteger(numericId) || numericId <= 0) return;
  if (!Number.isInteger(numericQty)) return;

  const current = getCartItems();
  const next = [];

  current.forEach((item) => {
    if (item.productId !== numericId) {
      next.push(item);
      return;
    }

    if (numericQty > 0) {
      next.push({ ...item, quantity: numericQty });
    }
  });

  writeScopedJson(CART_KEY, next);
  emitEvent(CART_UPDATED_EVENT);
};

export const removeFromCart = (productId) => {
  const numericId = Number(productId);
  if (!Number.isInteger(numericId) || numericId <= 0) return;

  const current = getCartItems();
  const next = current.filter((item) => item.productId !== numericId);
  writeScopedJson(CART_KEY, next);
  emitEvent(CART_UPDATED_EVENT);
};

export const clearCart = () => {
  writeScopedJson(CART_KEY, []);
  emitEvent(CART_UPDATED_EVENT);
};

export const getCartCount = () =>
  getCartItems().reduce((total, item) => total + item.quantity, 0);

if (typeof window !== "undefined" && !window.__futuremartScopedStorageHooked) {
  window.__futuremartScopedStorageHooked = true;
  window.addEventListener(AUTH_UPDATED_EVENT, () => {
    emitEvent(WISHLIST_UPDATED_EVENT);
    emitEvent(CART_UPDATED_EVENT);
  });
}
