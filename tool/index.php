<!DOCTYPE HTML>
<html lang="en">
<head>
	<meta charset="gbk">
	<title>UI Tester</title>
    <!--
    <link rel="stylesheet" href="http://a.tbcdn.cn/tbsp/tbsp.css" />
    -->
    <link rel="stylesheet" href="task.css" />

    <script src="http://a.tbcdn.cn/s/kissy/1.2.0/kissy.js"></script>
    <script src="task.js"></script>
</head>
<body>
    <?php 
        for ($idx = 0; $idx < 4; $idx++){ 
    ?>
            <div class="task J_Task">

                <form action="" class="task-config J_TaskConfig">
                    <table>
                        <tr>
                            <th>������ַ</th>
                            <td>
                                <input type="text" class="test-input J_TestURI" value="<? if ($idx == 0){ echo('http://jianghu.taobao.com/crossdomain.htm'); } ?>" />
                            </td>
                            <td>&nbsp;</td>
                        </tr><tr>
                            <th>������ַ</th>
                            <td class="J_CaseSetting">
                                <input type="text" class="test-input J_CaseURI" value="<? if ($idx == 0){ echo('http://uitester.taobao.com/tool/test/test-inject.js'); } ?>"  />
                            </td>
                            <td>
                                <a class="J_AddCase" href="">[+]</a>
                            </td>
                        </tr>
                    </table>

                    <a href="" class="J_StartTest">��������</a>
                </form>

                <div class="J_TaskResult task-result">
                    ����һ�����Ա���
                </div>

                <iframe src="" frameborder="0" class="test-frame J_TestFrame"></iframe>
            </div>
    <?
        }
    ?>
</body>
</html>
