const AUTH_USER_KEY = "futuremart_auth_user";
export const AUTH_UPDATED_EVENT = "futuremart:auth-updated";

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

const emitAuthUpdate = () => {
  window.dispatchEvent(new Event(AUTH_UPDATED_EVENT));
};

const normalizeUser = (user) => {
  const userId = Number(user?.id);
  if (!Number.isInteger(userId) || userId <= 0) return null;

  return {
    id: userId,
    name: String(user?.name || "").trim(),
    email: String(user?.email || "").trim(),
    role: String(user?.role || "").trim() || "user",
  };
};

export const getAuthUser = () => {
  if (typeof window === "undefined") return null;
  return normalizeUser(readJson(AUTH_USER_KEY, null));
};

export const getAuthUserId = () => getAuthUser()?.id || null;

export const setAuthUser = (user) => {
  if (typeof window === "undefined") return;
  const normalized = normalizeUser(user);

  if (!normalized) {
    localStorage.removeItem(AUTH_USER_KEY);
    emitAuthUpdate();
    return;
  }

  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(normalized));
  emitAuthUpdate();
};

export const clearAuthUser = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_USER_KEY);
  emitAuthUpdate();
};
