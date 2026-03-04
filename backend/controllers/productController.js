const db = require("../config/db");

const productSelectColumns = `
    p.id,
    p.name,
    p.description,
    p.price,
    p.old_price,
    p.image,
    p.stock,
    p.is_flash_sale,
    p.category_id,
    c.name AS category_name,
    p.created_at
`;

const toNumberOrNull = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
};

const computeDiscountPercentage = (price, oldPrice) => {
    if (!Number.isFinite(price) || !Number.isFinite(oldPrice) || oldPrice <= 0 || oldPrice <= price) {
        return 0;
    }

    return Math.round(((oldPrice - price) / oldPrice) * 100);
};

const toPayload = (row) => ({
    id: row.id,
    name: row.name,
    description: row.description || "",
    price: Number(row.price),
    old_price: toNumberOrNull(row.old_price),
    image: row.image || "",
    stock: Number(row.stock) || 0,
    is_flash_sale: Boolean(row.is_flash_sale),
    discount_percentage: computeDiscountPercentage(Number(row.price), toNumberOrNull(row.old_price)),
    category_id: row.category_id,
    category_name: row.category_name || "",
    total_sold: Number(row.total_sold) || 0,
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

const normalizeInput = (body) => {
    const priceValue = Number(body.price);
    const oldPriceValue =
        body.old_price === null || body.old_price === undefined || body.old_price === ""
            ? null
            : Number(body.old_price);
    const stockValue = Number(body.stock);

    return {
        name: typeof body.name === "string" ? body.name.trim() : "",
        description: typeof body.description === "string" ? body.description.trim() : "",
        image: typeof body.image === "string" ? body.image.trim() : "",
        price: Number.isFinite(priceValue) ? priceValue : NaN,
        old_price: oldPriceValue === null ? null : Number.isFinite(oldPriceValue) ? oldPriceValue : NaN,
        stock: Number.isFinite(stockValue) ? Math.max(0, Math.trunc(stockValue)) : 0,
        is_flash_sale: body.is_flash_sale === true || body.is_flash_sale === 1 || body.is_flash_sale === "1",
        category_name: typeof body.category_name === "string" ? body.category_name.trim() : "",
    };
};

const buildProductFilters = ({ flashOnly = false, search = "" } = {}) => {
    const whereClauses = [];
    const params = [];

    if (flashOnly) {
        whereClauses.push("p.is_flash_sale = 1");
        whereClauses.push("p.old_price IS NOT NULL");
        whereClauses.push("p.old_price > p.price");
    }

    const keyword = String(search || "").trim();
    if (keyword) {
        const likeValue = `%${keyword}%`;
        whereClauses.push("(p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)");
        params.push(likeValue, likeValue, likeValue);
    }

    return { whereClauses, params };
};

const fetchProducts = ({ flashOnly = false, search = "", limit = null, offset = 0 }, callback) => {
    const { whereClauses, params } = buildProductFilters({ flashOnly, search });

    let query = `
        SELECT ${productSelectColumns}
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
    `;

    if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    query += " ORDER BY p.created_at DESC, p.id DESC";

    const queryParams = [...params];
    if (Number.isInteger(limit) && limit > 0) {
        query += " LIMIT ? OFFSET ?";
        queryParams.push(limit, Math.max(0, Number(offset) || 0));
    }

    db.query(query, queryParams, (err, rows) => callback(err, rows));
};

const countProducts = ({ flashOnly = false, search = "" }, callback) => {
    const { whereClauses, params } = buildProductFilters({ flashOnly, search });

    let query = `
        SELECT COUNT(*) AS total
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
    `;

    if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    db.query(query, params, (err, rows) => {
        if (err) return callback(err);
        return callback(null, Number(rows?.[0]?.total) || 0);
    });
};

const fetchProductById = (productId, callback) => {
    const query = `
        SELECT ${productSelectColumns}
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.id = ?
    `;

    db.query(query, [productId], (err, rows) => callback(err, rows?.[0]));
};

const fetchBestSellingProducts = ({ limit = 8 }, callback) => {
    const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 20) : 8;

    const query = `
        SELECT ${productSelectColumns},
               COALESCE(sales.total_sold, 0) AS total_sold
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN (
            SELECT
                oi.product_id,
                SUM(
                    CASE
                        WHEN YEAR(o.created_at) = YEAR(CURRENT_DATE())
                             AND MONTH(o.created_at) = MONTH(CURRENT_DATE())
                        THEN oi.quantity
                        ELSE 0
                    END
                ) AS total_sold
            FROM order_items oi
            INNER JOIN orders o ON o.id = oi.order_id
            GROUP BY oi.product_id
        ) sales ON sales.product_id = p.id
        ORDER BY total_sold DESC, p.created_at DESC, p.id DESC
        LIMIT ?
    `;

    db.query(query, [safeLimit], (err, rows) => callback(err, rows));
};

const resolveCategoryId = (categoryName, callback) => {
    if (!categoryName) {
        return callback(null, null);
    }

    const selectQuery = "SELECT id FROM categories WHERE LOWER(name) = LOWER(?) LIMIT 1";
    db.query(selectQuery, [categoryName], (selectErr, rows) => {
        if (selectErr) {
            return callback(selectErr);
        }

        if (rows.length > 0) {
            return callback(null, rows[0].id);
        }

        db.query("INSERT INTO categories (name) VALUES (?)", [categoryName], (insertErr, insertResult) => {
            if (insertErr) {
                if (insertErr.code === "ER_DUP_ENTRY") {
                    return db.query(selectQuery, [categoryName], (retryErr, retryRows) => {
                        if (retryErr) {
                            return callback(retryErr);
                        }

                        return callback(null, retryRows?.[0]?.id ?? null);
                    });
                }

                return callback(insertErr);
            }

            return callback(null, insertResult.insertId);
        });
    });
};

const validateProductPayload = (payload) => {
    if (!payload.name) {
        return "Product name is required";
    }

    if (!Number.isFinite(payload.price) || payload.price < 0) {
        return "Price must be a valid non-negative number";
    }

    if (payload.old_price !== null && (!Number.isFinite(payload.old_price) || payload.old_price < 0)) {
        return "Old price must be a valid non-negative number";
    }

    if (payload.is_flash_sale) {
        if (payload.old_price === null) {
            return "Old price is required when Flash Sale is enabled";
        }

        if (payload.old_price <= payload.price) {
            return "Old price must be greater than current price for Flash Sale";
        }
    }

    if (payload.category_name.length > 100) {
        return "Category name cannot exceed 100 characters";
    }

    return "";
};

const respondProductList = ({ req, res, rows, total }) => {
    const pagination = parseOptionalPagination(req);
    const payloadRows = rows.map(toPayload);

    if (!pagination.enabled) {
        return res.status(200).json(payloadRows);
    }

    return res.status(200).json({
        data: payloadRows,
        pagination: {
            page: pagination.page,
            page_size: pagination.pageSize,
            total,
            total_pages: total > 0 ? Math.ceil(total / pagination.pageSize) : 0,
        },
    });
};

exports.getAllProducts = (req, res) => {
    const pagination = parseOptionalPagination(req);
    const search = String(req.query?.q || "").trim();

    fetchProducts(
        {
            search,
            limit: pagination.enabled ? pagination.pageSize : null,
            offset: pagination.enabled ? pagination.offset : 0,
        },
        (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Could not load products" });
            }

            if (!pagination.enabled) {
                return respondProductList({ req, res, rows, total: rows.length });
            }

            return countProducts({ search }, (countErr, total) => {
                if (countErr) {
                    console.error(countErr);
                    return res.status(500).json({ message: "Could not load products" });
                }

                return respondProductList({ req, res, rows, total });
            });
        },
    );
};

