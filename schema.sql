-- MySQL 8 schema draft for SeoulPick buying system.
-- Recommended EF Core provider: Pomelo.EntityFrameworkCore.MySql.

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NULL,
  phone VARBINARY(512) NOT NULL,
  phone_hash CHAR(64) NOT NULL,
  password_hash VARCHAR(255) NULL,
  role ENUM('admin', 'helper', 'customer') NOT NULL DEFAULT 'customer',
  line_user_id VARCHAR(128) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY ux_users_phone_hash (phone_hash),
  UNIQUE KEY ux_users_email (email),
  KEY ix_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE groups (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  deadline DATETIME(6) NOT NULL,
  publish_date DATETIME(6) NULL,
  status ENUM('draft', 'scheduled', 'active', 'closed') NOT NULL DEFAULT 'draft',
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY ix_groups_status_deadline (status, deadline),
  KEY ix_groups_created_by (created_by),
  CONSTRAINT fk_groups_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE form_fields (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id BIGINT UNSIGNED NOT NULL,
  type ENUM('text', 'textarea', 'radio', 'checkbox', 'select', 'number', 'date', 'radio_grid', 'checkbox_grid') NOT NULL,
  label VARCHAR(255) NOT NULL,
  required BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL,
  rows_json JSON NULL,
  columns_json JSON NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY ix_form_fields_group_sort (group_id, sort_order),
  CONSTRAINT fk_form_fields_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE field_options (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  field_id BIGINT UNSIGNED NOT NULL,
  value VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL,
  PRIMARY KEY (id),
  KEY ix_field_options_field_sort (field_id, sort_order),
  CONSTRAINT fk_field_options_field FOREIGN KEY (field_id) REFERENCES form_fields(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id BIGINT UNSIGNED NULL,
  brand VARCHAR(120) NULL,
  name VARCHAR(200) NOT NULL,
  spec VARCHAR(200) NULL,
  image_url VARCHAR(500) NULL,
  cost_krw INT NULL,
  price_twd INT NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  limit_qty INT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY ix_products_group (group_id),
  KEY ix_products_name (name),
  CONSTRAINT fk_products_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  total_amount INT NULL,
  status ENUM('ordered', 'arrived', 'completed') NOT NULL DEFAULT 'ordered',
  order_date DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY ix_orders_group (group_id),
  KEY ix_orders_user (user_id),
  KEY ix_orders_status (status),
  CONSTRAINT fk_orders_group FOREIGN KEY (group_id) REFERENCES groups(id),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NULL,
  product_name VARCHAR(200) NOT NULL,
  quantity INT NOT NULL,
  unit_price INT NOT NULL DEFAULT 0,
  amount INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY ix_order_items_order (order_id),
  KEY ix_order_items_product (product_id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_answers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  field_id BIGINT UNSIGNED NOT NULL,
  value_json JSON NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY ix_order_answers_order (order_id),
  KEY ix_order_answers_field (field_id),
  CONSTRAINT fk_order_answers_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_answers_field FOREIGN KEY (field_id) REFERENCES form_fields(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  amount INT NOT NULL,
  payment_method ENUM('bank_transfer', 'cash', 'line_pay') NULL,
  payment_date DATETIME(6) NULL,
  status ENUM('paid', 'unpaid') NOT NULL DEFAULT 'unpaid',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY ix_payments_order (order_id),
  KEY ix_payments_user_status (user_id, status),
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
