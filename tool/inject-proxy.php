<?php
    //$queryString = $_SERVER['QUERY_STRING'];
    //$sourceURI = $_SERVER['HTTP_HOST'] . $_SERVER["SCRIPT_NAME"]; 

    echo('welcome to proxy<br>');
    echo('post<br>');
    var_dump($_POST);
    echo('get<br>');
    var_dump($_GET);

    $isGetByCurl = $_REQUEST['__TEST__'];

    $targetURI = $_REQUEST['target_uri'];
    $injectURIs = $_REQUEST['inject_uri'];

    $ch = curl_init();

    curl_setopt($ch, CURLOPT_URL, $targetURI);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_HEADER, 0);
    $output = curl_exec($ch);
    curl_close($ch);

    $injectList = array(
        '../lib/jasmine.js',
        '../lib/jasmine-html.js',
        '../lib/event-simulate.js'
    );

    $injectList = array_merge($injectList, $injectURIs);

    //var_dump($injectList);

    function createInjectList ($list){
        $tmp = '';

        foreach($list as $item){
            $tmp .= '<script src="' . $item . '"></script>\n';
        }

        return $tmp;
    }

    if ($isGetByCurl === 'true'){
        $output = str_replace('</body>', createInjectList($injectList) . 'insert</body>', $output);
    }

    //echo($output);
?>
