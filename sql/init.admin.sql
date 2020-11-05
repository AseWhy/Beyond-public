SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET FOREIGN_KEY_CHECKS = 1;
SET sql_notes = 0;

START TRANSACTION;
SET time_zone = "+00:00";

CREATE DATABASE IF NOT EXISTS `beyond_admin` 
    DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_520_ci;

USE `beyond_admin`;

CREATE TABLE IF NOT EXISTS `access` (
  `token` char(128) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `owner` char(128) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `valid_to` bigint(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

CREATE TABLE IF NOT EXISTS `actions` (
  `id` int(64) NOT NULL AUTO_INCREMENT,
  `owner` int(64) NOT NULL,
  `description` text COLLATE utf8mb4_unicode_520_ci,
  `data` json DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

CREATE TABLE IF NOT EXISTS `roles` (
  `ident` int(64) NOT NULL AUTO_INCREMENT COMMENT 'Идентификатор роли',
  `rolename` char(128) NOT NULL COMMENT 'Отображаемое имя роли',
  `permissions` int(64) DEFAULT '0' COMMENT 'Разрешения роли. -1 - все разрешения',
  PRIMARY KEY (`ident`),
  UNIQUE KEY `rolename` (`rolename`)
) ;

CREATE TABLE IF NOT EXISTS `users` (
  `id` int(64) NOT NULL AUTO_INCREMENT,
  `login` char(128) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `display_name` char(255) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `role` char(128) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `password` char(128) COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `avatar` mediumblob,
  PRIMARY KEY (`id`),
  KEY `role` (`role`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role`) REFERENCES `roles` (`rolename`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

INSERT INTO `roles` (`ident`, `rolename`, `permissions`) VALUES
(1, 'developer', -1),
(2, 'project manager', 0),
(3, 'administrator', 0);
SET FOREIGN_KEY_CHECKS=1;

COMMIT;

SET sql_notes = 1;
SET FOREIGN_KEY_CHECKS = 1;