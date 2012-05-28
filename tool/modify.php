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

            <form method="POST" action="save.php">
                <table class="add-case-table">
                    <colgroup>
                        <col class="property" />
                        <col class="value" />
                    </colgroup>

                    <tr>
                        <th>名称</th>
                        <td>
                            <input type="text" name="target_name" class="input-box" />
                        </td>
                    </tr>
                    <tr>
                        <th>测试网址</th>
                        <td>
                            <input type="text" name="target_uri" class="input-box" />
                        </td>
                    </tr>
                    <tr>
                        <th>用例地址</th>
                        <td>
                            <input type="text" name="inject_uris[]" class="input-box" />
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2">
                            <input type="submit" value="保存" />
                        </td>
                    </tr>
                </table>
            </form>

        </div>
        <div id="footer"></div>
    </div>
</body>
</html>
