<?php
$pdo = new PDO('mysql:host=localhost;dbname=tga_crm;charset=utf8mb4', 'root', '');
$stmt = $pdo->query('SELECT id, email, password_hash, two_factor_enabled FROM users LIMIT 10');
$users = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Test Users:\n";
foreach ($users as $user) {
    echo "ID: {$user['id']}, Email: {$user['email']}, 2FA: {$user['two_factor_enabled']}\n";
}