exports.getAdminProducts = (req, res) => {
    const pagination = parseOptionalPagination(req);
    const search = String(req.query?.q || "").trim();

    fetchProducts(
        {
            search,
            limit: pagination.enabled ? pagination.pageSize : null,
            offset: pagination.enabled ? pagination.offset : 0,
        },
        (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Could not load products" });
            }

            if (!pagination.enabled) {
                return respondProductList({ req, res, rows, total: rows.length });
            }

            return countProducts({ search }, (countErr, total) => {
                if (countErr) {
                    console.error(countErr);
                    return res.status(500).json({ message: "Could not load products" });
                }

                return respondProductList({ req, res, rows, total });
            });
        },
    );
};

exports.getFlashSaleProducts = (req, res) => {
    const pagination = parseOptionalPagination(req);
    const search = String(req.query?.q || "").trim();

    fetchProducts(
        {
            flashOnly: true,
            search,
            limit: pagination.enabled ? pagination.pageSize : null,
            offset: pagination.enabled ? pagination.offset : 0,
        },
        (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Could not load flash sale products" });
            }

            if (!pagination.enabled) {
                return respondProductList({ req, res, rows, total: rows.length });
            }

            return countProducts({ flashOnly: true, search }, (countErr, total) => {
                if (countErr) {
                    console.error(countErr);
                    return res.status(500).json({ message: "Could not load flash sale products" });
                }

                return respondProductList({ req, res, rows, total });
            });
        },
    );
};

