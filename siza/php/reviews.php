<?php
require_once __DIR__ . '/config.php';
requireLogin();

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {

    case 'add':
        $listing_id = (int)($_POST['listing_id'] ?? 0);
        $rating     = (int)($_POST['rating']     ?? 0);
        $comment    = trim($_POST['comment']     ?? '');

        if (!$listing_id || $rating < 1 || $rating > 5) {
            jsonResponse(['success' => false, 'message' => 'Invalid review data.'], 400);
        }

        $db = getDB();
        // Gets the seller_id from listing
        $s = $db->prepare('SELECT seller_id FROM listings WHERE id = ?');
        $s->execute([$listing_id]);
        $row = $s->fetch();
        if (!$row) jsonResponse(['success' => false, 'message' => 'Listing not found'], 404);

        // Checks for duplicate
        $dup = $db->prepare('SELECT id FROM reviews WHERE listing_id=? AND reviewer_id=?');
        $dup->execute([$listing_id, $_SESSION['user_id']]);
        if ($dup->fetch()) jsonResponse(['success' => false, 'message' => 'Already reviewed.'], 409);

        $db->prepare(
            'INSERT INTO reviews (listing_id, reviewer_id, seller_id, rating, comment) VALUES (?,?,?,?,?)'
        )->execute([$listing_id, $_SESSION['user_id'], $row['seller_id'], $rating, $comment]);

        // Updates the sellers avg
        $db->prepare(
            "UPDATE users u
             SET rating_avg = (SELECT AVG(rating) FROM reviews WHERE seller_id = u.id),
                 rating_count = (SELECT COUNT(*) FROM reviews WHERE seller_id = u.id)
             WHERE u.id = ?"
        )->execute([$row['seller_id']]);

        jsonResponse(['success' => true, 'message' => 'Review submitted!']);
        break;

    default:
        jsonResponse(['error' => 'Unknown action'], 400);
}
