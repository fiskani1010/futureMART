import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AiOutlineAppstore,
  AiOutlineDelete,
  AiOutlineEdit,
  AiOutlinePicture,
  AiOutlinePlus,
  AiOutlineProfile,
  AiOutlineReload,
  AiOutlineShopping,
  AiOutlineTags,
  AiOutlineTeam,
} from "react-icons/ai";
import NewArrivalManager from "../components/admin/NewArrivalManager";
import styles from "./AdminPage.module.css";
import { STORE_CATEGORY_NAMES } from "../constants/storeCategories";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const PRODUCT_OTHER_CATEGORY = "__other__";
const ADMIN_MODULES = [
  {
    id: "hero",
    label: "Hero Carousel",
    hint: "Manage homepage slides",
    Icon: AiOutlinePicture,
    comingSoon: false,
  },
  {
    id: "arrivals",
    label: "New Arrival",
    hint: "Manage featured arrival cards",
    Icon: AiOutlineAppstore,
    comingSoon: false,
  },
  {
    id: "products",
    label: "Products",
    hint: "Inventory and pricing",
    Icon: AiOutlineShopping,
    comingSoon: false,
  },
  {
    id: "team",
    label: "Team",
    hint: "About page team cards",
    Icon: AiOutlineTeam,
    comingSoon: false,
  },
  {
    id: "orders",
    label: "Orders",
    hint: "Track customer orders",
    Icon: AiOutlineProfile,
    comingSoon: true,
  },
  {
    id: "users",
    label: "Users",
    hint: "Accounts and roles",
    Icon: AiOutlineTags,
    comingSoon: false,
  },
];

const getInitialForm = (displayOrder = 1) => ({
  title: "",
  subtitle: "",
  image_url: "",
  cta_text: "Shop Now",
  cta_link: "/",
  display_order: displayOrder,
  is_active: true,
});

const getInitialProductForm = () => ({
  name: "",
  description: "",
  price: "",
  old_price: "",
  image: "",
  stock: 0,
  is_flash_sale: false,
  category: STORE_CATEGORY_NAMES[0] || "",
  otherCategory: "",
});

const getInitialTeamForm = (displayOrder = 1) => ({
  name: "",
  role_title: "",
  image_url: "",
  bio: "",
  x_url: "",
  instagram_url: "",
  linkedin_url: "",
  display_order: displayOrder,
  is_active: true,
});

