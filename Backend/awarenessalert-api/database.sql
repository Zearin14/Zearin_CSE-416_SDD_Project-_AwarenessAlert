-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 19, 2026 at 10:06 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `awarenessalert_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `login_history`
--

CREATE TABLE `login_history` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `login_attempted` varchar(150) NOT NULL DEFAULT '',
  `name` varchar(100) DEFAULT NULL,
  `role` varchar(20) DEFAULT NULL,
  `event` enum('login','failed','logout') NOT NULL,
  `reason` varchar(100) NOT NULL DEFAULT '',
  `ip_address` varchar(45) NOT NULL DEFAULT '',
  `user_agent` varchar(255) NOT NULL DEFAULT '',
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `login_history`
--

INSERT INTO `login_history` (`id`, `user_id`, `login_attempted`, `name`, `role`, `event`, `reason`, `ip_address`, `user_agent`, `created_at`) VALUES
(1, 12, 'rez@gmail.com', 'rez', 'public', 'login', 'New account created', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36', '2026-10-19 23:33:22'),
(2, 1, 'admin@awarenessalert.test', 'Amina Rahman', 'admin', 'login', 'Logged in', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36', '2026-10-19 23:36:29'),
(3, 1, '', 'Amina Rahman', 'admin', 'logout', 'Logged out', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36', '2026-10-19 23:48:10'),
(4, 9, 'moderator@awarenessalert.test', 'Tanvir Ahmed', 'moderator', 'login', 'Logged in', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36', '2026-10-19 23:48:23');

-- --------------------------------------------------------

--
-- Table structure for table `reports`
--

CREATE TABLE `reports` (
  `id` int(11) NOT NULL,
  `report_code` varchar(30) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `vendor_id` int(11) DEFAULT NULL,
  `category` enum('Food','Fuel','Other') NOT NULL DEFAULT 'Other',
  `description` text NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `has_evidence` tinyint(1) NOT NULL DEFAULT 0,
  `evidence_image_path` varchar(255) DEFAULT NULL,
  `reporter_tier` enum('Guest','Anonymous','Identified') NOT NULL DEFAULT 'Guest',
  `anonymous` tinyint(1) NOT NULL DEFAULT 1,
  `ip_address` varchar(45) DEFAULT NULL,
  `device_id` varchar(64) DEFAULT NULL,
  `moderation_status` enum('Pending','Verified','Escalated','Disputed','Removed') NOT NULL DEFAULT 'Pending',
  `authority_outcome` enum('Awaiting','Confirmed','Cleared') DEFAULT NULL,
  `routed_to` enum('BSTI','DNCRP','Accredited Laboratory') DEFAULT NULL,
  `outcome_public_comment` text DEFAULT NULL,
  `outcome_internal_note` text DEFAULT NULL,
  `outcome_set_by` varchar(100) NOT NULL DEFAULT '',
  `outcome_set_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reports`
--

INSERT INTO `reports` (`id`, `report_code`, `user_id`, `vendor_id`, `category`, `description`, `location`, `has_evidence`, `evidence_image_path`, `reporter_tier`, `anonymous`, `ip_address`, `device_id`, `moderation_status`, `authority_outcome`, `routed_to`, `outcome_public_comment`, `outcome_internal_note`, `outcome_set_by`, `outcome_set_at`, `created_at`, `updated_at`) VALUES
(1, 'AA-01001', NULL, 6, 'Other', 'Product packaging appeared damaged and the expiry label was difficult to read.', 'Gulshan-1', 1, NULL, 'Guest', 1, '103.84.12.20', 'dev-1000', 'Pending', NULL, NULL, '', '', '', NULL, '2026-10-19 21:54:31', '2026-10-19 21:54:31'),
(2, 'AA-01002', 6, 6, 'Food', 'Fuel quantity appeared lower than the amount shown on the meter.', 'Gulshan-1', 0, NULL, 'Anonymous', 1, '103.84.12.21', 'dev-12c9', 'Pending', NULL, NULL, '', '', '', NULL, '2026-10-19 16:54:31', '2026-10-19 16:54:31'),
(3, 'AA-01003', 5, 6, 'Food', 'Food was stored without visible temperature control near the service counter.', 'Gulshan-1', 1, NULL, 'Identified', 0, '103.84.12.22', 'dev-1592', 'Pending', NULL, NULL, '', '', '', NULL, '2026-10-19 11:54:31', '2026-10-19 11:54:31'),
(4, 'AA-01004', NULL, 22, 'Food', 'A strong unusual odor was noticed after opening the sealed package.', 'Gulshan-2', 1, NULL, 'Guest', 1, '103.84.12.23', 'dev-185b', 'Escalated', 'Cleared', 'DNCRP', 'Sample tested; expiry dates were found to be past the permitted limit.', 'Laboratory worksheet reviewed by the assigned case officer.', 'DNCRP', '2026-10-19 22:22:07', '2026-10-15 21:54:31', '2026-10-19 22:22:07'),
(5, 'AA-01005', 5, 4, 'Food', 'The displayed price and the checkout price did not match.', 'Gulshan-2', 0, NULL, 'Anonymous', 1, '103.84.12.24', 'dev-1b24', 'Escalated', 'Cleared', 'DNCRP', 'Sample tested and no safety issue was found in the submitted batch.', 'Laboratory worksheet reviewed by the assigned case officer.', 'DNCRP', '2026-10-19 22:22:30', '2026-10-14 21:54:31', '2026-10-19 22:22:30'),
(6, 'AA-01006', 6, 11, 'Food', 'The premises appeared clean, but a batch label was missing from one item.', 'Gulshan-1', 1, NULL, 'Identified', 0, '103.84.12.25', 'dev-1ded', 'Verified', NULL, NULL, '', '', '', NULL, '2026-10-13 21:54:31', '2026-10-13 21:54:31'),
(7, 'AA-01007', NULL, 18, 'Food', 'Product packaging appeared damaged and the expiry label was difficult to read.', 'Gulshan-2', 1, NULL, 'Guest', 1, '103.84.12.26', 'dev-20b6', 'Verified', NULL, NULL, '', '', '', NULL, '2026-10-12 21:54:31', '2026-10-12 21:54:31'),
(8, 'AA-01008', 6, 25, 'Other', 'Fuel quantity appeared lower than the amount shown on the meter.', 'Banani', 0, NULL, 'Anonymous', 1, '103.84.12.27', 'dev-237f', 'Verified', NULL, NULL, '', '', '', NULL, '2026-10-11 21:54:31', '2026-10-11 21:54:31'),
(9, 'AA-01009', 5, 7, 'Food', 'Food was stored without visible temperature control near the service counter.', 'Banani', 1, NULL, 'Identified', 0, '103.84.12.28', 'dev-2648', 'Removed', NULL, NULL, '', '', '', NULL, '2026-10-10 21:54:31', '2026-10-10 21:54:31'),
(10, 'AA-01010', NULL, 14, 'Food', 'A strong unusual odor was noticed after opening the sealed package.', 'Banani', 1, NULL, 'Guest', 1, '103.84.12.29', 'dev-2911', 'Disputed', NULL, NULL, '', '', '', NULL, '2026-10-09 21:54:31', '2026-10-09 21:54:31'),
(11, 'AA-01011', 5, 21, 'Fuel', 'The displayed price and the checkout price did not match.', 'Gulshan-1', 0, NULL, 'Anonymous', 1, '103.84.12.30', 'dev-2bda', 'Escalated', 'Awaiting', 'BSTI', '', '', '', NULL, '2026-10-08 21:54:31', '2026-10-08 21:54:31'),
(12, 'AA-01012', 6, 3, 'Food', 'The premises appeared clean, but a batch label was missing from one item.', 'Gulshan-1', 1, NULL, 'Identified', 0, '103.84.12.31', 'dev-2ea3', 'Verified', NULL, NULL, '', '', '', NULL, '2026-10-07 21:54:31', '2026-10-07 21:54:31'),
(13, 'AA-01013', NULL, 10, 'Food', 'Product packaging appeared damaged and the expiry label was difficult to read.', 'Banani', 1, NULL, 'Guest', 1, '103.84.12.32', 'dev-316c', 'Verified', NULL, NULL, '', '', '', NULL, '2026-10-06 21:54:31', '2026-10-06 21:54:31'),
(14, 'AA-01014', 6, 17, 'Food', 'Fuel quantity appeared lower than the amount shown on the meter.', 'Gulshan-2', 0, NULL, 'Anonymous', 1, '103.84.12.33', 'dev-3435', 'Verified', NULL, NULL, '', '', '', NULL, '2026-10-05 21:54:31', '2026-10-05 21:54:31'),
(15, 'AA-01015', 5, 24, 'Other', 'Food was stored without visible temperature control near the service counter.', 'Gulshan-1', 1, NULL, 'Identified', 0, '103.84.12.34', 'dev-36fe', 'Verified', NULL, NULL, '', '', '', NULL, '2026-10-04 21:54:31', '2026-10-04 21:54:31'),
(16, 'AA-01016', NULL, 6, 'Food', 'A strong unusual odor was noticed after opening the sealed package.', 'Gulshan-1', 1, NULL, 'Guest', 1, '103.84.12.35', 'dev-39c7', 'Verified', NULL, NULL, '', '', '', NULL, '2026-10-03 21:54:31', '2026-10-03 21:54:31'),
(17, 'AA-01017', 5, 13, 'Food', 'The displayed price and the checkout price did not match.', 'Gulshan-2', 0, NULL, 'Anonymous', 1, '103.84.12.36', 'dev-3c90', 'Removed', NULL, NULL, '', '', '', NULL, '2026-10-02 21:54:31', '2026-10-02 21:54:31'),
(18, 'AA-01018', 6, 20, 'Food', 'The premises appeared clean, but a batch label was missing from one item.', 'Gulshan-2', 1, NULL, 'Identified', 0, '103.84.12.37', 'dev-3f59', 'Verified', NULL, NULL, '', '', '', NULL, '2026-10-01 21:54:31', '2026-10-01 21:54:31'),
(19, 'AA-01019', NULL, 2, 'Food', 'Product packaging appeared damaged and the expiry label was difficult to read.', 'Gulshan-2', 1, NULL, 'Guest', 1, '103.84.12.38', 'dev-4222', 'Disputed', NULL, NULL, '', '', '', NULL, '2026-09-30 21:54:31', '2026-09-30 21:54:31'),
(20, 'AA-01020', 6, 9, 'Food', 'Fuel quantity appeared lower than the amount shown on the meter.', 'Banani', 0, NULL, 'Anonymous', 1, '103.84.12.39', 'dev-44eb', 'Verified', NULL, NULL, '', '', '', NULL, '2026-09-29 21:54:31', '2026-09-29 21:54:31'),
(21, 'AA-01021', 5, 16, 'Food', 'Food was stored without visible temperature control near the service counter.', 'Banani', 1, NULL, 'Identified', 0, '103.84.12.40', 'dev-47b4', 'Verified', NULL, NULL, '', '', '', NULL, '2026-09-28 21:54:31', '2026-09-28 21:54:31'),
(22, 'AA-01022', NULL, 23, 'Other', 'A strong unusual odor was noticed after opening the sealed package.', 'Gulshan-2', 1, NULL, 'Guest', 1, '103.84.12.41', 'dev-4a7d', 'Verified', NULL, NULL, '', '', '', NULL, '2026-09-27 21:54:31', '2026-09-27 21:54:31'),
(23, 'AA-01023', 5, 5, 'Food', 'The displayed price and the checkout price did not match.', 'Gulshan-2', 0, NULL, 'Anonymous', 1, '103.84.12.42', 'dev-4d46', 'Verified', NULL, NULL, '', '', '', NULL, '2026-09-26 21:54:31', '2026-09-26 21:54:31'),
(24, 'AA-01024', 6, 12, 'Food', 'The premises appeared clean, but a batch label was missing from one item.', 'Gulshan-2', 1, NULL, 'Identified', 0, '103.84.12.43', 'dev-500f', 'Verified', NULL, NULL, '', '', '', NULL, '2026-09-25 21:54:31', '2026-09-25 21:54:31'),
(25, 'AA-01025', NULL, 16, 'Food', 'burger bun wasn\'t fresh', 'Banani', 1, 'uploads/report-20261019-215924-2c3711d0.png', 'Guest', 0, '::1', 'dev-c6ab7122', 'Pending', NULL, NULL, NULL, NULL, '', NULL, '2026-10-19 21:59:24', '2026-10-19 21:59:24'),
(26, 'AA-01026', NULL, 18, 'Food', 'coffee was insane', 'Gulshan-2', 0, NULL, 'Guest', 0, '::1', 'dev-c6ab7122', 'Pending', NULL, NULL, NULL, NULL, '', NULL, '2026-10-19 22:07:49', '2026-10-19 22:07:49'),
(27, 'AA-01027', 12, 2, 'Other', 'the soap was fake', 'Gulshan-2', 1, 'uploads/report-20261019-233430-a1146ac6.png', 'Identified', 0, '::1', 'dev-c6ab7122', 'Pending', NULL, NULL, NULL, NULL, '', NULL, '2026-10-19 23:34:30', '2026-10-19 23:34:30'),
(28, 'AA-01028', 12, 11, 'Food', 'there food was average', 'Gulshan-1', 0, NULL, 'Anonymous', 1, '::1', 'dev-c6ab7122', 'Escalated', 'Awaiting', 'DNCRP', NULL, NULL, '', NULL, '2026-10-19 23:35:35', '2026-10-19 23:48:56');

-- --------------------------------------------------------

--
-- Table structure for table `report_actions`
--

CREATE TABLE `report_actions` (
  `id` int(11) NOT NULL,
  `report_id` int(11) NOT NULL,
  `action` varchar(150) NOT NULL,
  `actor` varchar(100) NOT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `report_actions`
--

INSERT INTO `report_actions` (`id`, `report_id`, `action`, `actor`, `created_at`) VALUES
(1, 1, 'Report submitted', 'Community reporter', '2026-10-19 21:54:31'),
(2, 2, 'Report submitted', 'Community reporter', '2026-10-19 16:54:31'),
(3, 3, 'Report submitted', 'Community reporter', '2026-10-19 11:54:31'),
(4, 4, 'Report submitted', 'Community reporter', '2026-10-15 21:54:31'),
(5, 4, 'Report escalated', 'Amina Rahman', '2026-10-15 22:54:31'),
(6, 4, 'Authority outcome set to Confirmed', 'DNCRP', '2026-10-16 09:54:31'),
(7, 5, 'Report submitted', 'Community reporter', '2026-10-14 21:54:31'),
(8, 5, 'Report escalated', 'Amina Rahman', '2026-10-14 22:54:31'),
(9, 5, 'Authority outcome set to Cleared', 'DNCRP', '2026-10-15 09:54:31'),
(10, 6, 'Report submitted', 'Community reporter', '2026-10-13 21:54:31'),
(11, 6, 'Report verified', 'Amina Rahman', '2026-10-13 22:54:31'),
(12, 7, 'Report submitted', 'Community reporter', '2026-10-12 21:54:31'),
(13, 7, 'Report verified', 'Amina Rahman', '2026-10-12 22:54:31'),
(14, 8, 'Report submitted', 'Community reporter', '2026-10-11 21:54:31'),
(15, 8, 'Report verified', 'Amina Rahman', '2026-10-11 22:54:31'),
(16, 9, 'Report submitted', 'Community reporter', '2026-10-10 21:54:31'),
(17, 9, 'Report removed', 'Amina Rahman', '2026-10-10 22:54:31'),
(18, 10, 'Report submitted', 'Community reporter', '2026-10-09 21:54:31'),
(19, 10, 'Report disputed', 'Amina Rahman', '2026-10-09 22:54:31'),
(20, 11, 'Report submitted', 'Community reporter', '2026-10-08 21:54:31'),
(21, 11, 'Report escalated', 'Amina Rahman', '2026-10-08 22:54:31'),
(22, 12, 'Report submitted', 'Community reporter', '2026-10-07 21:54:31'),
(23, 12, 'Report verified', 'Amina Rahman', '2026-10-07 22:54:31'),
(24, 13, 'Report submitted', 'Community reporter', '2026-10-06 21:54:31'),
(25, 13, 'Report verified', 'Amina Rahman', '2026-10-06 22:54:31'),
(26, 14, 'Report submitted', 'Community reporter', '2026-10-05 21:54:31'),
(27, 14, 'Report verified', 'Amina Rahman', '2026-10-05 22:54:31'),
(28, 15, 'Report submitted', 'Community reporter', '2026-10-04 21:54:31'),
(29, 15, 'Report verified', 'Amina Rahman', '2026-10-04 22:54:31'),
(30, 16, 'Report submitted', 'Community reporter', '2026-10-03 21:54:31'),
(31, 16, 'Report verified', 'Amina Rahman', '2026-10-03 22:54:31'),
(32, 17, 'Report submitted', 'Community reporter', '2026-10-02 21:54:31'),
(33, 17, 'Report removed', 'Amina Rahman', '2026-10-02 22:54:31'),
(34, 18, 'Report submitted', 'Community reporter', '2026-10-01 21:54:31'),
(35, 18, 'Report verified', 'Amina Rahman', '2026-10-01 22:54:31'),
(36, 19, 'Report submitted', 'Community reporter', '2026-09-30 21:54:31'),
(37, 19, 'Report disputed', 'Amina Rahman', '2026-09-30 22:54:31'),
(38, 20, 'Report submitted', 'Community reporter', '2026-09-29 21:54:31'),
(39, 20, 'Report verified', 'Amina Rahman', '2026-09-29 22:54:31'),
(40, 21, 'Report submitted', 'Community reporter', '2026-09-28 21:54:31'),
(41, 21, 'Report verified', 'Amina Rahman', '2026-09-28 22:54:31'),
(42, 22, 'Report submitted', 'Community reporter', '2026-09-27 21:54:31'),
(43, 22, 'Report verified', 'Amina Rahman', '2026-09-27 22:54:31'),
(44, 23, 'Report submitted', 'Community reporter', '2026-09-26 21:54:31'),
(45, 23, 'Report verified', 'Amina Rahman', '2026-09-26 22:54:31'),
(46, 24, 'Report submitted', 'Community reporter', '2026-09-25 21:54:31'),
(47, 24, 'Report verified', 'Amina Rahman', '2026-09-25 22:54:31'),
(48, 25, 'Report submitted', 'Community reporter', '2026-10-19 21:59:24'),
(49, 26, 'Report submitted', 'Community reporter', '2026-10-19 22:07:49'),
(50, 4, 'Authority outcome set to Cleared', 'DNCRP', '2026-10-19 22:21:56'),
(51, 4, 'Authority outcome set to Cleared', 'DNCRP', '2026-10-19 22:22:00'),
(52, 4, 'Authority outcome set to Cleared', 'DNCRP', '2026-10-19 22:22:07'),
(53, 5, 'Authority outcome set to Cleared', 'DNCRP', '2026-10-19 22:22:19'),
(54, 5, 'Authority outcome set to Cleared', 'DNCRP', '2026-10-19 22:22:30'),
(55, 27, 'Report submitted', 'rez', '2026-10-19 23:34:30'),
(56, 28, 'Report submitted', 'rez', '2026-10-19 23:35:35'),
(57, 28, 'Marked Disputed', 'Tanvir Ahmed', '2026-10-19 23:48:48'),
(58, 28, 'Marked Verified', 'Tanvir Ahmed', '2026-10-19 23:48:52'),
(59, 28, 'Assigned to DNCRP', 'Tanvir Ahmed', '2026-10-19 23:48:56');

-- --------------------------------------------------------

--
-- Table structure for table `reviews`
--

CREATE TABLE `reviews` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `vendor_id` int(11) NOT NULL,
  `rating` tinyint(4) NOT NULL,
  `comment` text DEFAULT NULL,
  `hidden` tinyint(1) NOT NULL DEFAULT 0,
  `flags` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reviews`
