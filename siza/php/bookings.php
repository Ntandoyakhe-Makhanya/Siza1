<?php
require_once __DIR__ . '/config.php';
requireLogin();

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {

    // CREATE BOOKING 
    case 'create':
        $listing_id   = (int)($_POST['listing_id']   ?? 0);
        $booking_date = trim($_POST['booking_date']  ?? '');
        $booking_time = trim($_POST['booking_time']  ?? '');
        $notes        = trim($_POST['notes']         ?? '');

        if (!$listing_id || !$booking_date || !$booking_time) {
            jsonResponse(['success' => false, 'message' => 'Missing booking details.'], 400);
        }

        $db   = getDB();
        $stmt = $db->prepare('SELECT seller_id, type FROM listings WHERE id = ?');
        $stmt->execute([$listing_id]);
        $listing = $stmt->fetch();

        if (!$listing) jsonResponse(['success' => false, 'message' => 'Listing not found.'], 404);
        if ($listing['type'] !== 'service') {
            jsonResponse(['success' => false, 'message' => 'Bookings are only for services.'], 400);
        }
        if ($listing['seller_id'] == $_SESSION['user_id']) {
            jsonResponse(['success' => false, 'message' => 'Cannot book your own service.'], 400);
        }

        $db->prepare(
            'INSERT INTO bookings (listing_id, buyer_id, seller_id, booking_date, booking_time, notes)
             VALUES (?,?,?,?,?,?)'
        )->execute([$listing_id, $_SESSION['user_id'], $listing['seller_id'],
                    $booking_date, $booking_time, $notes]);

        jsonResponse(['success' => true, 'message' => 'Booking request sent!', 'id' => $db->lastInsertId()]);
        break;

    //  MY BOOKINGS 
    case 'my_bookings':
        $db   = getDB();
        $me   = (int)$_SESSION['user_id'];
        $role = $_GET['role'] ?? 'buyer';

        $col  = $role === 'seller' ? 'b.seller_id' : 'b.buyer_id';
        $stmt = $db->prepare(
            "SELECT b.*, l.title AS listing_title, l.price,
                    u.full_name AS other_name
             FROM bookings b
             JOIN listings l ON b.listing_id = l.id
             JOIN users u ON u.id = IF(b.buyer_id=?, b.seller_id, b.buyer_id)
             WHERE $col = ?
             ORDER BY b.booking_date ASC, b.booking_time ASC"
        );
        $stmt->execute([$me, $me]);
        jsonResponse(['success' => true, 'bookings' => $stmt->fetchAll()]);
        break;

    // UPDATE STATUS 
    case 'update_status':
        $id     = (int)($_POST['id']     ?? 0);
        $status = $_POST['status']        ?? '';

        if (!in_array($status, ['confirmed','completed','cancelled'])) {
            jsonResponse(['success' => false, 'message' => 'Invalid status.'], 400);
        }

        $db   = getDB();
        $stmt = $db->prepare('SELECT seller_id, buyer_id FROM bookings WHERE id=?');
        $stmt->execute([$id]);
        $b = $stmt->fetch();
        if (!$b) jsonResponse(['success' => false, 'message' => 'Not found.'], 404);

        // Only seller can confirm but both buyer and seller can cancel
        $me = (int)$_SESSION['user_id'];
        if ($status === 'cancelled') {
            if ($b['seller_id'] != $me && $b['buyer_id'] != $me) {
                jsonResponse(['success' => false, 'message' => 'Unauthorized.'], 403);
            }
        } else {
            if ($b['seller_id'] != $me) {
                jsonResponse(['success' => false, 'message' => 'Only seller can update status.'], 403);
            }
        }

        $db->prepare('UPDATE bookings SET status=? WHERE id=?')->execute([$status, $id]);
        jsonResponse(['success' => true, 'message' => "Booking $status."]);
        break;

    default:
        jsonResponse(['error' => 'Unknown action'], 400);
}
