import { STORE_CATEGORIES } from "../constants/storeCategories";

export const normalizeCategoryKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");

export const slugifyCategoryName = (name) =>
  String(name || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const findCategoryBySlug = (slug) =>
  STORE_CATEGORIES.find(
    (category) => category.slug === slug || slugifyCategoryName(category.name) === slug,
  );

export const findCategoryDisplayName = (slug) => {
  const known = findCategoryBySlug(slug);
  if (known) return known.name;

  return String(slug || "")
    .split("-")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
};

export const categoryMatchesSlug = (categoryName, slug) => {
  const known = findCategoryBySlug(slug);
  if (!known) {
    return slugifyCategoryName(categoryName) === slug;
  }

  const categorySlug = slugifyCategoryName(categoryName);
  if (categorySlug === known.slug || categorySlug === slug) {
    return true;
  }

  return normalizeCategoryKey(categoryName) === normalizeCategoryKey(known.name);
};
