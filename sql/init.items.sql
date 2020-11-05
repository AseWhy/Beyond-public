SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET FOREIGN_KEY_CHECKS = 0;
SET sql_notes = 0;

START TRANSACTION;

SET time_zone = "+00:00";

CREATE DATABASE IF NOT EXISTS `beyond_items` 
    DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;
    
USE `beyond_items`;

CREATE TABLE IF NOT EXISTS `items` (
  `named_id` char(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `display` char(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `description` char(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `type` int(64) NOT NULL DEFAULT '0',
  `data` json DEFAULT NULL COMMENT 'Обычные данные предмета',
  PRIMARY KEY (`named_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

CREATE TABLE IF NOT EXISTS `types` (
  `id` int(64) NOT NULL AUTO_INCREMENT,
  `display` char(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `description` char(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `fields` json DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

COMMIT;

SET sql_notes = 1;
SET FOREIGN_KEY_CHECKS = 1;