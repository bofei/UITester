<?php
    $queryString = $_SERVER['QUERY_STRING'];
    //$sourceURI = $_SERVER['HTTP_HOST'] . $_SERVER["SCRIPT_NAME"];
    $sourceURI = 'http://www.taobao.com';


    echo($sourceURI);

    $ch = curl_init();
  
    curl_setopt($ch, CURLOPT_URL, $sourceURI);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_HEADER, 0);
    $output = curl_exec($ch);
    curl_close($ch);

    $injectList = array(
        '../lib/jasmine.js',
        '../lib/jasmine-html.js',
        '../lib/event-simulate.js'
    );

    function createInjectList ($list){
        $tmp = '';

        foreach($list as $item){
            $tmp .= '<script src="' . $item . '"></script>\n';
        }

        return $tmp;
    }

    if ($queryString !== '__test__'){
        $output = str_replace('</body>', createInjectList($injectList) . 'insert</body>', $output);
    }

    echo($output);
?>
