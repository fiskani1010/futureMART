const db = require("../config/db");

let teamTableReady = false;

const teamTableSql = `
    CREATE TABLE IF NOT EXISTS team_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) NOT NULL UNIQUE,
        role_title VARCHAR(120) NOT NULL,
        image_url VARCHAR(500) NOT NULL,
        bio VARCHAR(500),
        x_url VARCHAR(500),
        instagram_url VARCHAR(500),
        linkedin_url VARCHAR(500),
        display_order INT DEFAULT 1,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
`;

const ensureTeamTable = (callback) => {
    if (teamTableReady) {
        return callback(null);
    }

    db.query(teamTableSql, (err) => {
        if (err) {
            return callback(err);
        }

        teamTableReady = true;
        return callback(null);
    });
};

const withTeamTable = (res, next) => {
    ensureTeamTable((err) => {
        if (!err) return next();

        console.error("Team table setup failed:", err.message);
        return res.status(500).json({
            message:
                "Team members table is not ready. Check database permissions and schema setup.",
        });
    });
};

const toPayload = (row) => ({
    id: row.id,
    name: row.name,
    role_title: row.role_title,
    image_url: row.image_url,
    bio: row.bio || "",
    x_url: row.x_url || "",
    instagram_url: row.instagram_url || "",
    linkedin_url: row.linkedin_url || "",
    display_order: row.display_order,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
});

const normalizeInput = (body) => ({
    name: typeof body.name === "string" ? body.name.trim() : "",
    role_title: typeof body.role_title === "string" ? body.role_title.trim() : "",
    image_url: typeof body.image_url === "string" ? body.image_url.trim() : "",
    bio: typeof body.bio === "string" ? body.bio.trim() : "",
    x_url: typeof body.x_url === "string" ? body.x_url.trim() : "",
    instagram_url: typeof body.instagram_url === "string" ? body.instagram_url.trim() : "",
    linkedin_url: typeof body.linkedin_url === "string" ? body.linkedin_url.trim() : "",
    display_order: Number.isFinite(Number(body.display_order)) ? Number(body.display_order) : 1,
    is_active: body.is_active === false ? 0 : 1,
});

const validatePayload = (payload) => {
    if (!payload.name) return "Name is required";
    if (!payload.role_title) return "Role title is required";
    if (!payload.image_url) return "Image URL is required";
    if (payload.name.length > 120) return "Name is too long";
    if (payload.role_title.length > 120) return "Role title is too long";
    if (payload.bio.length > 500) return "Bio is too long";
    return "";
};

exports.getPublicTeamMembers = (req, res) => {
    return withTeamTable(res, () => {
        const query = `
            SELECT id, name, role_title, image_url, bio, x_url, instagram_url, linkedin_url, display_order, is_active
            FROM team_members
            WHERE is_active = 1
            ORDER BY display_order ASC, id ASC
        `;

        db.query(query, (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Could not load team members" });
            }

            return res.status(200).json(rows.map(toPayload));
        });
    });
};

exports.getAdminTeamMembers = (req, res) => {
    return withTeamTable(res, () => {
        const query = `
            SELECT id, name, role_title, image_url, bio, x_url, instagram_url, linkedin_url, display_order, is_active, created_at, updated_at
            FROM team_members
            ORDER BY display_order ASC, id ASC
        `;

        db.query(query, (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Could not load team members" });
            }

            return res.status(200).json(rows.map(toPayload));
        });
    });
};

exports.createTeamMember = (req, res) => {
    return withTeamTable(res, () => {
        const payload = normalizeInput(req.body);
        const validationError = validatePayload(payload);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const insertQuery = `
            INSERT INTO team_members (name, role_title, image_url, bio, x_url, instagram_url, linkedin_url, display_order, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            payload.name,
            payload.role_title,
            payload.image_url,
            payload.bio || null,
            payload.x_url || null,
            payload.instagram_url || null,
            payload.linkedin_url || null,
            payload.display_order,
            payload.is_active,
        ];

        db.query(insertQuery, values, (insertErr, insertResult) => {
            if (insertErr) {
                console.error(insertErr);
                if (insertErr.code === "ER_DUP_ENTRY") {
                    return res.status(409).json({ message: "A team member with this name already exists" });
                }
                return res.status(500).json({ message: "Could not create team member" });
            }

            db.query(
                `
                    SELECT id, name, role_title, image_url, bio, x_url, instagram_url, linkedin_url, display_order, is_active, created_at, updated_at
                    FROM team_members
                    WHERE id = ?
                `,
                [insertResult.insertId],
                (selectErr, rows) => {
                    if (selectErr) {
                        console.error(selectErr);
                        return res.status(500).json({ message: "Team member created but could not be fetched" });
                    }

                    return res.status(201).json(toPayload(rows[0]));
                },
            );
        });
    });
};

exports.updateTeamMember = (req, res) => {
    return withTeamTable(res, () => {
        const memberId = Number(req.params.id);
        if (!Number.isInteger(memberId) || memberId <= 0) {
            return res.status(400).json({ message: "Invalid team member ID" });
        }

        const payload = normalizeInput(req.body);
        const validationError = validatePayload(payload);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const updateQuery = `
            UPDATE team_members
            SET name = ?, role_title = ?, image_url = ?, bio = ?, x_url = ?, instagram_url = ?, linkedin_url = ?, display_order = ?, is_active = ?
            WHERE id = ?
        `;

        const values = [
            payload.name,
            payload.role_title,
            payload.image_url,
            payload.bio || null,
            payload.x_url || null,
            payload.instagram_url || null,
            payload.linkedin_url || null,
            payload.display_order,
            payload.is_active,
            memberId,
        ];

        db.query(updateQuery, values, (updateErr, updateResult) => {
            if (updateErr) {
                console.error(updateErr);
                if (updateErr.code === "ER_DUP_ENTRY") {
                    return res.status(409).json({ message: "A team member with this name already exists" });
                }
                return res.status(500).json({ message: "Could not update team member" });
            }

            if (updateResult.affectedRows === 0) {
                return res.status(404).json({ message: "Team member not found" });
            }

            db.query(
                `
                    SELECT id, name, role_title, image_url, bio, x_url, instagram_url, linkedin_url, display_order, is_active, created_at, updated_at
                    FROM team_members
                    WHERE id = ?
                `,
                [memberId],
                (selectErr, rows) => {
                    if (selectErr) {
                        console.error(selectErr);
                        return res.status(500).json({ message: "Team member updated but could not be fetched" });
                    }

                    return res.status(200).json(toPayload(rows[0]));
                },
            );
        });
    });
};

exports.deleteTeamMember = (req, res) => {
    return withTeamTable(res, () => {
        const memberId = Number(req.params.id);
        if (!Number.isInteger(memberId) || memberId <= 0) {
            return res.status(400).json({ message: "Invalid team member ID" });
        }

        db.query("DELETE FROM team_members WHERE id = ?", [memberId], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Could not delete team member" });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Team member not found" });
            }

            return res.status(200).json({ message: "Team member deleted successfully" });
        });
    });
};
