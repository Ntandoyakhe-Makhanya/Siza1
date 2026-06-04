<?php
define('DB_HOST',     'localhost');
define('DB_NAME',     'siza_db');
define('DB_USER',     'root');       
define('DB_PASS',     '');           
define('DB_CHARSET',  'utf8mb4');

define('SITE_URL',    'http://localhost/siza');
define('UPLOAD_PATH', __DIR__ . '/../images/uploads/');
define('UPLOAD_URL',  SITE_URL . '/images/uploads/');

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
        $opts = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $opts);
    }
    return $pdo;
}

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function isLoggedIn(): bool {
    return isset($_SESSION['user_id']);
}

function requireLogin(): void {
    if (!isLoggedIn()) {
        // If this is an API request, return JSON instead of redirect
        $isApi = (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest')
               || (isset($_SERVER['HTTP_ACCEPT']) && str_contains($_SERVER['HTTP_ACCEPT'], 'application/json'))
               || !empty($_POST) || !empty($_GET['action']);
        if ($isApi) {
            jsonResponse(['success' => false, 'message' => 'Please log in to continue.', 'redirect' => 'LogIn.html'], 401);
        }
        header('Location: ' . SITE_URL . '/LogIn.html');
        exit;
    }
}

function currentUser(): ?array {
    if (!isLoggedIn()) return null;
    $db = getDB();
    $stmt = $db->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([$_SESSION['user_id']]);
    return $stmt->fetch() ?: null;
}

function isAdmin(): bool {
    return isset($_SESSION['role']) && $_SESSION['role'] === 'admin';
}

function resolveImages(?string $imagesJson): string {
    if (!$imagesJson) return '[]';
    $files = json_decode($imagesJson, true);
    if (!is_array($files) || empty($files)) return '[]';
    $urls = array_map(function($filename) {
        return UPLOAD_URL . $filename;
    }, $files);
    return json_encode($urls);
}

function sanitize(string $str): string {
    return htmlspecialchars(trim($str), ENT_QUOTES, 'UTF-8');
}

function jsonResponse(array $data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}