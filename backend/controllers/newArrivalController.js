const db = require("../config/db");

let newArrivalTableReady = false;

const newArrivalTableSql = `
    CREATE TABLE IF NOT EXISTS new_arrivals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(160) NOT NULL,
        subtitle VARCHAR(255),
        image_url VARCHAR(500) NOT NULL,
        cta_text VARCHAR(100) DEFAULT 'Shop Now',
        cta_link VARCHAR(255) DEFAULT '/',
        display_order INT DEFAULT 1,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
`;

const ensureNewArrivalTable = (callback) => {
    if (newArrivalTableReady) return callback(null);

    db.query(newArrivalTableSql, (err) => {
        if (err) return callback(err);
        newArrivalTableReady = true;
        return callback(null);
    });
};

const withNewArrivalTable = (res, next) => {
    ensureNewArrivalTable((err) => {
        if (!err) return next();

        console.error("New arrivals table setup failed:", err.message);
        return res.status(500).json({
            message:
                "New arrivals table is not ready. Check database permissions and schema setup.",
        });
    });
};

const toPayload = (row) => ({
    id: row.id,
    title: row.title,
    subtitle: row.subtitle || "",
    image_url: row.image_url,
    cta_text: row.cta_text || "Shop Now",
    cta_link: row.cta_link || "/",
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

const validatePayload = (payload) => {
    if (!payload.title) return "Title is required";
    if (!payload.image_url) return "Image URL is required";
    if (payload.title.length > 160) return "Title is too long";
    if (payload.subtitle.length > 255) return "Subtitle is too long";
    return "";
};

exports.getPublicNewArrivals = (req, res) => {
    return withNewArrivalTable(res, () => {
        const query = `
            SELECT id, title, subtitle, image_url, cta_text, cta_link, display_order, is_active
            FROM new_arrivals
            WHERE is_active = 1
            ORDER BY display_order ASC, id ASC
        `;

        db.query(query, (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Could not load new arrivals" });
            }

            return res.status(200).json(rows.map(toPayload));
        });
    });
};

exports.getAdminNewArrivals = (req, res) => {
    return withNewArrivalTable(res, () => {
        const query = `
            SELECT id, title, subtitle, image_url, cta_text, cta_link, display_order, is_active, created_at, updated_at
            FROM new_arrivals
            ORDER BY display_order ASC, id ASC
        `;

        db.query(query, (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Could not load new arrivals" });
            }

            return res.status(200).json(rows.map(toPayload));
        });
    });
};

exports.createNewArrival = (req, res) => {
    return withNewArrivalTable(res, () => {
        const payload = normalizeInput(req.body);
        const validationError = validatePayload(payload);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const insertQuery = `
            INSERT INTO new_arrivals (title, subtitle, image_url, cta_text, cta_link, display_order, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            payload.title,
            payload.subtitle || null,
            payload.image_url,
            payload.cta_text || "Shop Now",
            payload.cta_link || "/",
            payload.display_order,
            payload.is_active,
        ];

        db.query(insertQuery, values, (insertErr, insertResult) => {
            if (insertErr) {
                console.error(insertErr);
                return res.status(500).json({ message: "Could not create new arrival card" });
            }

            db.query(
                `
                    SELECT id, title, subtitle, image_url, cta_text, cta_link, display_order, is_active, created_at, updated_at
                    FROM new_arrivals
                    WHERE id = ?
                `,
                [insertResult.insertId],
                (selectErr, rows) => {
                    if (selectErr) {
                        console.error(selectErr);
                        return res.status(500).json({
                            message: "New arrival card created but could not be fetched",
                        });
                    }

                    return res.status(201).json(toPayload(rows[0]));
                },
            );
        });
    });
};

exports.updateNewArrival = (req, res) => {
    return withNewArrivalTable(res, () => {
        const cardId = Number(req.params.id);
        if (!Number.isInteger(cardId) || cardId <= 0) {
            return res.status(400).json({ message: "Invalid card ID" });
        }

        const payload = normalizeInput(req.body);
        const validationError = validatePayload(payload);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const updateQuery = `
            UPDATE new_arrivals
            SET title = ?, subtitle = ?, image_url = ?, cta_text = ?, cta_link = ?, display_order = ?, is_active = ?
            WHERE id = ?
        `;

        const values = [
            payload.title,
            payload.subtitle || null,
            payload.image_url,
            payload.cta_text || "Shop Now",
            payload.cta_link || "/",
            payload.display_order,
            payload.is_active,
            cardId,
        ];

        db.query(updateQuery, values, (updateErr, updateResult) => {
            if (updateErr) {
                console.error(updateErr);
                return res.status(500).json({ message: "Could not update new arrival card" });
            }

            if (updateResult.affectedRows === 0) {
                return res.status(404).json({ message: "New arrival card not found" });
            }

            db.query(
                `
                    SELECT id, title, subtitle, image_url, cta_text, cta_link, display_order, is_active, created_at, updated_at
                    FROM new_arrivals
                    WHERE id = ?
                `,
                [cardId],
                (selectErr, rows) => {
                    if (selectErr) {
                        console.error(selectErr);
                        return res.status(500).json({
                            message: "New arrival card updated but could not be fetched",
                        });
                    }

                    return res.status(200).json(toPayload(rows[0]));
                },
            );
        });
    });
};

exports.deleteNewArrival = (req, res) => {
    return withNewArrivalTable(res, () => {
        const cardId = Number(req.params.id);
        if (!Number.isInteger(cardId) || cardId <= 0) {
            return res.status(400).json({ message: "Invalid card ID" });
        }

        db.query("DELETE FROM new_arrivals WHERE id = ?", [cardId], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Could not delete new arrival card" });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "New arrival card not found" });
            }

            return res.status(200).json({ message: "New arrival card deleted successfully" });
        });
    });
};