--

INSERT INTO `reviews` (`id`, `user_id`, `vendor_id`, `rating`, `comment`, `hidden`, `flags`, `created_at`) VALUES
(1, 5, 1, 5, 'Staff were helpful and the products were well organized.', 0, 2, '2026-10-19 20:54:31'),
(2, 6, 2, 4, 'The experience was fine overall, though service was a little slow.', 0, 0, '2026-10-17 20:54:31'),
(3, 5, 3, 4, 'Clean shop with clear prices and helpful product information.', 0, 0, '2026-10-15 20:54:31'),
(4, 6, 4, 3, 'My recent visit was mixed; I would like clearer labeling.', 0, 0, '2026-10-13 20:54:31'),
(5, 5, 5, 5, 'Staff were helpful and the products were well organized.', 0, 0, '2026-10-11 20:54:31'),
(6, 6, 6, 2, 'The experience was fine overall, though service was a little slow.', 0, 0, '2026-10-09 20:54:31'),
(7, 5, 7, 5, 'Clean shop with clear prices and helpful product information.', 0, 0, '2026-10-07 20:54:31'),
(8, 6, 8, 4, 'My recent visit was mixed; I would like clearer labeling.', 0, 0, '2026-10-05 20:54:31'),
(9, 5, 9, 4, 'Staff were helpful and the products were well organized.', 0, 2, '2026-10-03 20:54:31'),
(10, 6, 10, 3, 'The experience was fine overall, though service was a little slow.', 0, 0, '2026-10-01 20:54:31'),
(11, 5, 11, 5, 'Clean shop with clear prices and helpful product information.', 0, 0, '2026-09-29 20:54:31'),
(12, 6, 12, 2, 'My recent visit was mixed; I would like clearer labeling.', 0, 0, '2026-09-27 20:54:31'),
(13, 5, 13, 5, 'Staff were helpful and the products were well organized.', 0, 0, '2026-09-25 20:54:31'),
(14, 6, 14, 4, 'The experience was fine overall, though service was a little slow.', 0, 0, '2026-09-23 20:54:31'),
(15, 5, 15, 4, 'Clean shop with clear prices and helpful product information.', 0, 0, '2026-09-21 20:54:31'),
(16, 6, 16, 3, 'My recent visit was mixed; I would like clearer labeling.', 0, 0, '2026-09-19 20:54:31'),
(17, 5, 17, 5, 'Staff were helpful and the products were well organized.', 0, 2, '2026-09-17 20:54:31'),
(18, 6, 18, 2, 'The experience was fine overall, though service was a little slow.', 0, 0, '2026-09-15 20:54:31'),
(19, 5, 19, 5, 'Clean shop with clear prices and helpful product information.', 0, 0, '2026-09-13 20:54:31'),
(20, 6, 20, 4, 'My recent visit was mixed; I would like clearer labeling.', 0, 0, '2026-09-11 20:54:31'),
(21, 5, 21, 4, 'Staff were helpful and the products were well organized.', 0, 0, '2026-09-09 20:54:31'),
(22, 6, 22, 3, 'The experience was fine overall, though service was a little slow.', 0, 0, '2026-09-07 20:54:31'),
(23, 5, 23, 5, 'Clean shop with clear prices and helpful product information.', 0, 0, '2026-09-05 20:54:31'),
(24, 6, 24, 2, 'My recent visit was mixed; I would like clearer labeling.', 0, 0, '2026-09-03 20:54:31'),
(25, 5, 25, 5, 'Staff were helpful and the products were well organized.', 0, 2, '2026-09-01 20:54:31'),
(26, 6, 1, 4, 'The experience was fine overall, though service was a little slow.', 0, 0, '2026-08-30 20:54:31'),
(27, 5, 2, 4, 'Clean shop with clear prices and helpful product information.', 0, 0, '2026-08-28 20:54:31'),
(28, 6, 3, 3, 'My recent visit was mixed; I would like clearer labeling.', 0, 0, '2026-08-26 20:54:31'),
(29, 5, 4, 5, 'Staff were helpful and the products were well organized.', 0, 0, '2026-08-24 20:54:31'),
(30, 6, 5, 2, 'The experience was fine overall, though service was a little slow.', 0, 0, '2026-08-22 20:54:31'),
(31, 5, 6, 5, 'Clean shop with clear prices and helpful product information.', 0, 0, '2026-08-20 20:54:31'),
(32, 6, 7, 4, 'My recent visit was mixed; I would like clearer labeling.', 0, 0, '2026-08-18 20:54:31'),
(33, 5, 8, 4, 'Staff were helpful and the products were well organized.', 0, 2, '2026-08-16 20:54:31'),
(34, 6, 9, 3, 'The experience was fine overall, though service was a little slow.', 0, 0, '2026-08-14 20:54:31'),
(35, 5, 10, 5, 'Clean shop with clear prices and helpful product information.', 0, 0, '2026-08-12 20:54:31'),
(36, 6, 11, 2, 'My recent visit was mixed; I would like clearer labeling.', 0, 0, '2026-08-10 20:54:31'),
(37, 5, 12, 5, 'Staff were helpful and the products were well organized.', 0, 0, '2026-08-08 20:54:31'),
(38, 6, 13, 4, 'The experience was fine overall, though service was a little slow.', 0, 0, '2026-08-06 20:54:31'),
(39, 5, 14, 4, 'Clean shop with clear prices and helpful product information.', 0, 0, '2026-08-04 20:54:31'),
(40, 6, 15, 3, 'My recent visit was mixed; I would like clearer labeling.', 0, 0, '2026-08-02 20:54:31');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `login` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('public','admin','moderator','org') NOT NULL DEFAULT 'public',
  `organization` enum('BSTI','DNCRP','Accredited Laboratory') DEFAULT NULL,
  `title` varchar(100) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `login`, `password_hash`, `role`, `organization`, `title`, `active`, `created_at`) VALUES
