<?php
$db_host = 'localhostl';
$user = 'root';
$pwd = '1234';

$con = mysql_connect($db_host, $user, $pwd);

if (!$con) {
    die('Could not connect: ' . mysql_error());
}

?>
