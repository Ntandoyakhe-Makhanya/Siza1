<?php
require_once __DIR__ . '/config.php';

$action = $_POST['action'] ?? $_GET['action'] ?? 'list';

switch ($action) {

    case 'list':
        $db     = getDB();
        $where  = ['l.status = "active"'];
        $params = [];

        if (!empty($_GET['q'])) {
            $where[]  = '(l.title LIKE ? OR l.description LIKE ?)';
            $params[] = '%' . $_GET['q'] . '%';
            $params[] = '%' . $_GET['q'] . '%';
        }
        if (!empty($_GET['category'])) {
            $where[]  = 'l.category_id = ?';
            $params[] = (int)$_GET['category'];
        }
        if (!empty($_GET['type'])) {
            $where[]  = 'l.type = ?';
            $params[] = $_GET['type'];
        }
        if (!empty($_GET['location'])) {
            $where[]  = 'l.location LIKE ?';
            $params[] = '%' . $_GET['location'] . '%';
        }
        if (!empty($_GET['max_price'])) {
            $where[]  = 'l.price <= ?';
            $params[] = (float)$_GET['max_price'];
        }

        $sort = match($_GET['sort'] ?? '') {
            'price_asc'  => 'l.price ASC',
            'price_desc' => 'l.price DESC',
            'rating'     => 'u.rating_avg DESC',
            default      => 'l.created_at DESC'
        };

        $page  = max(1, (int)($_GET['page'] ?? 1));
        $limit = 12;
        $offset = ($page - 1) * $limit;

        $sql = "SELECT l.*, c.name AS category_name, c.type AS cat_type,
                       u.full_name AS seller_name, u.rating_avg AS seller_rating,
                       u.is_verified AS seller_verified, u.location AS seller_location
                FROM listings l
                JOIN categories c ON l.category_id = c.id
                JOIN users u ON l.seller_id = u.id
                WHERE " . implode(' AND ', $where) .
               " ORDER BY $sort LIMIT $limit OFFSET $offset";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $listings = $stmt->fetchAll();

        // Replace raw filenames with full browser-accessible URLs
        foreach ($listings as &$listing) {
            $listing['images'] = resolveImages($listing['images'] ?? null);
        }
        unset($listing);

        // Total count for pagination
        $countSql = "SELECT COUNT(*) FROM listings l
                     JOIN users u ON l.seller_id = u.id
                     WHERE " . implode(' AND ', $where);
        $cStmt = $db->prepare($countSql);
        $cStmt->execute($params);
        $total = (int)$cStmt->fetchColumn();

        jsonResponse([
            'success'  => true,
            'listings' => $listings,
            'total'    => $total,
            'pages'    => ceil($total / $limit),
            'page'     => $page
        ]);
        break;

        //single listing
    case 'get':
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) jsonResponse(['success' => false, 'message' => 'Invalid ID'], 400);

        try {
            $db   = getDB();
            $stmt = $db->prepare(
                "SELECT l.*, c.name AS category_name,
                        u.full_name AS seller_name, u.rating_avg AS seller_rating,
                        u.rating_count AS seller_rating_count, u.is_verified AS seller_verified,
                        u.location AS seller_location, u.bio AS seller_bio,
                        u.profile_pic AS seller_pic, u.phone AS seller_phone
                 FROM listings l
                 JOIN categories c ON l.category_id = c.id
                 JOIN users u ON l.seller_id = u.id
                 WHERE l.id = ?"
            );
            $stmt->execute([$id]);
            $listing = $stmt->fetch();
            if (!$listing) jsonResponse(['success' => false, 'message' => 'Listing not found'], 404);

            // Increment views
            $db->prepare('UPDATE listings SET views = views + 1 WHERE id = ?')->execute([$id]);

            // Reviews
            $rStmt = $db->prepare(
                "SELECT r.*, u.full_name AS reviewer_name, u.profile_pic AS reviewer_pic
                 FROM reviews r JOIN users u ON r.reviewer_id = u.id
                 WHERE r.listing_id = ? ORDER BY r.created_at DESC LIMIT 10"
            );
            $rStmt->execute([$id]);
            $listing['reviews'] = $rStmt->fetchAll();

            // Replace raw filename with full URL
            $listing['images'] = resolveImages($listing['images'] ?? null);

            jsonResponse(['success' => true, 'listing' => $listing]);
        } catch (Exception $e) {
            jsonResponse(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
        }
        break;

    // CREATE LISTING
    case 'create':
        requireLogin();
        $db = getDB();

        $title       = trim($_POST['title']       ?? '');
        $description = trim($_POST['description'] ?? '');
        $category_id = (int)($_POST['category_id'] ?? 0);
        $type        = in_array($_POST['type'] ?? '', ['goods','service']) ? $_POST['type'] : 'goods';
        $price       = (float)($_POST['price'] ?? 0);
        $price_unit  = in_array($_POST['price_unit'] ?? '', ['fixed','per_hour','per_day','negotiable'])
                        ? $_POST['price_unit'] : 'fixed';
        $location    = trim($_POST['location'] ?? '');

       if (!$title || !$description || !$category_id || $price < 0) {
            jsonResponse(['success' => false, 'message' => 'Missing required fields.'], 400);
        }

    //     TEMPORARY DEBUG
    // jsonResponse([
    //     'debug'       => true,
    //     'title'       => $title,
    //     'description' => $description,
    //     'category_id' => $category_id,
    //     'price'       => $price,
    //     'location'    => $location,
    //     'post_keys'   => array_keys($_POST),
    //     'post_raw'    => $_POST,
    // ]);

        // Handle image uploads
        $imagePaths = [];
        $uploadDir  = UPLOAD_PATH;

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $fileKey = isset($_FILES['images']) ? 'images' : (isset($_FILES['images[]']) ? 'images[]' : null);

        if ($fileKey && !empty($_FILES[$fileKey]['name'][0])) {
            $allowed = ['jpg', 'jpeg', 'png', 'webp'];
            foreach ($_FILES[$fileKey]['tmp_name'] as $i => $tmpName) {
                if ($_FILES[$fileKey]['error'][$i] !== UPLOAD_ERR_OK) continue;
                $ext = strtolower(pathinfo($_FILES[$fileKey]['name'][$i], PATHINFO_EXTENSION));
                if (!in_array($ext, $allowed)) continue;
                $fname = uniqid('img_', true) . '.' . $ext;
                if (move_uploaded_file($tmpName, $uploadDir . $fname)) {
                    $imagePaths[] = $fname;
                }
            }
        }

        $stmt = $db->prepare(
            'INSERT INTO listings (seller_id, category_id, title, description, type, price, price_unit, location, images)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $_SESSION['user_id'], $category_id, $title, $description,
            $type, $price, $price_unit, $location, json_encode($imagePaths)
        ]);

        jsonResponse(['success' => true, 'id' => $db->lastInsertId(), 'message' => 'Listing created!']);
        break;

    // DELETE LISTING 
    case 'delete':
        requireLogin();
        $id = (int)($_POST['id'] ?? 0);
        $db = getDB();

        $stmt = $db->prepare('SELECT seller_id FROM listings WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        if (!$row) jsonResponse(['success' => false, 'message' => 'Not found'], 404);
        if ($row['seller_id'] != $_SESSION['user_id'] && !isAdmin()) {
            jsonResponse(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $db->prepare('DELETE FROM listings WHERE id = ?')->execute([$id]);
        jsonResponse(['success' => true, 'message' => 'Listing deleted.']);
        break;

    //UPDATE LISTING 
    case 'update':
        requireLogin();
        $id          = (int)($_POST['id'] ?? 0);
        $db          = getDB();

        // Ownership check
        $stmt = $db->prepare('SELECT seller_id FROM listings WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) jsonResponse(['success' => false, 'message' => 'Not found'], 404);
        if ($row['seller_id'] != $_SESSION['user_id'] && !isAdmin()) {
            jsonResponse(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $title       = trim($_POST['title']       ?? '');
        $description = trim($_POST['description'] ?? '');
        $category_id = (int)($_POST['category_id'] ?? 0);
        $type        = in_array($_POST['type'] ?? '', ['goods','service']) ? $_POST['type'] : 'goods';
        $price       = (float)($_POST['price'] ?? 0);
        $price_unit  = in_array($_POST['price_unit'] ?? '', ['fixed','per_hour','per_day','negotiable'])
                        ? $_POST['price_unit'] : 'fixed';
        $location    = trim($_POST['location'] ?? '');
        $status      = in_array($_POST['status'] ?? '', ['active','inactive','sold'])
                        ? $_POST['status'] : 'active';

        if (!$title || !$description || !$category_id) {
            jsonResponse(['success' => false, 'message' => 'Missing required fields.'], 400);
        }

        $db->prepare(
            'UPDATE listings SET title=?, description=?, category_id=?, type=?, price=?, price_unit=?, location=?, status=? WHERE id=?'
        )->execute([$title, $description, $category_id, $type, $price, $price_unit, $location, $status, $id]);

        jsonResponse(['success' => true, 'message' => 'Listing updated.']);
        break;

    
    case 'my_listings':
        requireLogin();
        $db   = getDB();
        $stmt = $db->prepare(
            "SELECT l.*, c.name AS category_name
             FROM listings l
             JOIN categories c ON l.category_id = c.id
             WHERE l.seller_id = ?
             ORDER BY l.created_at DESC"
        );
        $stmt->execute([$_SESSION['user_id']]);
        $myListings = $stmt->fetchAll();

        // Replace raw filenames with full URLs
        foreach ($myListings as &$item) {
            $item['images'] = resolveImages($item['images'] ?? null);
        }
        unset($item);

        jsonResponse(['success' => true, 'listings' => $myListings]);
        break;

 
    case 'categories':
        $db   = getDB();
        $stmt = $db->query('SELECT * FROM categories ORDER BY type, name');
        jsonResponse(['success' => true, 'categories' => $stmt->fetchAll()]);
        break;

    default:
        jsonResponse(['error' => 'Unknown action'], 400);
}