<!DOCTYPE HTML>
<html lang="en">
<head>
	<meta charset="gbk">
	<title>测试用例列表</title>
    <link rel="stylesheet" href="common.css" />
</head>
<body>
    <div id="page">
        <div id="head">UITester</div>
        <div id="content">

            <form method="POST" action="handle.php">
                <table class="add-case-table">
                    <colgroup>
                        <col class="property" />
                        <col class="value" />
                    </colgroup>

                    <?php
                        $task_name = '';
                        $task_target_uri = '';
                        $task_inject_uri = '';
                        $modify_tag = '';

                        $task_id = trim($_REQUEST['id']);

                        if ($task_id !== ''){

                            include_once('conn_db.php');

                            $sql = 'select * from list where id = ' . $task_id;
                            $taskResult = mysql_query($sql);

                            if (mysql_num_rows($taskResult) > 0){
                                $result_item = mysql_fetch_assoc($taskResult);
                                $task_name = $result_item['task_name'];
                                $task_target_uri = $result_item['task_target_uri'];
                                $task_inject_uri = $result_item['task_inject_uri'];

                                $modify_tag = 'modify';
                            }
                        }

                        echo('
                            <tr>
                                <th>名称</th>
                                <td>
                                    <input type="text" name="task_name" class="input-box" value="' . $task_name . '" />
                                </td>
                            </tr>
                            <tr>
                                <th>测试网址</th>
                                <td>
                                    <input type="text" name="task_target_uri" class="input-box" value="' . $task_target_uri . '" />
                                </td>
                            </tr>
                            <tr>
                                <th>用例地址</th>
                                <td>
                                    <input type="text" name="task_inject_uri" class="input-box" value="' . $task_inject_uri. '" />
                                </td>
                            </tr>

                            <tr>
                                <td colspan="2">
                                    <input type="hidden" name="modify_tag" value="' . $modify_tag . '" />
                                    <input type="hidden" name="task_id" value="' . $task_id . '" />
                                    <input type="submit" value="保存" />
                                </td>
                            </tr>
                        ');
                    ?>
                </table>
            </form>

        </div>
        <div id="footer"></div>
    </div>
</body>
</html>
