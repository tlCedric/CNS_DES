<?php
$conn = new mysqli("127.0.0.1", "root", "amadeus", "MY_DES");

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $username = $_POST['username'];
    $password = $_POST['password'];

    // Intentionally vulnerable: raw string concatenation, no sanitization
    $sql = "SELECT * FROM users WHERE username = '$username' AND password = '$password'";
    $result = $conn->query($sql);

    if ($result && $result->num_rows > 0) {
        $row = $result->fetch_assoc();
        echo "Logged in as: " . $row['username'] . " (role: " . $row['role'] . ")";
    } else {
        echo "Login failed.";
    }
}
?>
<form method="post">
    Username: <input type="text" name="username"><br>
    Password: <input type="password" name="password"><br>
    <input type="submit" value="Login">
</form>