export default function AdminPage() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [slides, setSlides] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [isTeamLoading, setIsTeamLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRoleSaving, setIsRoleSaving] = useState(false);
  const [isProductSaving, setIsProductSaving] = useState(false);
  const [isTeamSaving, setIsTeamSaving] = useState(false);
  const [isHeroImageUploading, setIsHeroImageUploading] = useState(false);
  const [isProductImageUploading, setIsProductImageUploading] = useState(false);
  const [isTeamImageUploading, setIsTeamImageUploading] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [usersStatus, setUsersStatus] = useState({ type: "", text: "" });
  const [productStatus, setProductStatus] = useState({ type: "", text: "" });
  const [teamStatus, setTeamStatus] = useState({ type: "", text: "" });
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(getInitialForm());
  const [productEditingId, setProductEditingId] = useState(null);
  const [productForm, setProductForm] = useState(getInitialProductForm());
  const [teamEditingId, setTeamEditingId] = useState(null);
  const [teamForm, setTeamForm] = useState(getInitialTeamForm());
  const [activeModule, setActiveModule] = useState("hero");

  const nextDisplayOrder = useMemo(() => {
    if (slides.length === 0) return 1;
    const maxOrder = Math.max(...slides.map((slide) => Number(slide.display_order) || 0));
    return maxOrder + 1;
  }, [slides]);
  const nextTeamOrder = useMemo(() => {
    if (teamMembers.length === 0) return 1;
    const maxOrder = Math.max(...teamMembers.map((member) => Number(member.display_order) || 0));
    return maxOrder + 1;
  }, [teamMembers]);
  const adminUsersCount = useMemo(() => users.filter((user) => user.role === "admin").length, [users]);
  const productCategoryOptions = useMemo(() => {
    const categorySet = new Set(STORE_CATEGORY_NAMES.filter(Boolean));
    products.forEach((product) => {
      if (product?.category_name) {
        categorySet.add(product.category_name);
      }
    });

    return Array.from(categorySet);
  }, [products]);
  const flashProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          Boolean(product?.is_flash_sale) &&
          Number.isFinite(Number(product?.old_price)) &&
          Number(product.old_price) > Number(product.price),
      ),
    [products],
  );
  const selectedModule = useMemo(
    () => ADMIN_MODULES.find((module) => module.id === activeModule) || ADMIN_MODULES[0],
    [activeModule],
  );

  const resolveImageUrl = (rawUrl) => {
    if (!rawUrl) return "";
    if (/^https?:\/\//i.test(rawUrl) || rawUrl.startsWith("data:")) {
      return rawUrl;
    }

    if (rawUrl.startsWith("/")) {
      return API_BASE_URL ? `${API_BASE_URL}${rawUrl}` : rawUrl;
    }

    return rawUrl;
  };

  const getDiscountPercentage = (priceValue, oldPriceValue) => {
    const price = Number(priceValue);
    const oldPrice = Number(oldPriceValue);
    if (!Number.isFinite(price) || !Number.isFinite(oldPrice) || oldPrice <= 0 || oldPrice <= price) {
      return 0;
    }

    return Math.round(((oldPrice - price) / oldPrice) * 100);
  };

  const uploadImageFile = async (file) => {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`${API_BASE_URL}/api/admin/upload-image`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Could not upload image.");
    }

    if (data.absolute_url) {
      return data.absolute_url;
    }

    if (data.url) {
      return resolveImageUrl(data.url);
    }

    return "";
  };

  const loadSlides = async () => {
    setIsLoading(true);
    setStatus({ type: "", text: "" });

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/hero-slides`, {
        credentials: "include",
      });

      const data = await response.json().catch(() => []);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setAuthError("Admin access is required. Login with an admin account.");
        } else {
          setStatus({ type: "error", text: data.message || "Could not load slides." });
        }
        return [];
      }

      const list = Array.isArray(data) ? data : [];
      setSlides(list);
      return list;
    } catch {
      setStatus({ type: "error", text: "Network error while loading slides." });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    setIsUsersLoading(true);
    setUsersStatus({ type: "", text: "" });

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
        credentials: "include",
      });

      const data = await response.json().catch(() => []);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setAuthError("Admin access is required. Login with an admin account.");
        } else if (response.status === 404) {
          setUsersStatus({
            type: "error",
            text: "Users API not found. Restart backend so new admin routes are loaded.",
          });
        } else {
          setUsersStatus({ type: "error", text: data.message || "Could not load users." });
        }
        return [];
      }

      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      setUsers(list);
      return list;
    } catch {
      setUsersStatus({ type: "error", text: "Network error while loading users." });
      return [];
    } finally {
      setIsUsersLoading(false);
    }
  };

  const loadProducts = async () => {
    setIsProductsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/products`, {
        credentials: "include",
      });

      const data = await response.json().catch(() => []);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setAuthError("Admin access is required. Login with an admin account.");
        } else {
          setProductStatus({ type: "error", text: data.message || "Could not load products." });
        }
        return [];
      }

      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      setProducts(list);
      return list;
    } catch {
      setProductStatus({ type: "error", text: "Network error while loading products." });
      return [];
    } finally {
      setIsProductsLoading(false);
    }
  };

  const loadTeamMembers = async () => {
    setIsTeamLoading(true);
    setTeamStatus({ type: "", text: "" });

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/team-members`, {
        credentials: "include",
      });

      const data = await response.json().catch(() => []);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setAuthError("Admin access is required. Login with an admin account.");
        } else {
          setTeamStatus({ type: "error", text: data.message || "Could not load team members." });
        }
        return [];
      }

      const list = Array.isArray(data) ? data : [];
      setTeamMembers(list);
      return list;
    } catch {
      setTeamStatus({ type: "error", text: "Network error while loading team members." });
      return [];
    } finally {
      setIsTeamLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          credentials: "include",
        });
        const data = await response.json().catch(() => ({}));

        if (!isMounted) return;

        if (!response.ok || !data?.user) {
          setAuthError("Login first with your admin account.");
          setAuthChecked(true);
          return;
        }

        if (data.user.role !== "admin") {
          setAuthError("This page is only available to admin users.");
          setAuthChecked(true);
          return;
        }

        setAdminEmail(data.user.email || "");
        setAuthError("");
        setAuthChecked(true);
      } catch {
        if (!isMounted) return;
        setAuthError("Could not verify your admin session. Please login again.");
        setAuthChecked(true);
      }
    };

    verifySession();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!authChecked || authError) return;
    loadSlides();
  }, [authChecked, authError]);

  useEffect(() => {
    if (!authChecked || authError) return;
    loadUsers();
  }, [authChecked, authError]);

  useEffect(() => {
    if (!authChecked || authError) return;
    loadProducts();
  }, [authChecked, authError]);

  useEffect(() => {
    if (!authChecked || authError) return;
    loadTeamMembers();
  }, [authChecked, authError]);

  useEffect(() => {
    if (editingId === null) {
      setForm((prev) => ({
        ...prev,
        display_order: prev.display_order || nextDisplayOrder,
      }));
    }
  }, [editingId, nextDisplayOrder]);

  useEffect(() => {
    if (productEditingId !== null) return;
    if (productForm.category) return;
    if (productCategoryOptions.length === 0) return;

    setProductForm((prev) => ({
      ...prev,
      category: productCategoryOptions[0],
    }));
  }, [productCategoryOptions, productEditingId, productForm.category]);

  useEffect(() => {
    if (teamEditingId === null) {
      setTeamForm((prev) => ({
        ...prev,
        display_order: prev.display_order || nextTeamOrder,
      }));
    }
  }, [teamEditingId, nextTeamOrder]);

  const handleFieldChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleHeroImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsHeroImageUploading(true);
    try {
      const imageUrl = await uploadImageFile(file);
      setForm((prev) => ({
        ...prev,
        image_url: imageUrl,
      }));
      setStatus({ type: "success", text: "Image uploaded. URL added automatically." });
    } catch (error) {
      setStatus({ type: "error", text: error.message || "Image upload failed." });
    } finally {
      setIsHeroImageUploading(false);
    }
  };

  const handleStartCreate = () => {
    setEditingId(null);
    setStatus({ type: "", text: "" });
    setForm(getInitialForm(nextDisplayOrder));
  };

  const handleStartEdit = (slide) => {
    setEditingId(slide.id);
    setStatus({ type: "", text: "" });
    setForm({
      title: slide.title || "",
      subtitle: slide.subtitle || "",
      image_url: slide.image_url || "",
      cta_text: slide.cta_text || "Shop Now",
      cta_link: slide.cta_link || "/",
      display_order: slide.display_order ?? 1,
      is_active: Boolean(slide.is_active),
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      image_url: form.image_url.trim(),
      cta_text: (form.cta_text || "Shop Now").trim(),
      cta_link: (form.cta_link || "/").trim(),
      display_order: Number(form.display_order) || 1,
      is_active: Boolean(form.is_active),
    };

    if (!payload.title || !payload.image_url) {
      setStatus({ type: "error", text: "Title and image URL are required." });
      return;
    }

    setIsSaving(true);
    setStatus({ type: "", text: "" });

    try {
      const isEditing = editingId !== null;
      const response = await fetch(
        isEditing
          ? `${API_BASE_URL}/api/admin/hero-slides/${editingId}`
          : `${API_BASE_URL}/api/admin/hero-slides`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus({ type: "error", text: data.message || "Could not save slide." });
        return;
      }

      setStatus({ type: "success", text: isEditing ? "Slide updated." : "Slide created." });
      setEditingId(null);
      const refreshedSlides = await loadSlides();
      const maxOrder = refreshedSlides.length
        ? Math.max(...refreshedSlides.map((slide) => Number(slide.display_order) || 0))
        : 0;
      setForm(getInitialForm(maxOrder + 1));
    } catch {
      setStatus({ type: "error", text: "Network error while saving slide." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (slideId) => {
    const shouldDelete = window.confirm("Delete this hero slide?");
    if (!shouldDelete) return;

    setStatus({ type: "", text: "" });

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/hero-slides/${slideId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus({ type: "error", text: data.message || "Could not delete slide." });
        return;
      }

      setStatus({ type: "success", text: "Slide deleted." });
      if (editingId === slideId) {
        setEditingId(null);
        setForm(getInitialForm(nextDisplayOrder));
      }
      const refreshedSlides = await loadSlides();
      if (editingId === slideId) {
        const maxOrder = refreshedSlides.length
          ? Math.max(...refreshedSlides.map((slide) => Number(slide.display_order) || 0))
          : 0;
        setForm(getInitialForm(maxOrder + 1));
      }
    } catch {
      setStatus({ type: "error", text: "Network error while deleting slide." });
    }
  };

  const handleProductFieldChange = (event) => {
    const { name, value, type, checked } = event.target;
    setProductForm((prev) => ({
      ...prev,
      [name]:
        name === "stock"
          ? Math.max(0, Number(value) || 0)
          : type === "checkbox"
            ? checked
            : value,
    }));
  };

  const handleProductImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsProductImageUploading(true);
    try {
      const imageUrl = await uploadImageFile(file);
      setProductForm((prev) => ({
        ...prev,
        image: imageUrl,
      }));
      setProductStatus({ type: "success", text: "Image uploaded. URL added automatically." });
    } catch (error) {
      setProductStatus({ type: "error", text: error.message || "Image upload failed." });
    } finally {
      setIsProductImageUploading(false);
    }
  };

  const handleStartCreateProduct = () => {
    setProductEditingId(null);
    setProductStatus({ type: "", text: "" });
    setProductForm({
      ...getInitialProductForm(),
      category: productCategoryOptions[0] || STORE_CATEGORY_NAMES[0] || "",
    });
  };

  const handleStartEditProduct = (product) => {
    setProductEditingId(product.id);
    setProductStatus({ type: "", text: "" });

    const categoryValue = product?.category_name || "";
    const isKnownCategory = categoryValue && productCategoryOptions.includes(categoryValue);

    setProductForm({
      name: product?.name || "",
      description: product?.description || "",
      price: product?.price ?? "",
      old_price: product?.old_price ?? "",
      image: product?.image || "",
      stock: Number(product?.stock) || 0,
      is_flash_sale: Boolean(product?.is_flash_sale),
      category: isKnownCategory ? categoryValue : categoryValue ? PRODUCT_OTHER_CATEGORY : "",
      otherCategory: isKnownCategory ? "" : categoryValue,
    });
  };

  const handleSubmitProduct = async (event) => {
    event.preventDefault();

    const resolvedCategory =
      productForm.category === PRODUCT_OTHER_CATEGORY
        ? productForm.otherCategory.trim()
        : productForm.category.trim();

    const payload = {
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      price: Number(productForm.price),
      old_price:
        productForm.old_price === "" || productForm.old_price === null
          ? null
          : Number(productForm.old_price),
      image: productForm.image.trim(),
      stock: Math.max(0, Number(productForm.stock) || 0),
      is_flash_sale: Boolean(productForm.is_flash_sale),
      category_name: resolvedCategory,
    };

    if (!payload.name) {
      setProductStatus({ type: "error", text: "Product name is required." });
      return;
    }

    if (!Number.isFinite(payload.price) || payload.price < 0) {
      setProductStatus({ type: "error", text: "Price must be a non-negative number." });
      return;
    }

    if (payload.old_price !== null && (!Number.isFinite(payload.old_price) || payload.old_price < 0)) {
      setProductStatus({ type: "error", text: "Old price must be a non-negative number." });
      return;
    }

    if (payload.is_flash_sale) {
      if (payload.old_price === null) {
        setProductStatus({ type: "error", text: "Old price is required for Flash Sale products." });
        return;
      }

      if (payload.old_price <= payload.price) {
        setProductStatus({
          type: "error",
          text: "Old price must be greater than current price for Flash Sale.",
        });
        return;
      }
    }

    if (productForm.category === PRODUCT_OTHER_CATEGORY && !payload.category_name) {
      setProductStatus({ type: "error", text: "Enter a category name for Other." });
      return;
    }

    setIsProductSaving(true);
    setProductStatus({ type: "", text: "" });

    try {
      const isEditing = productEditingId !== null;
      const response = await fetch(
        isEditing
          ? `${API_BASE_URL}/api/admin/products/${productEditingId}`
          : `${API_BASE_URL}/api/admin/products`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setProductStatus({ type: "error", text: data.message || "Could not save product." });
        return;
      }

      setProductStatus({ type: "success", text: isEditing ? "Product updated." : "Product created." });
      setProductEditingId(null);
      await loadProducts();
      setProductForm({
        ...getInitialProductForm(),
        category: resolvedCategory || productCategoryOptions[0] || STORE_CATEGORY_NAMES[0] || "",
      });
    } catch {
      setProductStatus({ type: "error", text: "Network error while saving product." });
    } finally {
      setIsProductSaving(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    const shouldDelete = window.confirm("Delete this product?");
    if (!shouldDelete) return;

    setProductStatus({ type: "", text: "" });

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/products/${productId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setProductStatus({ type: "error", text: data.message || "Could not delete product." });
        return;
      }

      setProductStatus({ type: "success", text: "Product deleted." });
      if (productEditingId === productId) {
        handleStartCreateProduct();
      }
      await loadProducts();
    } catch {
      setProductStatus({ type: "error", text: "Network error while deleting product." });
    }
  };

  const handleTeamFieldChange = (event) => {
    const { name, value, type, checked } = event.target;
    setTeamForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleTeamImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsTeamImageUploading(true);
    try {
      const imageUrl = await uploadImageFile(file);
      setTeamForm((prev) => ({
        ...prev,
        image_url: imageUrl,
      }));
      setTeamStatus({ type: "success", text: "Image uploaded. URL added automatically." });
    } catch (error) {
      setTeamStatus({ type: "error", text: error.message || "Image upload failed." });
    } finally {
      setIsTeamImageUploading(false);
    }
  };

  const handleStartCreateTeam = () => {
    setTeamEditingId(null);
    setTeamStatus({ type: "", text: "" });
    setTeamForm(getInitialTeamForm(nextTeamOrder));
  };

  const handleStartEditTeam = (member) => {
    setTeamEditingId(member.id);
    setTeamStatus({ type: "", text: "" });
    setTeamForm({
      name: member.name || "",
      role_title: member.role_title || "",
      image_url: member.image_url || "",
      bio: member.bio || "",
      x_url: member.x_url || "",
      instagram_url: member.instagram_url || "",
      linkedin_url: member.linkedin_url || "",
      display_order: member.display_order ?? 1,
      is_active: Boolean(member.is_active),
    });
  };

  const handleSubmitTeam = async (event) => {
    event.preventDefault();

    const payload = {
      name: teamForm.name.trim(),
      role_title: teamForm.role_title.trim(),
      image_url: teamForm.image_url.trim(),
      bio: teamForm.bio.trim(),
      x_url: teamForm.x_url.trim(),
      instagram_url: teamForm.instagram_url.trim(),
      linkedin_url: teamForm.linkedin_url.trim(),
      display_order: Number(teamForm.display_order) || 1,
      is_active: Boolean(teamForm.is_active),
    };

    if (!payload.name || !payload.role_title || !payload.image_url) {
      setTeamStatus({ type: "error", text: "Name, role title and image URL are required." });
      return;
    }

    setIsTeamSaving(true);
    setTeamStatus({ type: "", text: "" });

    try {
      const isEditing = teamEditingId !== null;
      const response = await fetch(
        isEditing
          ? `${API_BASE_URL}/api/admin/team-members/${teamEditingId}`
          : `${API_BASE_URL}/api/admin/team-members`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setTeamStatus({ type: "error", text: data.message || "Could not save team member." });
        return;
      }

      setTeamStatus({ type: "success", text: isEditing ? "Team member updated." : "Team member created." });
      setTeamEditingId(null);
      const refreshedMembers = await loadTeamMembers();
      const nextOrder = refreshedMembers.length
        ? Math.max(...refreshedMembers.map((member) => Number(member.display_order) || 0)) + 1
        : 1;
      setTeamForm(getInitialTeamForm(nextOrder));
    } catch {
      setTeamStatus({ type: "error", text: "Network error while saving team member." });
    } finally {
      setIsTeamSaving(false);
    }
  };

  const handleDeleteTeam = async (memberId) => {
    const shouldDelete = window.confirm("Delete this team member?");
    if (!shouldDelete) return;

    setTeamStatus({ type: "", text: "" });

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/team-members/${memberId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setTeamStatus({ type: "error", text: data.message || "Could not delete team member." });
        return;
      }

      if (teamEditingId === memberId) {
        setTeamEditingId(null);
        setTeamForm(getInitialTeamForm(nextTeamOrder));
      }
      setTeamStatus({ type: "success", text: "Team member deleted." });
      await loadTeamMembers();
    } catch {
      setTeamStatus({ type: "error", text: "Network error while deleting team member." });
    }
  };

  const handleLogout = async () => {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => null);
    navigate("/login");
  };

  const handleRoleChange = async (userId, nextRole) => {
    const originalUsers = users;

    setIsRoleSaving(true);
    setUsersStatus({ type: "", text: "" });
    setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, role: nextRole } : user)));

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ role: nextRole }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setUsers(originalUsers);
        setUsersStatus({ type: "error", text: data.message || "Could not update role." });
        return;
      }

      setUsers((prev) => prev.map((user) => (user.id === userId ? data : user)));
      setUsersStatus({ type: "success", text: "User role updated." });
    } catch {
      setUsers(originalUsers);
      setUsersStatus({ type: "error", text: "Network error while updating role." });
    } finally {
      setIsRoleSaving(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.heroPanel}>
        <div>
          <p className={styles.eyebrow}>FutureMart Admin</p>
          <h1 className={styles.titleRow}>Control Center</h1>
          <p className={styles.subtitle}>
            Build and manage store content from one place. Hero Carousel is live, and the rest
            of modules are ready to be plugged in.
          </p>
          {adminEmail && <p className={styles.adminMail}>Signed in as {adminEmail}</p>}
        </div>
        <div className={styles.topActions}>
          <Link to="/" className={styles.secondaryBtn}>
            Back Home
          </Link>
          <button type="button" className={styles.secondaryBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>
          <div className={styles.heroStats}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Modules</span>
              <strong>{ADMIN_MODULES.length}</strong>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Slides</span>
              <strong>{slides.length}</strong>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Admins</span>
              <strong>{adminUsersCount}</strong>
            </div>
          </div>
      </section>

      {!authChecked ? (
        <section className={styles.messageCard}>Checking admin access...</section>
      ) : authError ? (
        <section className={styles.messageCard}>
          <p>{authError}</p>
          <div className={styles.inlineActions}>
            <Link to="/login" className={styles.primaryBtn}>
              Go to Login
            </Link>
            <Link to="/" className={styles.secondaryBtn}>
              Home
            </Link>
          </div>
        </section>
      ) : (
        <section className={styles.dashboard}>
          <aside className={styles.sidebar}>
            <p className={styles.sidebarTitle}>
              <AiOutlineAppstore />
              Modules
            </p>

            <div className={styles.moduleList}>
              {ADMIN_MODULES.map((module) => (
                <button
                  key={module.id}
                  type="button"
                  className={`${styles.moduleButton} ${
                    activeModule === module.id ? styles.moduleButtonActive : ""
                  }`}
                  onClick={() => setActiveModule(module.id)}
                >
                  <span className={styles.moduleButtonIcon}>
                    <module.Icon />
                  </span>
                  <span className={styles.moduleButtonMeta}>
                    <span className={styles.moduleButtonLabel}>{module.label}</span>
                    <span className={styles.moduleButtonHint}>{module.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <section className={styles.workspace}>
            <div className={styles.moduleHeader}>
              <div>
                <h2>{selectedModule.label}</h2>
                <p className={styles.moduleLead}>{selectedModule.hint}</p>
              </div>
              {selectedModule.comingSoon ? (
                <span className={styles.moduleBadgeSoon}>Coming Soon</span>
              ) : (
                <span className={styles.moduleBadge}>Live</span>
              )}
            </div>

            {activeModule === "hero" ? (
              <section className={styles.layout}>
                <article className={styles.formCard}>
                  <div className={styles.formHead}>
                    <h2>{editingId ? "Edit Slide" : "Create Slide"}</h2>
                    {editingId ? (
                      <button type="button" className={styles.secondaryBtn} onClick={handleStartCreate}>
                        <AiOutlinePlus />
                        New
                      </button>
                    ) : null}
                  </div>

                  <form onSubmit={handleSubmit} className={styles.form}>
                    <label>
                      Title *
                      <input
                        type="text"
                        name="title"
                        value={form.title}
                        onChange={handleFieldChange}
                        required
                      />
                    </label>

                    <label>
                      Subtitle
                      <input
                        type="text"
                        name="subtitle"
                        value={form.subtitle}
                        onChange={handleFieldChange}
                      />
                    </label>

                    <label>
                      Image URL *
                      <input
                        type="url"
                        name="image_url"
                        value={form.image_url}
                        onChange={handleFieldChange}
                        required
                      />
                    </label>

                    <label>
                      Upload Image
                      <input type="file" accept="image/*" onChange={handleHeroImageUpload} />
                    </label>
                    {isHeroImageUploading ? (
                      <p className={styles.helperText}>Uploading image...</p>
                    ) : null}

                    <div className={styles.row}>
                      <label>
                        CTA Text
                        <input
                          type="text"
                          name="cta_text"
                          value={form.cta_text}
                          onChange={handleFieldChange}
                        />
                      </label>
                      <label>
                        CTA Link
                        <input
                          type="text"
                          name="cta_link"
                          value={form.cta_link}
                          onChange={handleFieldChange}
                        />
                      </label>
                    </div>

                    <div className={styles.row}>
                      <label>
                        Display Order
                        <input
                          type="number"
                          min="1"
                          name="display_order"
                          value={form.display_order}
                          onChange={handleFieldChange}
                        />
                      </label>

                      <label className={styles.checkboxField}>
                        <input
                          type="checkbox"
                          name="is_active"
                          checked={form.is_active}
                          onChange={handleFieldChange}
                        />
                        Active Slide
                      </label>
                    </div>

                    <div className={styles.formActions}>
                      <button type="submit" className={styles.primaryBtn} disabled={isSaving}>
                        {isSaving ? "Saving..." : editingId ? "Update Slide" : "Create Slide"}
                      </button>
                    </div>
                  </form>

                  {status.text && (
                    <p className={`${styles.status} ${status.type === "error" ? styles.error : styles.success}`}>
                      {status.text}
                    </p>
                  )}
                </article>

                <article className={styles.listCard}>
                  <div className={styles.listHead}>
                    <h2>Slides In Database</h2>
                    <button type="button" className={styles.secondaryBtn} onClick={() => loadSlides()}>
                      <AiOutlineReload />
                      Refresh
                    </button>
                  </div>

                  {isLoading ? (
                    <p className={styles.listMessage}>Loading slides...</p>
                  ) : slides.length === 0 ? (
                    <p className={styles.listMessage}>No slides found. Create your first slide.</p>
                  ) : (
                    <div className={styles.slideList}>
                      {slides.map((slide) => (
                        <article key={slide.id} className={styles.slideItem}>
                          <img src={resolveImageUrl(slide.image_url)} alt={slide.title} />

                          <div className={styles.slideBody}>
                            <h3>{slide.title}</h3>
                            <p>{slide.subtitle || "No subtitle"}</p>
                            <div className={styles.meta}>
                              <span>Order: {slide.display_order}</span>
                              <span className={slide.is_active ? styles.active : styles.inactive}>
                                {slide.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </div>

                          <div className={styles.slideActions}>
                            <button
                              type="button"
                              className={styles.iconAction}
                              aria-label="Edit slide"
                              onClick={() => handleStartEdit(slide)}
                            >
                              <AiOutlineEdit />
                            </button>
                            <button
                              type="button"
                              className={styles.iconActionDanger}
                              aria-label="Delete slide"
                              onClick={() => handleDelete(slide.id)}
                            >
                              <AiOutlineDelete />
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </article>
              </section>
            ) : activeModule === "arrivals" ? (
              <NewArrivalManager
                apiBaseUrl={API_BASE_URL}
                styles={styles}
                uploadImageFile={uploadImageFile}
                resolveImageUrl={resolveImageUrl}
              />
            ) : activeModule === "products" ? (
              <section className={styles.layout}>
                <article className={styles.formCard}>
                  <div className={styles.formHead}>
                    <h2>{productEditingId ? "Edit Product" : "Add Product"}</h2>
                    {productEditingId ? (
                      <button type="button" className={styles.secondaryBtn} onClick={handleStartCreateProduct}>
                        <AiOutlinePlus />
                        New
                      </button>
                    ) : null}
                  </div>

                  <form onSubmit={handleSubmitProduct} className={styles.form}>
                    <label>
                      Product Name *
                      <input
                        type="text"
                        name="name"
                        value={productForm.name}
                        onChange={handleProductFieldChange}
                        required
                      />
                    </label>

                    <label>
                      Description
                      <textarea
                        name="description"
                        value={productForm.description}
                        onChange={handleProductFieldChange}
                        rows="3"
                      />
                    </label>

                    <label>
                      Image URL
                      <input
                        type="url"
                        name="image"
                        value={productForm.image}
                        onChange={handleProductFieldChange}
                      />
                    </label>

                    <label>
                      Upload Image
                      <input type="file" accept="image/*" onChange={handleProductImageUpload} />
                    </label>
                    {isProductImageUploading ? (
                      <p className={styles.helperText}>Uploading image...</p>
                    ) : null}

                    <div className={styles.row}>
                      <label>
                        Price *
                        <input
                          type="number"
                          name="price"
                          min="0"
                          step="0.01"
                          value={productForm.price}
                          onChange={handleProductFieldChange}
                          required
                        />
                      </label>
                      <label>
                        Old Price
                        <input
                          type="number"
                          name="old_price"
                          min="0"
                          step="0.01"
                          value={productForm.old_price}
                          onChange={handleProductFieldChange}
                        />
                      </label>
                    </div>

                    <div className={styles.row}>
                      <label>
                        Stock
                        <input
                          type="number"
                          name="stock"
                          min="0"
                          step="1"
                          value={productForm.stock}
                          onChange={handleProductFieldChange}
                        />
                      </label>
                      <label className={styles.checkboxField}>
                        <input
                          type="checkbox"
                          name="is_flash_sale"
                          checked={Boolean(productForm.is_flash_sale)}
                          onChange={handleProductFieldChange}
                        />
                        Include in Flash Sales Carousel
                      </label>
                    </div>
                    {productForm.is_flash_sale ? (
                      <p className={styles.helperText}>
                        Flash discount preview:{" "}
                        {getDiscountPercentage(productForm.price, productForm.old_price)}%
                      </p>
                    ) : null}

                    <label>
                      Category
                      <select name="category" value={productForm.category} onChange={handleProductFieldChange}>
                        <option value="">Uncategorized</option>
                        {productCategoryOptions.map((categoryName) => (
                          <option key={categoryName} value={categoryName}>
                            {categoryName}
                          </option>
                        ))}
                        <option value={PRODUCT_OTHER_CATEGORY}>Other</option>
                      </select>
                    </label>

                    {productForm.category === PRODUCT_OTHER_CATEGORY ? (
                      <label>
                        Other Category *
                        <input
                          type="text"
                          name="otherCategory"
                          value={productForm.otherCategory}
                          onChange={handleProductFieldChange}
                          placeholder="Enter category"
                          required
                        />
                      </label>
                    ) : null}

                    <div className={styles.formActions}>
                      <button type="submit" className={styles.primaryBtn} disabled={isProductSaving}>
                        {isProductSaving ? "Saving..." : productEditingId ? "Update Product" : "Add Product"}
                      </button>
                    </div>
                  </form>

                  {productStatus.text && (
                    <p
                      className={`${styles.status} ${
                        productStatus.type === "error" ? styles.error : styles.success
                      }`}
                    >
                      {productStatus.text}
                    </p>
                  )}
                </article>

                <article className={styles.listCard}>
                  <div className={styles.listHead}>
                    <h2>Products In Database</h2>
                    <button type="button" className={styles.secondaryBtn} onClick={() => loadProducts()}>
                      <AiOutlineReload />
                      Refresh
                    </button>
                  </div>

                  {isProductsLoading ? (
                    <p className={styles.listMessage}>Loading products...</p>
                  ) : products.length === 0 ? (
                    <p className={styles.listMessage}>No products found. Add your first product.</p>
                  ) : (
                    <div className={styles.slideList}>
                      {products.map((product) => (
                        <article key={product.id} className={styles.slideItem}>
                          <img
                            src={
                              resolveImageUrl(product.image) ||
                              "https://via.placeholder.com/640x420?text=Product"
                            }
                            alt={product.name}
                          />

                          <div className={styles.slideBody}>
                            <h3>{product.name}</h3>
                            <p>{product.description || "No description"}</p>
                            <div className={styles.meta}>
                              <span className={styles.priceLine}>${Number(product.price).toFixed(2)}</span>
                              {Number.isFinite(Number(product.old_price)) &&
                              Number(product.old_price) > Number(product.price) ? (
                                <>
                                  <span className={styles.oldPrice}>
                                    ${Number(product.old_price).toFixed(2)}
                                  </span>
                                  {product.is_flash_sale ? (
                                    <span className={styles.flashTag}>
                                      Flash -{getDiscountPercentage(product.price, product.old_price)}%
                                    </span>
                                  ) : null}
                                </>
                              ) : null}
                              <span>Stock: {product.stock}</span>
                              <span>{product.category_name || "Uncategorized"}</span>
                            </div>
                          </div>

                          <div className={styles.slideActions}>
                            <button
                              type="button"
                              className={styles.iconAction}
                              aria-label="Edit product"
                              onClick={() => handleStartEditProduct(product)}
                            >
                              <AiOutlineEdit />
                            </button>
                            <button
                              type="button"
                              className={styles.iconActionDanger}
                              aria-label="Delete product"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <AiOutlineDelete />
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}

                  <div className={styles.subSection}>
                    <h3 className={styles.subSectionTitle}>Flash Sales Carousel Source</h3>
                    {flashProducts.length === 0 ? (
                      <p className={styles.listMessage}>
                        No products are currently eligible. Enable Flash Sale and set an Old Price
                        greater than Price.
                      </p>
                    ) : (
                      <div className={styles.miniList}>
                        {flashProducts.map((product) => (
                          <span key={product.id}>
                            {product.name} (-{getDiscountPercentage(product.price, product.old_price)}%)
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              </section>
            ) : activeModule === "team" ? (
              <section className={styles.layout}>
                <article className={styles.formCard}>
                  <div className={styles.formHead}>
                    <h2>{teamEditingId ? "Edit Team Member" : "Add Team Member"}</h2>
                    {teamEditingId ? (
                      <button type="button" className={styles.secondaryBtn} onClick={handleStartCreateTeam}>
                        <AiOutlinePlus />
                        New
                      </button>
                    ) : null}
                  </div>

                  <form onSubmit={handleSubmitTeam} className={styles.form}>
                    <label>
                      Name *
                      <input
                        type="text"
                        name="name"
                        value={teamForm.name}
                        onChange={handleTeamFieldChange}
                        required
                      />
                    </label>

                    <label>
                      Role Title *
                      <input
                        type="text"
                        name="role_title"
                        value={teamForm.role_title}
                        onChange={handleTeamFieldChange}
                        required
                      />
                    </label>

                    <label>
                      Image URL *
                      <input
                        type="url"
                        name="image_url"
                        value={teamForm.image_url}
                        onChange={handleTeamFieldChange}
                        required
                      />
                    </label>

                    <label>
                      Upload Image
                      <input type="file" accept="image/*" onChange={handleTeamImageUpload} />
                    </label>
                    {isTeamImageUploading ? (
                      <p className={styles.helperText}>Uploading image...</p>
                    ) : null}

                    <label>
                      Bio
                      <textarea
                        name="bio"
                        value={teamForm.bio}
                        onChange={handleTeamFieldChange}
                        rows="3"
                      />
                    </label>

                    <div className={styles.row}>
                      <label>
                        X URL
                        <input
                          type="url"
                          name="x_url"
                          value={teamForm.x_url}
                          onChange={handleTeamFieldChange}
                        />
                      </label>
                      <label>
                        Instagram URL
                        <input
                          type="url"
                          name="instagram_url"
                          value={teamForm.instagram_url}
                          onChange={handleTeamFieldChange}
                        />
                      </label>
                    </div>

                    <div className={styles.row}>
                      <label>
                        LinkedIn URL
                        <input
                          type="url"
                          name="linkedin_url"
                          value={teamForm.linkedin_url}
                          onChange={handleTeamFieldChange}
                        />
                      </label>
                      <label>
                        Display Order
                        <input
                          type="number"
                          min="1"
                          name="display_order"
                          value={teamForm.display_order}
                          onChange={handleTeamFieldChange}
                        />
                      </label>
                    </div>

                    <label className={styles.checkboxField}>
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={teamForm.is_active}
                        onChange={handleTeamFieldChange}
                      />
                      Active on About Page
                    </label>

                    <div className={styles.formActions}>
                      <button type="submit" className={styles.primaryBtn} disabled={isTeamSaving}>
                        {isTeamSaving ? "Saving..." : teamEditingId ? "Update Member" : "Add Member"}
                      </button>
                    </div>
                  </form>

                  {teamStatus.text ? (
                    <p className={`${styles.status} ${teamStatus.type === "error" ? styles.error : styles.success}`}>
                      {teamStatus.text}
                    </p>
                  ) : null}
                </article>

                <article className={styles.listCard}>
                  <div className={styles.listHead}>
                    <h2>Team Members</h2>
                    <button type="button" className={styles.secondaryBtn} onClick={() => loadTeamMembers()}>
                      <AiOutlineReload />
                      Refresh
                    </button>
                  </div>

                  {isTeamLoading ? (
                    <p className={styles.listMessage}>Loading team members...</p>
                  ) : teamMembers.length === 0 ? (
                    <p className={styles.listMessage}>No team members found. Add the first profile.</p>
                  ) : (
                    <div className={styles.slideList}>
                      {teamMembers.map((member) => (
                        <article key={member.id} className={styles.slideItem}>
                          <img
                            src={
                              resolveImageUrl(member.image_url) ||
                              "https://via.placeholder.com/640x420?text=Team+Member"
                            }
                            alt={member.name}
                          />

                          <div className={styles.slideBody}>
                            <h3>{member.name}</h3>
                            <p>{member.role_title}</p>
                            <div className={styles.meta}>
                              <span>Order: {member.display_order}</span>
                              <span className={member.is_active ? styles.active : styles.inactive}>
                                {member.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </div>

                          <div className={styles.slideActions}>
                            <button
                              type="button"
                              className={styles.iconAction}
                              aria-label="Edit team member"
                              onClick={() => handleStartEditTeam(member)}
                            >
                              <AiOutlineEdit />
                            </button>
                            <button
                              type="button"
                              className={styles.iconActionDanger}
                              aria-label="Delete team member"
                              onClick={() => handleDeleteTeam(member.id)}
                            >
                              <AiOutlineDelete />
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </article>
              </section>
            ) : activeModule === "users" ? (
              <article className={styles.usersCard}>
                <div className={styles.usersHead}>
                  <h3>Registered Users</h3>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => loadUsers()}
                    disabled={isUsersLoading}
                  >
                    <AiOutlineReload />
                    Refresh
                  </button>
                </div>

                {isUsersLoading ? (
                  <p className={styles.listMessage}>Loading users...</p>
                ) : usersStatus.type === "error" ? (
                  <p className={`${styles.status} ${styles.error}`}>{usersStatus.text}</p>
                ) : users.length === 0 ? (
                  <p className={styles.listMessage}>No users found.</p>
                ) : (
                  <div className={styles.userList}>
                    {users.map((user) => {
                      const isCurrentAdmin = user.email === adminEmail;

                      return (
                        <article key={user.id} className={styles.userRow}>
                          <div className={styles.userIdentity}>
                            <h4>
                              {user.name}
                              {isCurrentAdmin ? <span className={styles.youBadge}>You</span> : null}
                            </h4>
                            <p>{user.email}</p>
                          </div>

                          <div className={styles.userMeta}>
                            <span className={styles.userDate}>
                              Joined {new Date(user.created_at).toLocaleDateString()}
                            </span>
                            <label className={styles.roleLabel}>
                              Role
                              <select
                                value={user.role}
                                onChange={(event) => handleRoleChange(user.id, event.target.value)}
                                disabled={isRoleSaving}
                              >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                              </select>
                            </label>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                {usersStatus.text && usersStatus.type !== "error" ? (
                  <p
                    className={`${styles.status} ${
                      usersStatus.type === "error" ? styles.error : styles.success
                    }`}
                  >
                    {usersStatus.text}
                  </p>
                ) : null}
              </article>
            ) : (
              <article className={styles.comingCard}>
                <h3>{selectedModule.label} Module</h3>
                <p>
                  This section is reserved for the next phase. The dashboard already supports module
                  switching, so we can add this without redesigning the page again.
                </p>
                <div className={styles.comingList}>
                  <div className={styles.comingItem}>
                    <span className={styles.moduleButtonIcon}>
                      <AiOutlinePlus />
                    </span>
                    <span>Create and edit records</span>
                  </div>
                  <div className={styles.comingItem}>
                    <span className={styles.moduleButtonIcon}>
                      <AiOutlineReload />
                    </span>
                    <span>Live list and filters</span>
                  </div>
                  <div className={styles.comingItem}>
                    <span className={styles.moduleButtonIcon}>
                      <AiOutlineEdit />
                    </span>
                    <span>Quick status updates</span>
                  </div>
                </div>
              </article>
            )}
          </section>
        </section>
      )}
    </main>
  );
}
