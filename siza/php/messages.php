<?php
require_once __DIR__ . '/config.php';
requireLogin();

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {

    //  SEND MESSAGE 
    case 'send':
        $receiver_id = (int)($_POST['receiver_id'] ?? 0);
        $listing_id  = (int)($_POST['listing_id']  ?? 0) ?: null;
        $message     = trim($_POST['message'] ?? '');

        if (!$receiver_id || !$message) {
            jsonResponse(['success' => false, 'message' => 'Missing fields.'], 400);
        }
        if ($receiver_id === (int)$_SESSION['user_id']) {
            jsonResponse(['success' => false, 'message' => 'Cannot message yourself.'], 400);
        }

        $db   = getDB();
        $stmt = $db->prepare(
            'INSERT INTO messages (sender_id, receiver_id, listing_id, message) VALUES (?,?,?,?)'
        );
        $stmt->execute([$_SESSION['user_id'], $receiver_id, $listing_id, $message]);
        jsonResponse(['success' => true, 'id' => $db->lastInsertId()]);
        break;

    //  INBOX 
    case 'inbox':
        $db   = getDB();
        $stmt = $db->prepare(
            "SELECT m.*, u.full_name AS sender_name, u.profile_pic AS sender_pic,
                    l.title AS listing_title
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             LEFT JOIN listings l ON m.listing_id = l.id
             WHERE m.receiver_id = ?
             ORDER BY m.created_at DESC"
        );
        $stmt->execute([$_SESSION['user_id']]);
        jsonResponse(['success' => true, 'messages' => $stmt->fetchAll()]);
        break;

    //  CONVERSATION 
    case 'conversation':
        $other_id   = (int)($_GET['with'] ?? 0);
        $listing_id = (int)($_GET['listing'] ?? 0) ?: null;
        $db         = getDB();
        $me         = (int)$_SESSION['user_id'];

        $sql = "SELECT m.*, u.full_name AS sender_name
                FROM messages m JOIN users u ON m.sender_id = u.id
                WHERE ((m.sender_id = ? AND m.receiver_id = ?)
                    OR (m.sender_id = ? AND m.receiver_id = ?))";
        $params = [$me, $other_id, $other_id, $me];

        if ($listing_id) { $sql .= ' AND m.listing_id = ?'; $params[] = $listing_id; }
        $sql .= ' ORDER BY m.created_at ASC';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        // Mark as read
        $db->prepare('UPDATE messages SET is_read=1 WHERE receiver_id=? AND sender_id=?')
           ->execute([$me, $other_id]);

        jsonResponse(['success' => true, 'messages' => $stmt->fetchAll()]);
        break;

    // UNREAD COUNT 
    case 'unread':
        $db   = getDB();
        $stmt = $db->prepare('SELECT COUNT(*) FROM messages WHERE receiver_id=? AND is_read=0');
        $stmt->execute([$_SESSION['user_id']]);
        jsonResponse(['success' => true, 'count' => (int)$stmt->fetchColumn()]);
        break;

    default:
        jsonResponse(['error' => 'Unknown action'], 400);
}
