const stripOuterQuotes = (value) => String(value || "").trim().replace(/^['"]|['"]$/g, "");

const rawBaseUrl = stripOuterQuotes(import.meta.env.VITE_API_BASE_URL || "");

// Support either https://api.example.com or https://api.example.com/api in env config.
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "").replace(/\/api$/i, "");

export const buildApiUrl = (path) => {
  const rawPath = String(path || "").trim();
  const normalizedPath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const apiPath = normalizedPath.startsWith("/api") ? normalizedPath : `/api${normalizedPath}`;
  return `${API_BASE_URL}${apiPath}`;
};
