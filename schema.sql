CREATE DATABASE IF NOT EXISTS khojdb;
USE khojdb;

DROP TABLE IF EXISTS matched_items;
DROP TABLE IF EXISTS found_items;
DROP TABLE IF EXISTS lost_items;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lost_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  item_name VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255) NOT NULL,
  date_lost DATE NOT NULL,
  image_url VARCHAR(255),
  status ENUM('Pending', 'Found', 'Claimed') DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE found_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  item_name VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255) NOT NULL,
  date_found DATE NOT NULL,
  image_url VARCHAR(255),
  status ENUM('Available', 'Matched', 'Returned') DEFAULT 'Available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE matched_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lost_item_id INT NOT NULL,
  found_item_id INT NOT NULL,
  matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (lost_item_id, found_item_id),
  FOREIGN KEY (lost_item_id) REFERENCES lost_items(id) ON DELETE CASCADE,
  FOREIGN KEY (found_item_id) REFERENCES found_items(id) ON DELETE CASCADE
);
