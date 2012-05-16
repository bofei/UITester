KISSY.add('UITester', function (S){

    var DOM = S.DOM, Event = S.Event, IO = S.IO,
        win = window, doc = document,
        uiTester;

    uiTester = {
        configs: {
            defaultInjectScripts: {
                jasmine: '../lib/jasmine.js',
                jasmineHtml: '../lib/jasmine-html.js',
                eventSimulate: '../lib/event-simulate.js'
            },

            taskQueues: [

                /**
                 * 数据说明:
                 *
                 * {
                 *   testURI: 'http://www.taobao.com/',
                 *   caseURIs: [
                 *      'http://xxx/test1.js',
                 *      'http://xxx/test2.js',
                 *      'http://xxx/test3.js'
                 *      ],
                 *   status: 'wait' // 可取的值有: waiting, testing, successed, failed
                 * }, {
                 *   testURI: 'http://www.taobao.com/',
                 *   caseURI: ['http://xxx/test4.js'],
                 *   status: 'finished'
                 * }, {
                 *   testURI: 'http://www.taobao.com/',
                 *   caseURI: ['http://xxx/test3.js'],
                 *   status: 'finished'
                 * }
                 *
                 */

            ]
        },

        // 初始化测试模块
        init: function (){
            var host = this;

            // 绑定事件
            host.bindEvent();
            
        },

        // 初始化 postMessage 功能
        _initPostMessage: function (){
        },

        // 向任务队列添加任务
        _addToTaskQueue: function (){
        },

         // 从任务队列中移除任务
        _removeFromTaskQueue: function (){
        },

        // 为整个测试框架绑定事件
        bindEvent: function (){
            var host = this;

            host._bindTaskConfigEvent();
        },

        _bindTaskConfigEvent: function (){
            var host = this;

            Event.on(document, 'click', function (ev){
                var target = ev.target;

                if (DOM.hasClass(target, 'J_AddTask')){
                    host._addTask(ev, target);
                }

                if (DOM.hasClass(target, 'J_StartTest')){
                    host._startTask(ev, target);
                }

            });
        },

        // 启动队列中的任务
        _startTask: function (ev, target){
            ev.preventDefault();
        },

        _addTask: function (ev, target){
            ev.preventDefault();

            var parentNode = DOM.parent(target, '.J_TaskConfig'),
                targetToBeCloned = DOM.get('.J_CaseURI', parentNode),
                neoNode = DOM.clone(targetToBeCloned);

            neoNode.value = '';

            DOM.insertBefore(neoNode, targetToBeCloned);
        },
        
        // 注入测试脚本
        injectResource: function (){
        }

    };


    S.ready(function (){
        uiTester.init();
    });
});
