SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET FOREIGN_KEY_CHECKS = 0;
SET sql_notes = 0;

START TRANSACTION;
SET time_zone = "+00:00";

CREATE DATABASE IF NOT EXISTS `beyond_map` 
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;

USE `beyond_map`;

DROP TABLE IF EXISTS `countries`;
CREATE TABLE IF NOT EXISTS `countries` (
  `id` int(64) NOT NULL AUTO_INCREMENT,
  `name` char(128) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `description` char(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

DROP TABLE IF EXISTS `districts`;
CREATE TABLE IF NOT EXISTS `districts` (
  `id` int(64) NOT NULL,
  `name` char(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_520_ci,
  `includes` json DEFAULT NULL,
  `condition_data` char(255) COLLATE utf8mb4_unicode_520_ci DEFAULT 'true',
  `editor_data` json DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

DROP TABLE IF EXISTS `provinces`;
CREATE TABLE IF NOT EXISTS `provinces` (
  `id` int(64) NOT NULL,
  `biome` tinyint(4) NOT NULL,
  `neighbors` char(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `population` bigint(255) NOT NULL,
  `speed_mult` double NOT NULL DEFAULT '1',
  `sity` json DEFAULT NULL,
  `type` char(255) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `gfx` mediumblob,
  `geometry` json DEFAULT NULL,
  `borders` json DEFAULT NULL,
  `distance` double NOT NULL,
  `owner` bigint(255) NOT NULL COMMENT 'Регион владеющий данной провицией',
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

DROP TABLE IF EXISTS `regions`;
CREATE TABLE IF NOT EXISTS `regions` (
  `id` bigint(255) NOT NULL,
  `country` char(128) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `name` char(128) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `color` char(7) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `spawn` json NOT NULL,
  `description` text COLLATE utf8mb4_unicode_520_ci,
  `gfx` mediumblob,
  `owner` bigint(255) NOT NULL COMMENT 'Мир владеющий данным регионом'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

DROP TABLE IF EXISTS `worlds`;
CREATE TABLE IF NOT EXISTS `worlds` (
  `id` bigint(255) NOT NULL,
  `width` int(64) NOT NULL,
  `height` int(64) NOT NULL,
  `gfx` mediumblob
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
COMMIT;

SET sql_notes = 1;
SET FOREIGN_KEY_CHECKS = 1;