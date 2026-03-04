const db = require("../config/db");

const toPayload = (row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    created_at: row.created_at,
});

const parseOptionalPagination = (req) => {
    const pageRaw = Number(req.query?.page);
    const sizeRaw = Number(req.query?.page_size);

    if (!Number.isInteger(pageRaw) || pageRaw < 1) {
        return { enabled: false, page: 1, pageSize: 0, offset: 0 };
    }

    const normalizedSize = Number.isInteger(sizeRaw) && sizeRaw > 0 ? Math.min(sizeRaw, 100) : 24;
    return {
        enabled: true,
        page: pageRaw,
        pageSize: normalizedSize,
        offset: (pageRaw - 1) * normalizedSize,
    };
};

exports.getAdminUsers = (req, res) => {
    const pagination = parseOptionalPagination(req);
    const search = String(req.query?.q || "").trim();
    const roleFilter = String(req.query?.role || "").trim().toLowerCase();
    const whereClauses = [];
    const params = [];

    if (search) {
        const likeValue = `%${search}%`;
        whereClauses.push("(name LIKE ? OR email LIKE ?)");
        params.push(likeValue, likeValue);
    }

    if (roleFilter === "user" || roleFilter === "admin") {
        whereClauses.push("role = ?");
        params.push(roleFilter);
    }

    let query = `
        SELECT id, name, email, role, created_at
        FROM users
    `;

    if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    query += " ORDER BY created_at DESC, id DESC";

    const queryParams = [...params];
    if (pagination.enabled) {
        query += " LIMIT ? OFFSET ?";
        queryParams.push(pagination.pageSize, pagination.offset);
    }

    db.query(query, queryParams, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Could not load users" });
        }

        const mappedRows = rows.map(toPayload);
        if (!pagination.enabled) {
            return res.status(200).json(mappedRows);
        }

        let countQuery = "SELECT COUNT(*) AS total FROM users";
        if (whereClauses.length > 0) {
            countQuery += ` WHERE ${whereClauses.join(" AND ")}`;
        }

        db.query(countQuery, params, (countErr, countRows) => {
            if (countErr) {
                console.error(countErr);
                return res.status(500).json({ message: "Could not load users" });
            }

            const total = Number(countRows?.[0]?.total) || 0;
            return res.status(200).json({
                data: mappedRows,
                pagination: {
                    page: pagination.page,
                    page_size: pagination.pageSize,
                    total,
                    total_pages: total > 0 ? Math.ceil(total / pagination.pageSize) : 0,
                },
            });
        });
    });
};

exports.updateUserRole = (req, res) => {
    const userId = Number(req.params.id);
    const nextRole = typeof req.body?.role === "string" ? req.body.role.trim().toLowerCase() : "";

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ message: "Invalid user ID" });
    }

    if (nextRole !== "user" && nextRole !== "admin") {
        return res.status(400).json({ message: "Role must be user or admin" });
    }

    if (req.user?.id === userId && nextRole !== "admin") {
        return res.status(400).json({ message: "You cannot remove your own admin role" });
    }

    db.query("UPDATE users SET role = ? WHERE id = ?", [nextRole, userId], (updateErr, updateResult) => {
        if (updateErr) {
            console.error(updateErr);
            return res.status(500).json({ message: "Could not update role" });
        }

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        db.query(
            "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
            [userId],
            (selectErr, rows) => {
                if (selectErr) {
                    console.error(selectErr);
                    return res.status(500).json({ message: "Role updated but user fetch failed" });
                }

                return res.status(200).json(toPayload(rows[0]));
            },
        );
    });
};
