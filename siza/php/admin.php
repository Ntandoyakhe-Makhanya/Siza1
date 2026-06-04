<?php
require_once __DIR__ . '/config.php';
requireLogin();

if (!isAdmin()) {
    jsonResponse(['success' => false, 'message' => 'Admin access required.'], 403);
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';

$db = getDB();

switch ($action) {

    // DASHBOARD STATS 
    case 'stats':
        $stats = [];
        $stats['users']    = (int)$db->query('SELECT COUNT(*) FROM users WHERE role != "admin"')->fetchColumn();
        $stats['listings'] = (int)$db->query('SELECT COUNT(*) FROM listings')->fetchColumn();
        $stats['active']   = (int)$db->query('SELECT COUNT(*) FROM listings WHERE status="active"')->fetchColumn();
        $stats['reports']  = (int)$db->query('SELECT COUNT(*) FROM reports WHERE status="open"')->fetchColumn();
        $stats['bookings'] = (int)$db->query('SELECT COUNT(*) FROM bookings')->fetchColumn();
        $stats['messages'] = (int)$db->query('SELECT COUNT(*) FROM messages')->fetchColumn();

        // Recent signups
        $stmt = $db->query('SELECT id, full_name, email, role, is_verified, created_at FROM users ORDER BY created_at DESC LIMIT 5');
        $stats['recent_users'] = $stmt->fetchAll();

        // Recent listings
        $stmt = $db->query('SELECT l.id, l.title, l.status, u.full_name AS seller, l.created_at
                            FROM listings l JOIN users u ON l.seller_id=u.id
                            ORDER BY l.created_at DESC LIMIT 5');
        $stats['recent_listings'] = $stmt->fetchAll();

        jsonResponse(['success' => true, 'stats' => $stats]);
        break;

    // ALL USERS 
    case 'users':
        $stmt = $db->query(
            'SELECT id, full_name, email, phone, role, is_verified, location, rating_avg, created_at FROM users ORDER BY created_at DESC'
        );
        jsonResponse(['success' => true, 'users' => $stmt->fetchAll()]);
        break;

    //  VERIFY USER 
    case 'verify_user':
        $id = (int)($_POST['id'] ?? 0);
        $db->prepare('UPDATE users SET is_verified=1 WHERE id=?')->execute([$id]);
        $db->prepare('INSERT INTO admin_logs (admin_id, action, target, target_id) VALUES (?,?,?,?)')
           ->execute([$_SESSION['user_id'], 'Verified user', 'user', $id]);
        jsonResponse(['success' => true]);
        break;

    //  BAN / DELETE USER 
    case 'delete_user':
        $id = (int)($_POST['id'] ?? 0);
        $db->prepare('DELETE FROM users WHERE id=? AND role != "admin"')->execute([$id]);
        $db->prepare('INSERT INTO admin_logs (admin_id, action, target, target_id) VALUES (?,?,?,?)')
           ->execute([$_SESSION['user_id'], 'Deleted user', 'user', $id]);
        jsonResponse(['success' => true]);
        break;

    //  ALL LISTINGS 
    case 'listings':
        $stmt = $db->query(
            "SELECT l.*, u.full_name AS seller_name, c.name AS category_name
             FROM listings l JOIN users u ON l.seller_id=u.id JOIN categories c ON l.category_id=c.id
             ORDER BY l.created_at DESC"
        );
        jsonResponse(['success' => true, 'listings' => $stmt->fetchAll()]);
        break;

    //  FLAG / REMOVE LISTING 
    case 'flag_listing':
        $id = (int)($_POST['id'] ?? 0);
        $db->prepare('UPDATE listings SET status="flagged" WHERE id=?')->execute([$id]);
        $db->prepare('INSERT INTO admin_logs (admin_id, action, target, target_id) VALUES (?,?,?,?)')
           ->execute([$_SESSION['user_id'], 'Flagged listing', 'listing', $id]);
        jsonResponse(['success' => true]);
        break;

    case 'remove_listing':
        $id = (int)($_POST['id'] ?? 0);
        $db->prepare('DELETE FROM listings WHERE id=?')->execute([$id]);
        $db->prepare('INSERT INTO admin_logs (admin_id, action, target, target_id) VALUES (?,?,?,?)')
           ->execute([$_SESSION['user_id'], 'Removed listing', 'listing', $id]);
        jsonResponse(['success' => true]);
        break;

    //  REPORTS 
    case 'reports':
        $stmt = $db->query(
            "SELECT r.*, u.full_name AS reporter_name FROM reports r
             JOIN users u ON r.reporter_id=u.id ORDER BY r.created_at DESC"
        );
        jsonResponse(['success' => true, 'reports' => $stmt->fetchAll()]);
        break;

    case 'resolve_report':
        $id = (int)($_POST['id'] ?? 0);
        $db->prepare('UPDATE reports SET status="resolved" WHERE id=?')->execute([$id]);
        jsonResponse(['success' => true]);
        break;

    // ADMIN LOGS 
    case 'logs':
        $stmt = $db->query(
            "SELECT al.*, u.full_name AS admin_name FROM admin_logs al
             JOIN users u ON al.admin_id=u.id ORDER BY al.created_at DESC LIMIT 50"
        );
        jsonResponse(['success' => true, 'logs' => $stmt->fetchAll()]);
        break;

    default:
        jsonResponse(['error' => 'Unknown action'], 400);
}
