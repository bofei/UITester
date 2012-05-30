<?php
    function dump ($target){
        echo('-----------debug info----------');
        echo('<pre>');
        var_dump($target);
        echo('</pre>');
        exit;
    }

    #$isGetByCurl = strpos('__TEST__', $_SERVER['QUERY_STRING']);

    // pre formating
    $query_string = str_replace('%3f', '?', $_SERVER['QUERY_STRING']);
    $query_string = str_replace('q=', '', $query_string);
    $query_string = str_replace('&__TEST__', '', $query_string);

    // get position of split place
    $pos_injejct_uri = strpos($query_string, 'inject_uri');
    
    $target_uri = substr($query_string, 0, $pos_injejct_uri);
    $target_uri = str_replace('target_uri=', '', $target_uri);

    $inject_uri = substr($query_string, $pos_injejct_uri, strlen($query_string));
    $inject_uri = str_replace('inject_uri=', '', $inject_uri);

    // make sure inject_uri to be array, so it can 
    // be merged bellow
    if (!is_array($inject_uri)){
        $inject_uri = array(
            $inject_uri
        );
    }

    $ch = curl_init();

    curl_setopt($ch, CURLOPT_URL, $target_uri);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_HEADER, 0);
    $output = curl_exec($ch);
    curl_close($ch);

    $inject_list = array(
        'http://uitest.taobao.net/UITester/lib/jasmine.js',
        'http://uitest.taobao.net/UITester/lib/jasmine-html.js',
        'http://uitest.taobao.net/UITester/lib/event-simulate.js'
    );

    $inject_list = array_merge($inject_list, $inject_uri);

    function create_inject_list ($list){
        $tmp = '';

        foreach($list as $item){
            $tmp .= '<script src="' . $item . '"></script>';
        }

        return $tmp;
    }

    $output = str_replace('<body>', '<body><div style="background: red;">injected</div>', $output);
    $output = str_replace('</body>', create_inject_list($inject_list) . '</body>', $output);

    echo($output);
?>

