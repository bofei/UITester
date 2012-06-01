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
        $task_id = trim($_REQUEST['task_id']);

        if ($task_id === ''){
            echo('未指定参数 task_id');
            exit;
        }

        include_once('conn_db.php');

        $sql = 'select * from list where id = ' . $task_id;

        $query_result = mysql_query($sql);
        $result_item = mysql_fetch_assoc($query_result);

        $iframe_uri = $result_item['task_target_uri'];
        $iframe_uri .= (strpos($iframe_uri, '?') !== false) ? '&' : '?';

        $iframe_uri .= 'inject_uri=' . $result_item['task_inject_uri'];
        $iframe_uri .= '&__TEST__';

        echo('<div style="font-size: 12px; padding: 3px; margin-bottom: 10px; background: yellow; color: red;">注入的地址: ' . $iframe_uri . '</div>');
        echo('<iframe src="' . $iframe_uri . '" frameborder="0" style="border: 1px solid #000" width="100%" height="800"></iframe>');
    ?>

</body>
</html>
