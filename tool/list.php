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

            <div class="case-list">
                <a href="http://uitest.taobao.net/UITester/tool/record/record.html" class="add-case">添加用例</a>

                <table class="case-table">
                    <colgroup>
                        <col class="case-name" />
                        <col class="case-action" />
                    </colgroup>
                	<tr>
                		<th>用例名</th>
                		<th>操作</th>
                	</tr>

                    <?php
                        include_once('conn_db.php');

                        $sql = 'select * from list';
                        $query_list_result = mysql_query($sql);

                        $result_num = mysql_num_rows($query_list_result);

                        for($idx = 0; $idx < $result_num; $idx ++){
                            $result_item = mysql_fetch_assoc($query_list_result);

                            echo('
                                <tr>
                                    <td>' . $result_item['task_name'] . '</td>
                                    <td>
                                        <a href="http://uitest.taobao.net/UITester/tool/record/record.html#' . $result_item['id'] . '" class="J_Edit">修改</a>
                                        <a href="handle.php?modify_tag=remove&task_id=' . $result_item['id'] . '" class="J_Remove">删除</a>
                                        <a href="apply.php?task_id=' . $result_item['id'] . '" class="J_Run" target="_blank">启动测试</a>
                                    </td>
                                </tr>
                            ');
                        }
                    ?>
                </table>
            </div>

        </div>
        <div id="footer"></div>
        
    </div>
</body>
</html>
