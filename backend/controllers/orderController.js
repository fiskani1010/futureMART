const db = require("../config/db");

const query = (executor, sql, params = []) =>
    new Promise((resolve, reject) => {
        executor.query(sql, params, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(rows);
        });
    });

const getConnection = () =>
    new Promise((resolve, reject) => {
        db.getConnection((err, connection) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(connection);
        });
    });

const beginTransaction = (connection) =>
    new Promise((resolve, reject) => {
        connection.beginTransaction((err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });

const commit = (connection) =>
    new Promise((resolve, reject) => {
        connection.commit((err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });

const rollback = (connection) =>
    new Promise((resolve) => {
        connection.rollback(() => resolve());
    });

let ensureCheckoutTablePromise = null;

const ensureOrderCheckoutTable = async () => {
    if (!ensureCheckoutTablePromise) {
        ensureCheckoutTablePromise = query(
            db,
            `
                CREATE TABLE IF NOT EXISTS order_checkouts (
                    order_id INT PRIMARY KEY,
                    first_name VARCHAR(100),
                    last_name VARCHAR(100),
                    company_name VARCHAR(140),
                    street_address VARCHAR(255),
                    apartment VARCHAR(255),
                    city VARCHAR(120),
                    phone_number VARCHAR(60),
                    email VARCHAR(150),
                    payment_method VARCHAR(80),
                    bank_name VARCHAR(140),
                    coupon_code VARCHAR(60),
                    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (order_id) REFERENCES orders(id)
                        ON DELETE CASCADE
                )
            `,
        ).catch((error) => {
            ensureCheckoutTablePromise = null;
            throw error;
        });
    }

    return ensureCheckoutTablePromise;
};

const normalizeText = (value, max = 255) => {
    const normalized = String(value ?? "").trim();
    if (!normalized) return "";
    return normalized.slice(0, max);
};

const normalizeItems = (input) => {
    if (!Array.isArray(input)) return [];

    return input
        .map((item) => {
            const productId = Number(item?.product_id ?? item?.productId);
            const quantity = Number(item?.quantity);
            return {
                product_id: Number.isInteger(productId) ? productId : NaN,
                quantity: Number.isInteger(quantity) ? quantity : NaN,
            };
        })
        .filter(
            (item) =>
                Number.isInteger(item.product_id) &&
                item.product_id > 0 &&
                Number.isInteger(item.quantity) &&
                item.quantity > 0,
        );
};

const normalizeCheckoutMeta = (body) => ({
    first_name: normalizeText(body?.first_name, 100),
    last_name: normalizeText(body?.last_name, 100),
    company_name: normalizeText(body?.company_name, 140),
    street_address: normalizeText(body?.street_address, 255),
    apartment: normalizeText(body?.apartment, 255),
    city: normalizeText(body?.city, 120),
    phone_number: normalizeText(body?.phone_number, 60),
    email: normalizeText(body?.email, 150).toLowerCase(),
    payment_method: normalizeText(body?.payment_method, 80),
    bank_name: normalizeText(body?.bank_name, 140),
    coupon_code: normalizeText(body?.coupon_code, 60).toUpperCase(),
    discount_amount: Number.isFinite(Number(body?.discount_amount)) ? Number(body.discount_amount) : 0,
});

exports.createOrder = async (req, res) => {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(401).json({ message: "Authentication required" });
    }

    const normalizedItems = normalizeItems(req.body?.items);
    if (normalizedItems.length === 0) {
        return res.status(400).json({ message: "At least one order item is required" });
    }

    const checkoutMeta = normalizeCheckoutMeta(req.body || {});
    if (!checkoutMeta.first_name || !checkoutMeta.street_address || !checkoutMeta.city || !checkoutMeta.email) {
        return res.status(400).json({ message: "Billing details are incomplete" });
    }

    const uniqueProductIds = Array.from(new Set(normalizedItems.map((item) => item.product_id)));
    const placeholders = uniqueProductIds.map(() => "?").join(", ");

    let connection;
    try {
        await ensureOrderCheckoutTable();

        connection = await getConnection();
        await beginTransaction(connection);

        const productRows = await query(
            connection,
            `
                SELECT id, name, price, stock, image
                FROM products
                WHERE id IN (${placeholders})
            `,
            uniqueProductIds,
        );

        const productMap = new Map();
        (Array.isArray(productRows) ? productRows : []).forEach((row) => {
            productMap.set(Number(row.id), row);
        });

        for (const item of normalizedItems) {
            if (!productMap.has(item.product_id)) {
                throw new Error(`Product ${item.product_id} not found`);
            }
        }

        let totalAmount = 0;
        const preparedItems = normalizedItems.map((item) => {
            const product = productMap.get(item.product_id);
            const unitPrice = Number(product.price) || 0;
            const stock = Number(product.stock) || 0;

            if (item.quantity > stock) {
                const stockError = new Error(`Insufficient stock for ${product.name}`);
                stockError.code = "INSUFFICIENT_STOCK";
                throw stockError;
            }

            totalAmount += unitPrice * item.quantity;
            return {
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: unitPrice,
                product_name: product.name,
                product_image: product.image || "",
            };
        });

        const orderInsertResult = await query(
            connection,
            `
                INSERT INTO orders (user_id, total_amount, status)
                VALUES (?, ?, 'pending')
            `,
            [userId, totalAmount],
        );
        const orderId = Number(orderInsertResult.insertId);

        const orderItemPlaceholders = preparedItems.map(() => "(?, ?, ?, ?)").join(", ");
        const orderItemParams = [];
        preparedItems.forEach((item) => {
            orderItemParams.push(orderId, item.product_id, item.quantity, item.unit_price);
        });

        await query(
            connection,
            `
                INSERT INTO order_items (order_id, product_id, quantity, price)
                VALUES ${orderItemPlaceholders}
            `,
            orderItemParams,
        );

        for (const item of preparedItems) {
            const stockUpdate = await query(
                connection,
                "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?",
                [item.quantity, item.product_id, item.quantity],
            );

            if (!stockUpdate || stockUpdate.affectedRows === 0) {
                const stockError = new Error(`Insufficient stock for product ${item.product_id}`);
                stockError.code = "INSUFFICIENT_STOCK";
                throw stockError;
            }
        }

        await query(
            connection,
            `
                INSERT INTO order_checkouts (
                    order_id,
                    first_name,
                    last_name,
                    company_name,
                    street_address,
                    apartment,
                    city,
                    phone_number,
                    email,
                    payment_method,
                    bank_name,
                    coupon_code,
                    discount_amount
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                orderId,
                checkoutMeta.first_name,
                checkoutMeta.last_name,
                checkoutMeta.company_name,
                checkoutMeta.street_address,
                checkoutMeta.apartment,
                checkoutMeta.city,
                checkoutMeta.phone_number,
                checkoutMeta.email,
                checkoutMeta.payment_method,
                checkoutMeta.bank_name,
                checkoutMeta.coupon_code,
                checkoutMeta.discount_amount,
            ],
        );

        await commit(connection);

        return res.status(201).json({
            message: "Order placed successfully",
            order: {
                id: orderId,
                total_amount: Number(totalAmount.toFixed(2)),
                status: "pending",
                payment_method: checkoutMeta.payment_method,
                bank_name: checkoutMeta.bank_name,
                items: preparedItems,
            },
        });
    } catch (error) {
        if (connection) {
            await rollback(connection);
        }

        if (error.code === "INSUFFICIENT_STOCK") {
            return res.status(400).json({ message: error.message || "Insufficient stock" });
        }

        if (error.message && error.message.includes("not found")) {
            return res.status(404).json({ message: error.message });
        }

        console.error("Could not create order:", error.message);
        return res.status(500).json({ message: "Could not place order" });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

exports.getMyOrders = async (req, res) => {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(401).json({ message: "Authentication required" });
    }

    try {
        await ensureOrderCheckoutTable();

        const rows = await query(
            db,
            `
                SELECT
                    o.id AS order_id,
                    o.total_amount,
                    o.status,
                    o.created_at,
                    oc.first_name,
                    oc.last_name,
                    oc.company_name,
                    oc.street_address,
                    oc.apartment,
                    oc.city,
                    oc.phone_number,
                    oc.email,
                    oc.payment_method,
                    oc.bank_name,
                    oc.coupon_code,
                    oc.discount_amount,
                    oi.product_id,
                    oi.quantity,
                    oi.price,
                    p.name AS product_name,
                    p.image AS product_image
                FROM orders o
                LEFT JOIN order_checkouts oc ON oc.order_id = o.id
                LEFT JOIN order_items oi ON oi.order_id = o.id
                LEFT JOIN products p ON p.id = oi.product_id
                WHERE o.user_id = ?
                ORDER BY o.created_at DESC, o.id DESC, oi.id ASC
            `,
            [userId],
        );

        const grouped = new Map();
        (Array.isArray(rows) ? rows : []).forEach((row) => {
            const orderId = Number(row.order_id);
            if (!grouped.has(orderId)) {
                grouped.set(orderId, {
                    id: orderId,
                    total_amount: Number(row.total_amount) || 0,
                    status: row.status || "pending",
                    created_at: row.created_at,
                    billing: {
                        first_name: row.first_name || "",
                        last_name: row.last_name || "",
                        company_name: row.company_name || "",
                        street_address: row.street_address || "",
                        apartment: row.apartment || "",
                        city: row.city || "",
                        phone_number: row.phone_number || "",
                        email: row.email || "",
                    },
                    payment: {
                        payment_method: row.payment_method || "",
                        bank_name: row.bank_name || "",
                    },
                    coupon: {
                        code: row.coupon_code || "",
                        discount_amount: Number(row.discount_amount) || 0,
                    },
                    items: [],
                });
            }

            if (row.product_id) {
                grouped.get(orderId).items.push({
                    product_id: Number(row.product_id),
                    product_name: row.product_name || "Product",
                    product_image: row.product_image || "",
                    quantity: Number(row.quantity) || 0,
                    price: Number(row.price) || 0,
                });
            }
        });

        return res.status(200).json(Array.from(grouped.values()));
    } catch (error) {
        console.error("Could not load orders:", error.message);
        return res.status(500).json({ message: "Could not load purchase history" });
    }
};
