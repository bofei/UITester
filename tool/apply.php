<!DOCTYPE HTML>
<html lang="en">
<head>
	<meta charset="gbk">
	<title>UI Tester</title>

    <script src="http://a.tbcdn.cn/s/kissy/1.2.0/kissy.js"></script>
    <!-- <script src="task.js"></script> -->
</head>
<body>

    <?php
        $task_id = $_REQUEST['task_id'];

        include_once('conn_db.php');

        $sql = 'select * from list where id = ' . $task_id;

        $query_result = mysql_query($sql);
        $result_item = mysql_fetch_assoc($query_result);

        $iframe_uri = $result_item['task_target_uri'];
        $iframe_uri .= (strpos($iframe_uri, '?') !== false) ? '&' : '?';

        $iframe_uri .= 'target_uri=' . $result_item['task_target_uri'] . '&';
        $iframe_uri .= 'inject_uri=' . $result_item['task_inject_uri'] . '&';
        $iframe_uri .= '__TEST__=true';

        echo('<iframe src="' . $iframe_uri . '" frameborder="0" width="100%" height="100%"></iframe>');
    ?>

</body>
</html>
