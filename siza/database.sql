

CREATE DATABASE IF NOT EXISTS siza_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE siza_db;


CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    profile_pic VARCHAR(255) DEFAULT 'default.png',
    role ENUM('buyer','seller','admin') DEFAULT 'buyer',
    is_verified TINYINT(1) DEFAULT 0,
    id_number VARCHAR(20),         
    location VARCHAR(100),
    bio TEXT,
    rating_avg DECIMAL(3,2) DEFAULT 0.00,
    rating_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type ENUM('goods','service') NOT NULL,
    description TEXT
);

INSERT INTO categories (name, type, description) VALUES
('Electronics', 'goods', 'Phones, gadgets and accessories'),
('Clothing & Fashion', 'goods', 'New and second-hand clothing'),
('Food & Beverages', 'goods', 'Homemade food and shisanyama'),
('Furniture','goods', 'Home and office furniture'),
('Tutoring', 'service', 'Academic and skills tutoring'),
('Cleaning', 'service', 'Domestic and commercial cleaning'),
('Repairs', 'service', 'Phone, appliance and home repairs'),
('Transport', 'service', 'Delivery and transport services'),
('Hair & Beauty', 'service', 'Haircuts, braiding and beauty'),
('Digital Services', 'service', 'Web, design and digital work');

CREATE TABLE listings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seller_id INT NOT NULL,
    category_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    type ENUM('goods','service') NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    price_unit  ENUM('fixed','per_hour','per_day','negotiable') DEFAULT 'fixed',
    location VARCHAR(100),
    images TEXT,                 
    status ENUM('active','inactive','sold','flagged') DEFAULT 'active',
    views INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    listing_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    seller_id INT NOT NULL,
    rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    listing_id INT,
    message TEXT NOT NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE SET NULL
);

CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    listing_id INT NOT NULL,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    notes TEXT,
    status ENUM('pending','confirmed','completed','cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_id)   REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id)  REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    listing_id INT NOT NULL,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('card','eft','cash_on_delivery','wallet') DEFAULT 'card',
    status ENUM('pending','completed','refunded','disputed') DEFAULT 'pending',
    reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id),
    FOREIGN KEY (buyer_id) REFERENCES users(id),
    FOREIGN KEY (seller_id) REFERENCES users(id)
);

CREATE TABLE reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reporter_id INT NOT NULL,
    listing_id INT,
    user_id INT,
    reason VARCHAR(255) NOT NULL,
    details TEXT,
    status ENUM('open','reviewed','resolved') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users(id),
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE admin_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    action VARCHAR(255) NOT NULL,
    target VARCHAR(100),
    target_id  INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id)
);

-- Seed users  (all passwords are: password)
-- To log in use: admin@siza.co.za / password   or   thabo@example.com / password
INSERT INTO users (full_name, email, phone, password_hash, role, is_verified, location) VALUES
('Siza Admin', 'admin@siza.co.za', '0110000000',
 '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 1, 'Johannesburg'),
('Thabo Nkosi', 'thabo@example.com', '0821234567',
 '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'seller', 1, 'Soweto'),
('Nomsa Dlamini', 'nomsa@example.com', '0839876543',
 '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'buyer', 1, 'Alexandra');

INSERT INTO listings (seller_id, category_id, title, description, type, price, price_unit, location, status) VALUES
(2, 5, 'Maths & Science Tutoring', 'Grade 10-12 Maths and Physical Science tutoring by a top student. Flexible hours.', 'service', 150.00, 'per_hour', 'Soweto', 'active'),
(2, 9, 'Professional Hair Braiding', 'Box braids, knotless braids, and cornrows. Home visits available.', 'service', 350.00, 'fixed', 'Soweto', 'active'),
(2, 2, 'Jordan Sneakers Size 10', 'Authentic Jordan 1 Retro High, barely worn. Original box included.', 'goods', 1800.00, 'fixed', 'Soweto', 'active');
