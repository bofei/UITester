<!DOCTYPE HTML>
<html lang="en">
<head>
	<meta charset="gbk">
	<title>���������б�</title>
    <link rel="stylesheet" href="common.css" />
</head>
<body>
    <div id="page">
        <div id="head">UITester</div>
        <div id="content">

            <div class="case-list">
                <a href="http://uitest.taobao.net/UITester/tool/record/record.html" class="add-case">�������</a>

                <table class="case-table">
                    <colgroup>
                        <col class="case-name" />
                        <col class="case-action" />
                    </colgroup>
                	<tr>
                		<th>������</th>
                		<th>����</th>
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
                                        <a href="http://uitest.taobao.net/UITester/tool/record/record.html#' . $result_item['id'] . '" class="J_Edit">�޸�</a>
                                        <a href="handle.php?modify_tag=remove&task_id=' . $result_item['id'] . '" class="J_Remove">ɾ��</a>
                                        <a href="apply.php?task_id=' . $result_item['id'] . '" class="J_Run" target="_blank">��������</a>
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
