<?php
    // include databse connector
    include_once('conn_db.php');

    $modify_tag = $_REQUEST['modify_tag'];
    $task_id = $_REQUEST['task_id'];
    $task_name = $_REQUEST['task_name'];
    $task_target_uri = $_REQUEST['task_target_uri'];
    $task_inject_uri = $_REQUEST['task_inject_uri'];

    // modify current record
    if ($modify_tag === 'modify'){
        $sql = '
            UPDATE `list` SET 
            `name`= ' . $task_name . ',
            `test_uri`= ' . $task_target_uri . ',
            `case_uri`= ' . $task_inject_uri. '
            WHERE id = ' . $task_id . ';
        ';
    }

    // remove record
    else if ($modify_tag === 'remove'){
        $sql = '
            DELETE FROM `list`
            WHERE id = ' . $task_id . '
        ';
    }

    // add for new record
    else {
        $sql = '
            INSERT INTO `list` (
                `task_name`,
                `task_target_uri`,
                `task_inject_uri`
            ) VALUES (
                `' . $task_name . '` ,
                `' . $task_target_uri . '`,
                `' . $task_inject_uri . '`
            );
        ';
    }

    echo $sql;

?>
