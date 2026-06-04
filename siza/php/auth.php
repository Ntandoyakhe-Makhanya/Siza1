<?php
require_once __DIR__ . '/config.php';

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {

    // REGISTER 
    case 'register':
        $name     = trim($_POST['full_name']  ?? '');
        $email    = trim($_POST['email']      ?? '');
        $phone    = trim($_POST['phone']      ?? '');
        $password = $_POST['password']        ?? '';
        $role     = in_array($_POST['role'] ?? '', ['buyer','seller']) ? $_POST['role'] : 'buyer';
        $location = trim($_POST['location']   ?? '');

        if (!$name || !$email || !$password) {
            jsonResponse(['success' => false, 'message' => 'Please fill in all required fields.'], 400);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonResponse(['success' => false, 'message' => 'Invalid email address.'], 400);
        }
        if (strlen($password) < 8) {
            jsonResponse(['success' => false, 'message' => 'Password must be at least 8 characters.'], 400);
        }

        $db = getDB();
        $check = $db->prepare('SELECT id FROM users WHERE email = ?');
        $check->execute([$email]);
        if ($check->fetch()) {
            jsonResponse(['success' => false, 'message' => 'Email already registered.'], 409);
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $db->prepare(
            'INSERT INTO users (full_name, email, phone, password_hash, role, location)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$name, $email, $phone, $hash, $role, $location]);
        $userId = $db->lastInsertId();

        $_SESSION['user_id'] = $userId;
        $_SESSION['role']    = $role;
        $_SESSION['name']    = $name;

        jsonResponse(['success' => true, 'message' => 'Account created!', 'role' => $role]);
        break;

    // LOGIN 
    case 'login':
        $email    = trim($_POST['email']    ?? '');
        $password = $_POST['password']      ?? '';

        if (!$email || !$password) {
            jsonResponse(['success' => false, 'message' => 'Email and password required.'], 400);
        }

        $db   = getDB();
        $stmt = $db->prepare('SELECT * FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            jsonResponse(['success' => false, 'message' => 'Invalid email or password.'], 401);
        }

        $_SESSION['user_id'] = $user['id'];
        $_SESSION['role']    = $user['role'];
        $_SESSION['name']    = $user['full_name'];

        jsonResponse(['success' => true, 'role' => $user['role'], 'name' => $user['full_name']]);
        break;

    // LOGOUT 
    case 'logout':
        session_destroy();
        jsonResponse(['success' => true]);
        break;

    // CHECK SESSION 
    case 'check':
        if (isLoggedIn()) {
            $u = currentUser();
            jsonResponse(['loggedIn' => true, 'user' => [
                'id'   => $u['id'],
                'name' => $u['full_name'],
                'role' => $u['role'],
                'pic'  => $u['profile_pic'],
            ]]);
        } else {
            jsonResponse(['loggedIn' => false]);
        }
        break;

    default:
        jsonResponse(['error' => 'Unknown action'], 400);
}