(1, 'Amina Rahman', 'admin@awarenessalert.test', '$2y$10$K8tQfPzlb02I6kbsXPKiLufWmlAbe1EFpCdQPe1EGZ/Tf5iWwPTCO', 'admin', NULL, 'Lead moderator', 1, '2026-09-19 21:54:31'),
(2, 'BSTI Desk', 'bsti@awarenessalert.test', '$2y$10$bd.touHMxMQi1wamq9AfEeC3BnLsXIcJoi3m78HAGlPMAWOKAXv62', 'org', 'BSTI', NULL, 1, '2026-09-19 21:54:31'),
(3, 'DNCRP Desk', 'dncrp@awarenessalert.test', '$2y$10$dXco5vjVmTc07tBM5x.HsO8TfuIe4h13kkKO16PGXBMfe3EDFGaT.', 'org', 'DNCRP', NULL, 1, '2026-09-19 21:54:31'),
(4, 'Laboratory Desk', 'lab@awarenessalert.test', '$2y$10$FFtu5iPC1VojaZV53wx5bO8swt6SkKSjTY8EyvvPwdpcmFgYht9pm', 'org', 'Accredited Laboratory', NULL, 1, '2026-09-19 21:54:31'),
(5, 'Rafi Hasan', 'rafi@example.test', '$2y$10$YcGssgwYRbodJmbikQw/eOY37.ZQp0KgAMwCxUtDQsbe1eqLWJNli', 'public', NULL, NULL, 1, '2026-09-19 21:54:31'),
(6, 'Nusrat Jahan', '01700000000', '$2y$10$/dtlU5hZlGznFYwWqFx2YOxhz77GoLvBNUQSZwu71y8NWae/HlyAK', 'public', NULL, NULL, 1, '2026-09-19 21:54:31'),
(7, 'zearin', 'zeri99644@gmail.com', '$2y$10$n/5IijNj.zdGCkdoToUpu.vc6omjgJBsLjUautDhL6l4tvvXPvnT2', 'public', NULL, NULL, 1, '2026-10-19 22:05:21'),
(8, 'kkkk', 'kkkkk@gmail.com', '$2y$10$GAOkk32oBzmP68djTDiykuRB4a4avftjFXP8FV51vmg9XoscU2m0S', 'public', NULL, NULL, 1, '2026-10-19 22:06:12'),
(9, 'Tanvir Ahmed', 'moderator@awarenessalert.test', '$2y$10$k8DkMJs8BreztwbOI4z9T.hrMnSJrIsYET3B2XNrNRTBhkApEL0ia', 'moderator', NULL, 'Moderator', 1, '2026-10-19 22:18:01'),
(10, 'ssss', 'ssss@gmail.com', '$2y$10$h0WbthaohMlaGHt72JMsZu3fy.wS3TKW6tCW3g8.Az3yfeGCIrZ2G', 'moderator', NULL, 'Moderator', 1, '2026-10-19 22:20:02'),
(11, 'qwe', 'qwe@gmail.com', '$2y$10$kioiJhnS3DwLb6mwVaSa1ugBbGsyp200lt.UzYMpZyfkcttm9rmYS', 'org', 'DNCRP', NULL, 1, '2026-10-19 22:21:04'),
(12, 'rez', 'rez@gmail.com', '$2y$10$LyVkX5olgdiF9OPaKBW3uOWYmkLtnv4YlL0uRsr4U9Cai/Pfoqm2y', 'public', NULL, NULL, 1, '2026-10-19 23:33:22');

