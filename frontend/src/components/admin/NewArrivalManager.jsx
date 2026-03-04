import { useEffect, useMemo, useState } from "react";
import { AiOutlineDelete, AiOutlineEdit, AiOutlinePlus, AiOutlineReload } from "react-icons/ai";

const getInitialForm = (displayOrder = 1) => ({
  title: "",
  subtitle: "",
  image_url: "",
  cta_text: "Shop Now",
  cta_link: "/category/all-products",
  display_order: displayOrder,
  is_active: true,
});

export default function NewArrivalManager({ apiBaseUrl, styles, uploadImageFile, resolveImageUrl }) {
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(getInitialForm());

  const nextDisplayOrder = useMemo(() => {
    if (cards.length === 0) return 1;
    const maxOrder = Math.max(...cards.map((card) => Number(card.display_order) || 0));
    return maxOrder + 1;
  }, [cards]);

  const loadCards = async () => {
    setIsLoading(true);
    setStatus({ type: "", text: "" });

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/new-arrivals`, {
        credentials: "include",
      });
      const data = await response.json().catch(() => []);

      if (!response.ok) {
        setStatus({ type: "error", text: data.message || "Could not load new arrival cards." });
        return [];
      }

      const list = Array.isArray(data) ? data : [];
      setCards(list);
      return list;
    } catch {
      setStatus({ type: "error", text: "Network error while loading new arrival cards." });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, []);

  useEffect(() => {
    if (editingId !== null) return;
    setForm((prev) => ({
      ...prev,
      display_order: prev.display_order || nextDisplayOrder,
    }));
  }, [editingId, nextDisplayOrder]);

  const handleFieldChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsImageUploading(true);
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
      setIsImageUploading(false);
    }
  };

  const handleStartCreate = () => {
    setEditingId(null);
    setStatus({ type: "", text: "" });
    setForm(getInitialForm(nextDisplayOrder));
  };

  const handleStartEdit = (card) => {
    setEditingId(card.id);
    setStatus({ type: "", text: "" });
    setForm({
      title: card.title || "",
      subtitle: card.subtitle || "",
      image_url: card.image_url || "",
      cta_text: card.cta_text || "Shop Now",
      cta_link: card.cta_link || "/category/all-products",
      display_order: Number(card.display_order) || 1,
      is_active: Boolean(card.is_active),
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      image_url: form.image_url.trim(),
      cta_text: (form.cta_text || "Shop Now").trim(),
      cta_link: (form.cta_link || "/category/all-products").trim(),
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
          ? `${apiBaseUrl}/api/admin/new-arrivals/${editingId}`
          : `${apiBaseUrl}/api/admin/new-arrivals`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus({ type: "error", text: data.message || "Could not save new arrival card." });
        return;
      }

      setStatus({ type: "success", text: isEditing ? "Card updated." : "Card created." });
      setEditingId(null);
      const refreshed = await loadCards();
      const maxOrder = refreshed.length
        ? Math.max(...refreshed.map((card) => Number(card.display_order) || 0))
        : 0;
      setForm(getInitialForm(maxOrder + 1));
    } catch {
      setStatus({ type: "error", text: "Network error while saving new arrival card." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (cardId) => {
    const shouldDelete = window.confirm("Delete this new arrival card?");
    if (!shouldDelete) return;

    setStatus({ type: "", text: "" });

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/new-arrivals/${cardId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus({ type: "error", text: data.message || "Could not delete new arrival card." });
        return;
      }

      setStatus({ type: "success", text: "Card deleted." });
      if (editingId === cardId) {
        setEditingId(null);
        setForm(getInitialForm(nextDisplayOrder));
      }
      await loadCards();
    } catch {
      setStatus({ type: "error", text: "Network error while deleting new arrival card." });
    }
  };

  return (
    <section className={styles.layout}>
      <article className={styles.formCard}>
        <div className={styles.formHead}>
          <h2>{editingId ? "Edit New Arrival Card" : "Add New Arrival Card"}</h2>
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
            <input type="text" name="title" value={form.title} onChange={handleFieldChange} required />
          </label>

          <label>
            Subtitle
            <textarea name="subtitle" value={form.subtitle} onChange={handleFieldChange} rows="3" />
          </label>

          <label>
            Image URL *
            <input type="url" name="image_url" value={form.image_url} onChange={handleFieldChange} required />
          </label>

          <label>
            Upload Image
            <input type="file" accept="image/*" onChange={handleImageUpload} />
          </label>
          {isImageUploading ? <p className={styles.helperText}>Uploading image...</p> : null}

          <div className={styles.row}>
            <label>
              CTA Text
              <input type="text" name="cta_text" value={form.cta_text} onChange={handleFieldChange} />
            </label>
            <label>
              CTA Link
              <input type="text" name="cta_link" value={form.cta_link} onChange={handleFieldChange} />
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
              <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleFieldChange} />
              Active on Home Page
            </label>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.primaryBtn} disabled={isSaving}>
              {isSaving ? "Saving..." : editingId ? "Update Card" : "Add Card"}
            </button>
          </div>
        </form>

        {status.text ? (
          <p className={`${styles.status} ${status.type === "error" ? styles.error : styles.success}`}>
            {status.text}
          </p>
        ) : null}
      </article>

      <article className={styles.listCard}>
        <div className={styles.listHead}>
          <h2>New Arrival Cards</h2>
          <button type="button" className={styles.secondaryBtn} onClick={() => loadCards()}>
            <AiOutlineReload />
            Refresh
          </button>
        </div>

        {isLoading ? (
          <p className={styles.listMessage}>Loading cards...</p>
        ) : cards.length === 0 ? (
          <p className={styles.listMessage}>No cards found. Add your first New Arrival card.</p>
        ) : (
          <div className={styles.slideList}>
            {cards.map((card) => (
              <article key={card.id} className={styles.slideItem}>
                <img
                  src={resolveImageUrl(card.image_url) || "https://via.placeholder.com/640x420?text=New+Arrival"}
                  alt={card.title}
                />

                <div className={styles.slideBody}>
                  <h3>{card.title}</h3>
                  <p>{card.subtitle || "No subtitle"}</p>
                  <div className={styles.meta}>
                    <span>Order: {card.display_order}</span>
                    <span className={card.is_active ? styles.active : styles.inactive}>
                      {card.is_active ? "Active" : "Inactive"}
                    </span>
                    <span>{card.cta_text || "Shop Now"}</span>
                  </div>
                </div>

                <div className={styles.slideActions}>
                  <button
                    type="button"
                    className={styles.iconAction}
                    aria-label="Edit new arrival card"
                    onClick={() => handleStartEdit(card)}
                  >
                    <AiOutlineEdit />
                  </button>
                  <button
                    type="button"
                    className={styles.iconActionDanger}
                    aria-label="Delete new arrival card"
                    onClick={() => handleDelete(card.id)}
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
  );
}
