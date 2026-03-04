const db = require("../config/db");

const toPayload = (row) => ({
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    image_url: row.image_url,
    cta_text: row.cta_text,
    cta_link: row.cta_link,
    display_order: row.display_order,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
});

const normalizeInput = (body) => ({
    title: typeof body.title === "string" ? body.title.trim() : "",
    subtitle: typeof body.subtitle === "string" ? body.subtitle.trim() : "",
    image_url: typeof body.image_url === "string" ? body.image_url.trim() : "",
    cta_text: typeof body.cta_text === "string" ? body.cta_text.trim() : "Shop Now",
    cta_link: typeof body.cta_link === "string" ? body.cta_link.trim() : "/",
    display_order: Number.isFinite(Number(body.display_order)) ? Number(body.display_order) : 1,
    is_active: body.is_active === false ? 0 : 1,
});

exports.getPublicHeroSlides = (req, res) => {
    const query = `
        SELECT id, title, subtitle, image_url, cta_text, cta_link, display_order, is_active
        FROM hero_slides
        WHERE is_active = 1
        ORDER BY display_order ASC, id ASC
    `;

    db.query(query, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Server error" });
        }

        return res.status(200).json(rows.map(toPayload));
    });
};

exports.getAdminHeroSlides = (req, res) => {
    const query = `
        SELECT id, title, subtitle, image_url, cta_text, cta_link, display_order, is_active, created_at, updated_at
        FROM hero_slides
        ORDER BY display_order ASC, id ASC
    `;

    db.query(query, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Server error" });
        }

        return res.status(200).json(rows.map(toPayload));
    });
};

exports.createHeroSlide = (req, res) => {
    const payload = normalizeInput(req.body);

    if (!payload.title || !payload.image_url) {
        return res.status(400).json({ message: "Title and image URL are required" });
    }

    const insertQuery = `
        INSERT INTO hero_slides (title, subtitle, image_url, cta_text, cta_link, display_order, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        payload.title,
        payload.subtitle,
        payload.image_url,
        payload.cta_text || "Shop Now",
        payload.cta_link || "/",
        payload.display_order,
        payload.is_active,
    ];

    db.query(insertQuery, values, (insertErr, insertResult) => {
        if (insertErr) {
            console.error(insertErr);
            return res.status(500).json({ message: "Could not create slide" });
        }

        db.query(
            `
                SELECT id, title, subtitle, image_url, cta_text, cta_link, display_order, is_active, created_at, updated_at
                FROM hero_slides
                WHERE id = ?
            `,
            [insertResult.insertId],
            (selectErr, rows) => {
                if (selectErr) {
                    console.error(selectErr);
                    return res.status(500).json({ message: "Slide created but could not be fetched" });
                }

                return res.status(201).json(toPayload(rows[0]));
            },
        );
    });
};

exports.updateHeroSlide = (req, res) => {
    const slideId = Number(req.params.id);
    if (!Number.isInteger(slideId) || slideId <= 0) {
        return res.status(400).json({ message: "Invalid slide ID" });
    }

    const payload = normalizeInput(req.body);
    if (!payload.title || !payload.image_url) {
        return res.status(400).json({ message: "Title and image URL are required" });
    }

    const updateQuery = `
        UPDATE hero_slides
        SET title = ?, subtitle = ?, image_url = ?, cta_text = ?, cta_link = ?, display_order = ?, is_active = ?
        WHERE id = ?
    `;

    const values = [
        payload.title,
        payload.subtitle,
        payload.image_url,
        payload.cta_text || "Shop Now",
        payload.cta_link || "/",
        payload.display_order,
        payload.is_active,
        slideId,
    ];

    db.query(updateQuery, values, (updateErr, updateResult) => {
        if (updateErr) {
            console.error(updateErr);
            return res.status(500).json({ message: "Could not update slide" });
        }

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ message: "Slide not found" });
        }

        db.query(
            `
                SELECT id, title, subtitle, image_url, cta_text, cta_link, display_order, is_active, created_at, updated_at
                FROM hero_slides
                WHERE id = ?
            `,
            [slideId],
            (selectErr, rows) => {
                if (selectErr) {
                    console.error(selectErr);
                    return res.status(500).json({ message: "Slide updated but could not be fetched" });
                }

                return res.status(200).json(toPayload(rows[0]));
            },
        );
    });
};

exports.deleteHeroSlide = (req, res) => {
    const slideId = Number(req.params.id);
    if (!Number.isInteger(slideId) || slideId <= 0) {
        return res.status(400).json({ message: "Invalid slide ID" });
    }

    db.query("DELETE FROM hero_slides WHERE id = ?", [slideId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Could not delete slide" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Slide not found" });
        }

        return res.status(200).json({ message: "Slide deleted successfully" });
    });
};