-- --------------------------------------------------------

--
-- Table structure for table `vendors`
--

CREATE TABLE `vendors` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `brand` varchar(150) DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `area` varchar(100) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `trust_status` enum('green','amber','red','grey') NOT NULL DEFAULT 'grey',
  `badges` varchar(255) NOT NULL DEFAULT '',
  `approval_json` text DEFAULT NULL,
  `verified_date` varchar(30) NOT NULL DEFAULT '',
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `vendors`
--

INSERT INTO `vendors` (`id`, `name`, `brand`, `category`, `area`, `address`, `latitude`, `longitude`, `trust_status`, `badges`, `approval_json`, `verified_date`, `created_at`) VALUES
(1, 'Shwapno - Gulshan', 'Shwapno', 'Grocery', 'Gulshan-2', 'Gulshan-2, Dhaka', 23.7925000, 90.4150000, 'green', 'BSTI', '{\"Product Origin\":\"Bangladesh\",\"Manufacturer\":\"Shwapno Ltd.\",\"Factory Location\":\"Dhaka\",\"Owner\":\"Shwapno Holdings\"}', '12 Sep 2026', '2026-08-20 21:54:31'),
(2, 'Unimart Gulshan', 'Unimart', 'Grocery', 'Gulshan-2', 'Gulshan-2, Dhaka', 23.7930000, 90.4140000, 'amber', '', '{\"Product Origin\":\"Bangladesh\",\"Manufacturer\":\"Unimart Ltd.\",\"Factory Location\":\"Dhaka\",\"Owner\":\"Unimart Holdings\"}', '', '2026-08-20 21:54:31'),
(3, 'Agora Gulshan', 'Agora', 'Grocery', 'Gulshan-1', 'Gulshan Avenue, Dhaka', 23.7808000, 90.4170000, 'green', 'BSTI', '{\"Product Origin\":\"Bangladesh\",\"Manufacturer\":\"Agora Ltd.\",\"Factory Location\":\"Dhaka\",\"Owner\":\"Agora Holdings\"}', '12 Sep 2026', '2026-08-20 21:54:31'),
(4, 'Lavender Gulshan', 'Lavender', 'Grocery', 'Gulshan-2', 'Gulshan-2, Dhaka', 23.7940000, 90.4160000, 'amber', '', '{\"Product Origin\":\"Bangladesh\",\"Manufacturer\":\"Lavender Ltd.\",\"Factory Location\":\"Dhaka\",\"Owner\":\"Lavender Holdings\"}', '', '2026-08-20 21:54:31'),
(5, 'Dhali Super Shop', 'Dhali Super Shop', 'Grocery', 'Gulshan-2', 'Gulshan-2, Dhaka', 23.7910000, 90.4130000, 'green', '', '{\"Product Origin\":\"Bangladesh\",\"Manufacturer\":\"Dhali Super Shop Ltd.\",\"Factory Location\":\"Dhaka\",\"Owner\":\"Dhali Super Shop Holdings\"}', '', '2026-08-20 21:54:31'),
(6, 'Zia General Store', 'Zia General Store', 'Grocery', 'Gulshan-1', 'Gulshan-1, Dhaka', 23.7800000, 90.4140000, 'red', '', '{\"Product Origin\":\"Bangladesh\",\"Manufacturer\":\"Zia General Store Ltd.\",\"Factory Location\":\"Dhaka\",\"Owner\":\"Zia General Store Holdings\"}', '', '2026-08-20 21:54:31'),
(7, 'Penguin Super Shop', 'Penguin Super Shop', 'Grocery', 'Banani', 'Banani, Dhaka', 23.7935000, 90.4050000, 'green', '', '{\"Product Origin\":\"Bangladesh\",\"Manufacturer\":\"Penguin Super Shop Ltd.\",\"Factory Location\":\"Dhaka\",\"Owner\":\"Penguin Super Shop Holdings\"}', '', '2026-08-20 21:54:31'),
(8, 'Suskey Food', 'Suskey Food', 'Grocery', 'Banani', 'Banani, Dhaka', 23.7930000, 90.4030000, 'amber', '', '{\"Product Origin\":\"Bangladesh\",\"Manufacturer\":\"Suskey Food Ltd.\",\"Factory Location\":\"Dhaka\",\"Owner\":\"Suskey Food Holdings\"}', '', '2026-08-20 21:54:31'),
(9, 'Maa General Store', 'Maa General Store', 'Grocery', 'Banani', 'Banani, Dhaka', 23.7915000, 90.4040000, 'grey', '', '{\"Product Origin\":\"Bangladesh\",\"Manufacturer\":\"Maa General Store Ltd.\",\"Factory Location\":\"Dhaka\",\"Owner\":\"Maa General Store Holdings\"}', '', '2026-08-20 21:54:31'),
(10, 'Janani General Store', 'Janani General Store', 'Grocery', 'Banani', 'Banani Bazar, Dhaka', 23.7905000, 90.4060000, 'amber', '', '{\"Product Origin\":\"Bangladesh\",\"Manufacturer\":\"Janani General Store Ltd.\",\"Factory Location\":\"Dhaka\",\"Owner\":\"Janani General Store Holdings\"}', '', '2026-08-20 21:54:31'),
(11, 'Secret Recipe Gulshan', 'Secret Recipe', 'Restaurant', 'Gulshan-1', 'Gulshan-1, Dhaka', 23.7805000, 90.4180000, 'green', 'DNCRP', '{\"Product Origin\":\"Bangladesh\",\"Manufacturer\":\"Secret Recipe Ltd.\",\"Factory Location\":\"Dhaka\",\"Owner\":\"Secret Recipe Holdings\"}', '12 Sep 2026', '2026-08-20 21:54:31'),
(12, 'Istanbul Restaurant', 'Istanbul Restaurant', 'Restaurant', 'Gulshan-2', 'Gulshan-2, Dhaka', 23.7945000, 90.4145000, 'amber', '', '{\"Product Origin\":\"Bangladesh\",\"Manufacturer\":\"Istanbul Restaurant Ltd.\",\"Factory Location\":\"Dhaka\",\"Owner\":\"Istanbul Restaurant Holdings\"}', '', '2026-08-20 21:54:31'),
(13, 'New Gulshan Plaza Restaurant', 'New Gulshan Plaza', 'Restaurant', 'Gulshan-2', 'Gulshan-2, Dhaka', 23.7950000, 90.4165000, 'red', '', '{\"Product Origin\":\"Bangladesh\",\"Manufacturer\":\"New Gulshan Plaza Ltd.\",\"Factory Location\":\"Dhaka\",\"Owner\":\"New Gulshan Plaza Holdings\"}', '', '2026-08-20 21:54:31'),
(14, 'Salams Kitchen Banani', 'Salams Kitchen', 'Restaurant', 'Banani', 'Banani, Dhaka', 23.7910000, 90.4035000, 'amber', '', '{\"Product Origin\":\"Bangladesh\",\"Manufacturer\":\"Salams Kitchen Ltd.\",\"Factory Location\":\"Dhaka\",\"Owner\":\"Salams Kitchen Holdings\"}', '', '2026-08-20 21:54:31'),
(15, 'Sajna Restaurant', 'Sajna Restaurant', 'Restaurant', 'Banani', 'Banani, Dhaka', 23.7930000, 90.4025000, 'green', '', '{\"Product Origin\":\"Bangladesh\",\"Manufacturer\":\"Sajna Restaurant Ltd.\",\"Factory Location\":\"Dhaka\",\"Owner\":\"Sajna Restaurant Holdings\"}', '', '2026-08-20 21:54:31'),
(16, 'Chillox Banani', 'Chillox', 'Restaurant', 'Banani', 'Banani, Dhaka', 23.7918000, 90.4045000, 'amber', '', '{\"Product Origin\":\"Bangladesh\",\"Manufacturer\":\"Chillox Ltd.\",\"Factory Location\":\"Dhaka\",\"Owner\":\"Chillox Holdings\"}', '', '2026-08-20 21:54:31'),
(17, 'Prego Westin', 'Prego', 'Restaurant', 'Gulshan-2', 'The Westin Dhaka, Gulshan-2', 23.7938000, 90.4148000, 'green', 'DNCRP', '{\"Product Origin\":\"Bangladesh\",\"Manufacturer\":\"Prego Ltd.\",\"Factory Location\":\"Dhaka\",\"Owner\":\"Prego Holdings\"}', '12 Sep 2026', '2026-08-20 21:54:31'),
(18, 'Gloria Jeans Gulshan', 'Gloria Jeans Coffees', 'Restaurant', 'Gulshan-2', 'Gulshan-2, Dhaka', 23.7915000, 90.4160000, 'grey', '', '{\"Product Origin\":\"Bangladesh\",\"Manufacturer\":\"Gloria Jeans Coffees Ltd.\",\"Factory Location\":\"Dhaka\",\"Owner\":\"Gloria Jeans Coffees Holdings\"}', '', '2026-08-20 21:54:31'),
(19, 'Coopers Bakery Gulshan', 'Coopers Bakery', 'Bakery', 'Gulshan-2', 'Gulshan-2, Dhaka', 23.7942000, 90.4155000, 'green', 'Accredited Laboratory', '{\"Product Origin\":\"Bangladesh\",\"Manufacturer\":\"Coopers Bakery Ltd.\",\"Factory Location\":\"Dhaka\",\"Owner\":\"Coopers Bakery Holdings\"}', '12 Sep 2026', '2026-08-20 21:54:31'),
(20, 'Woodhouse Grill', 'Woodhouse Grill', 'Restaurant', 'Gulshan-2', 'Gulshan Avenue, Dhaka', 23.7900000, 90.4165000, 'amber', '', '{\"Product Origin\":\"Bangladesh\",\"Manufacturer\":\"Woodhouse Grill Ltd.\",\"Factory Location\":\"Dhaka\",\"Owner\":\"Woodhouse Grill Holdings\"}', '', '2026-08-20 21:54:31'),
(21, 'Gulshan Service Station', 'Gulshan Service Station', 'Fuel station', 'Gulshan-1', 'Gulshan-1, Dhaka', 23.7805000, 90.4145000, 'red', '', '{\"Product Origin\":\"Bangladesh\",\"Manufacturer\":\"Gulshan Service Station Ltd.\",\"Factory Location\":\"Dhaka\",\"Owner\":\"Gulshan Service Station Holdings\"}', '', '2026-08-20 21:54:31'),
(22, 'SOI 71 Gulshan', 'SOI 71', 'Restaurant', 'Gulshan-2', 'Gulshan-2, Dhaka', 23.7910000, 90.4180000, 'amber', '', '{\"Product Origin\":\"Bangladesh\",\"Manufacturer\":\"SOI 71 Ltd.\",\"Factory Location\":\"Dhaka\",\"Owner\":\"SOI 71 Holdings\"}', '', '2026-08-20 21:54:31'),
(23, 'Bella Italia Gulshan', 'Bella Italia', 'Restaurant', 'Gulshan-2', 'Gulshan-2, Dhaka', 23.7890000, 90.4170000, 'green', '', '{\"Product Origin\":\"Bangladesh\",\"Manufacturer\":\"Bella Italia Ltd.\",\"Factory Location\":\"Dhaka\",\"Owner\":\"Bella Italia Holdings\"}', '', '2026-08-20 21:54:31'),
(24, 'Sweets of Bengal', 'Sweets of Bengal', 'Bakery', 'Gulshan-1', 'Gulshan-1, Dhaka', 23.7808000, 90.4155000, 'amber', '', '{\"Product Origin\":\"Bangladesh\",\"Manufacturer\":\"Sweets of Bengal Ltd.\",\"Factory Location\":\"Dhaka\",\"Owner\":\"Sweets of Bengal Holdings\"}', '', '2026-08-20 21:54:31'),
(25, 'Durum Banani', 'Durum', 'Restaurant', 'Banani', 'Banani, Dhaka', 23.7920000, 90.4055000, 'green', '', '{\"Product Origin\":\"Bangladesh\",\"Manufacturer\":\"Durum Ltd.\",\"Factory Location\":\"Dhaka\",\"Owner\":\"Durum Holdings\"}', '', '2026-08-20 21:54:31');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `login_history`
--
ALTER TABLE `login_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_at` (`created_at`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `reports`
--
ALTER TABLE `reports`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `report_code` (`report_code`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `vendor_id` (`vendor_id`);

--
-- Indexes for table `report_actions`
--
ALTER TABLE `report_actions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `report_id` (`report_id`);

--
-- Indexes for table `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `vendor_id` (`vendor_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `login` (`login`);

--
-- Indexes for table `vendors`
--
ALTER TABLE `vendors`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `login_history`
--
ALTER TABLE `login_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `reports`
--
ALTER TABLE `reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `report_actions`
--
ALTER TABLE `report_actions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=60;

--
-- AUTO_INCREMENT for table `reviews`
--
ALTER TABLE `reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `vendors`
--
ALTER TABLE `vendors`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `login_history`
--
ALTER TABLE `login_history`
  ADD CONSTRAINT `login_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `reports`
--
ALTER TABLE `reports`
  ADD CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `reports_ibfk_2` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `report_actions`
--
ALTER TABLE `report_actions`
  ADD CONSTRAINT `report_actions_ibfk_1` FOREIGN KEY (`report_id`) REFERENCES `reports` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
