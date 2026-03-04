USE ecommerce;

-- Set these values before running this seed file.
SET @admin_name := 'FutureMart Admin';
SET @admin_email := 'admin@example.com';
SET @admin_password_hash := '$2b$12$replace_with_generated_hash';

INSERT INTO users (name, email, password, role)
SELECT
    @admin_name,
    @admin_email,
    @admin_password_hash,
    'admin'
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = @admin_email
);
