CREATE DATABASE IF NOT EXISTS ecommerce;
USE ecommerce;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_email_otps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    purpose ENUM('register', 'reset_password') NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    payload_json TEXT NULL,
    attempt_count INT DEFAULT 0,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_auth_email_otps_lookup (email, purpose, used_at, expires_at)
);

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INT PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone_number VARCHAR(60),
    address_line VARCHAR(255),
    city VARCHAR(120),
    payment_method VARCHAR(80),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    old_price DECIMAL(10,2) NULL,
    image VARCHAR(255),
    stock INT DEFAULT 0,
    is_flash_sale TINYINT(1) DEFAULT 0,
    category_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS cart (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'paid', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
        ON DELETE CASCADE
);

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
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS hero_slides (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    image_url VARCHAR(500) NOT NULL,
    cta_text VARCHAR(100) DEFAULT 'Shop Now',
    cta_link VARCHAR(255) DEFAULT '/',
    display_order INT DEFAULT 1,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

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
);

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
);

INSERT INTO products (name, description, price, old_price, image, stock, is_flash_sale, category_id)
VALUES
    ('Laptop', 'High-performance laptop', 1200.00, 1500.00, 'https://via.placeholder.com/640x420?text=Laptop', 10, 1, NULL),
    ('Smartphone', 'Latest model smartphone', 800.00, 950.00, 'https://via.placeholder.com/640x420?text=Smartphone', 25, 1, NULL),
    ('Headphones', 'Noise-cancelling headphones', 150.00, NULL, 'https://via.placeholder.com/640x420?text=Headphones', 50, 0, NULL);

INSERT INTO hero_slides (title, subtitle, image_url, cta_text, cta_link, display_order, is_active)
VALUES
    ('Up to 10% off Voucher', 'iPhone 14 Series', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9', 'Shop Now', '/', 1, 1),
    ('Latest Sneakers', 'New Collection', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff', 'Explore', '/', 2, 1),
    ('Smart Watches', 'Upgrade Your Style', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30', 'Discover', '/', 3, 1);

INSERT IGNORE INTO team_members (name, role_title, image_url, bio, x_url, instagram_url, linkedin_url, display_order, is_active)
VALUES
    ('Tom Cruise', 'Founder & Chairman', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=500&q=80', 'Building FutureMart with a customer-first vision.', 'https://x.com', 'https://instagram.com', 'https://linkedin.com', 1, 1),
    ('Emma Watson', 'Managing Director', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=500&q=80', 'Leading operations and product excellence.', 'https://x.com', 'https://instagram.com', 'https://linkedin.com', 2, 1),
    ('Will Smith', 'Product Designer', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80', 'Crafting product experiences people love.', 'https://x.com', 'https://instagram.com', 'https://linkedin.com', 3, 1);

INSERT INTO new_arrivals (title, subtitle, image_url, cta_text, cta_link, display_order, is_active)
VALUES
    ('PlayStation 5', 'Black and White version of the PS5 coming out on sale.', 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80', 'Shop Now', '/category/all-products', 1, 1),
    ('Women''s Collections', 'Featured woman collections that give you another vibe.', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80', 'Shop Now', '/category/all-products', 2, 1),
    ('Speakers', 'Amazon wireless speakers', 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1200&q=80', 'Shop Now', '/category/all-products', 3, 1),
    ('Perfume', 'GUCCI INTENSE OUD EDP', 'https://images.unsplash.com/photo-1619994403073-2cecddf8c3b5?auto=format&fit=crop&w=1200&q=80', 'Shop Now', '/category/all-products', 4, 1);