exports.getBestSellingProducts = (req, res) => {
    const rawLimit = Number(req.query?.limit);
    const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? rawLimit : 8;

    fetchBestSellingProducts({ limit }, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Could not load best selling products" });
        }

        return res.status(200).json((Array.isArray(rows) ? rows : []).map(toPayload));
    });
};

exports.getProductById = (req, res) => {
    const productId = Number(req.params.id);
    if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ message: "Invalid product ID" });
    }

    return fetchProductById(productId, (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Could not load product" });
        }

        if (!row) {
            return res.status(404).json({ message: "Product not found" });
        }

        return res.status(200).json(toPayload(row));
    });
};

exports.createProduct = (req, res) => {
    const payload = normalizeInput(req.body);
    const validationError = validateProductPayload(payload);

    if (validationError) {
        return res.status(400).json({ message: validationError });
    }

    resolveCategoryId(payload.category_name, (categoryErr, categoryId) => {
        if (categoryErr) {
            console.error(categoryErr);
            return res.status(500).json({ message: "Could not resolve category" });
        }

        const insertQuery = `
            INSERT INTO products (name, description, price, old_price, image, stock, is_flash_sale, category_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            payload.name,
            payload.description || null,
            payload.price,
            payload.old_price,
            payload.image || null,
            payload.stock,
            payload.is_flash_sale ? 1 : 0,
            categoryId,
        ];

        db.query(insertQuery, values, (insertErr, insertResult) => {
            if (insertErr) {
                console.error(insertErr);
                return res.status(500).json({ message: "Could not create product" });
            }

            return fetchProductById(insertResult.insertId, (fetchErr, row) => {
                if (fetchErr) {
                    console.error(fetchErr);
                    return res.status(500).json({ message: "Product created but fetch failed" });
                }

                if (!row) {
                    return res.status(500).json({ message: "Product created but could not be found" });
                }

                return res.status(201).json(toPayload(row));
            });
        });
    });
};

exports.updateProduct = (req, res) => {
    const productId = Number(req.params.id);
    if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ message: "Invalid product ID" });
    }

    const payload = normalizeInput(req.body);
    const validationError = validateProductPayload(payload);
    if (validationError) {
        return res.status(400).json({ message: validationError });
    }

    resolveCategoryId(payload.category_name, (categoryErr, categoryId) => {
        if (categoryErr) {
            console.error(categoryErr);
            return res.status(500).json({ message: "Could not resolve category" });
        }

        const updateQuery = `
            UPDATE products
            SET name = ?, description = ?, price = ?, old_price = ?, image = ?, stock = ?, is_flash_sale = ?, category_id = ?
            WHERE id = ?
        `;

        const values = [
            payload.name,
            payload.description || null,
            payload.price,
            payload.old_price,
            payload.image || null,
            payload.stock,
            payload.is_flash_sale ? 1 : 0,
            categoryId,
            productId,
        ];

        db.query(updateQuery, values, (updateErr, updateResult) => {
            if (updateErr) {
                console.error(updateErr);
                return res.status(500).json({ message: "Could not update product" });
            }

            return fetchProductById(productId, (fetchErr, row) => {
                if (fetchErr) {
                    console.error(fetchErr);
                    return res.status(500).json({ message: "Product updated but fetch failed" });
                }

                if (!row) {
                    if (updateResult.affectedRows === 0) {
                        return res.status(404).json({ message: "Product not found" });
                    }

                    return res.status(500).json({ message: "Product updated but could not be found" });
                }

                return res.status(200).json(toPayload(row));
            });
        });
    });
};

exports.deleteProduct = (req, res) => {
    const productId = Number(req.params.id);
    if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ message: "Invalid product ID" });
    }

    db.query("DELETE FROM products WHERE id = ?", [productId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Could not delete product" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Product not found" });
        }

        return res.status(200).json({ message: "Product deleted successfully" });
    });
};
