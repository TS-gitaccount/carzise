DROP DATABASE IF EXISTS carzise;
CREATE DATABASE carzise;
use carzise;

-- Admin Table
CREATE TABLE admin (
    admin_username VARCHAR(20) PRIMARY KEY,
    admin_password VARCHAR(255) NOT NULL
);
describe admin;
select * from admin;

-- Customers Table
CREATE TABLE customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    customer_name VARCHAR(20) NOT NULL,
    customer_email VARCHAR(50) NOT NULL UNIQUE,
    customer_ph_no VARCHAR(15) NOT NULL UNIQUE,
    customer_photo MEDIUMBLOB,
    customer_password VARCHAR(255) NOT NULL,
    customer_balance_amt DECIMAL(10, 2) DEFAULT 0
);
CREATE INDEX idx_customer_email ON customers(customer_email);
CREATE INDEX idx_customer_ph_no ON customers(customer_ph_no);
describe customers;
select * from customers;



-- Customers Addresses Table
CREATE TABLE customer_addresses (
    address_id INT AUTO_INCREMENT PRIMARY KEY,
    address_type ENUM('Home', 'Work', 'Other'),  -- Categorizing addresses
    customer_id INT,
    street VARCHAR(100),
    city VARCHAR(50),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE
);
describe customer_addresses;

-- Customers feedbacks Table
CREATE TABLE feedbacks (
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT, 
    rating INT NOT NULL,
    feedback_text TEXT NOT NULL,
    feedback_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE
);
describe feedbacks;
select * from feedbacks;

INSERT INTO admin (admin_username, admin_password) VALUES 
('admin1', '$2a$10$nw35QHHaWQXowfPROS70A.mjbeYj8kPhpE5mBowZmJRHOg/G6/x8a'), -- Admin@123
('admin2', '$2a$10$rth0XhJlmKXXd.HuU948cuIrTGa1XRyVsp9HNEeq7rE7l8XnXPhea'); -- SecurePass
select * from admin;


-- this is carzise home page send your feedback
CREATE TABLE `feedbacks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `subject` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
select * from feedbacks;
