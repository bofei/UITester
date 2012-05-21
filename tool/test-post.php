<!DOCTYPE HTML>
<html lang="en">
<head>
	<meta charset="gbk">
	<title></title>
</head>
<body>
    <form action="inject-proxy.php">
        <input type="text" name="test_uri" value="http://www.taobao.com" />
        <input type="text" name="case_uri[]" value="http://a.tbcdn.cn/b.js" />
        <input type="text" name="case_uri[]" value="http://a.tbcdn.cn/a.js" />
        <input  type="submit" />
    </form>	
</body>
</html>
