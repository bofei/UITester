<?php
$db_host = 'localhost';
$user = 'root';
$pwd = '1234';

$conn = mysql_connect($db_host, $user, $pwd);

if (!$conn) {
    die('Could not connect: ' . mysql_error());
}

$database = mysql_select_db('uitest', $conn);
?>
