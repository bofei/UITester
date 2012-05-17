KISSY.add('UITester', function (S){

    var DOM = S.DOM, Event = S.Event, IO = S.IO,
        win = window, doc = document,
        uiTester;

    uiTester = {
        configs: {
            defaultInjectScripts: [
                'http://uitester.taobao.com/lib/jasmine.js',
                'http://uitester.taobao.com/lib/jasmine-html.js',
                'http://uitester.taobao.com/lib/event-simulate.js'
            ],

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
            document.domain = 'taobao.com';

            var host = this;

            // 绑定事件
            host.bindEvent();
            
        },

        // 初始化 postMessage 功能
        //_initPostMessage: function (){
        //},

        // 向任务队列添加任务
        //_addToTaskQueue: function (){
        //},

         // 从任务队列中移除任务
        //_removeFromTaskQueue: function (){
        //},

        // 为整个测试框架绑定事件
        bindEvent: function (){
            var host = this;

            host._bindTaskConfigEvent();
        },

        _bindTaskConfigEvent: function (){
            var host = this;

            Event.on(document, 'click', function (ev){
                var target = ev.target,
                    parentNode;

                if (DOM.hasClass(target, 'J_AddCase')){
                    parentNode = DOM.parent(target, '.J_Task');
                    host._addCaseInput(ev, target, parentNode);
                }

                if (DOM.hasClass(target, 'J_StartTest')){
                    parentNode = DOM.parent(target, '.J_Task');
                    host._startTask(ev, target, parentNode);
                }

            });
        },

        // 启动队列中的任务
        _startTask: function (ev, target, parentNode){
            ev.preventDefault();

            var host = this;

            var testURI, 
                caseURIs = [],
                testFrame;

            testURI = DOM.get('.J_TestURI', parentNode);

            testFrameContainer = DOM.get('.J_TestFrame');
            testFrameContainer.innerHTML = '';

            testFrame = DOM.create('<iframe>');
            DOM.append(testFrame, testFrameContainer);

            S.each(DOM.query('.J_CaseURI', parentNode), function (el){
                if (S.trim(el.value) !== ''){
                    caseURIs.push(el.value);
                }
            });

            var cfg = {
                testURI: testURI.value,
                caseURIs: caseURIs,
                testFrame: testFrame
            };

            //host._setConfig(cfg);

            host.injectResource(testFrame, cfg);
            
        },

        _setConfig: function (){
        },

        _addCaseInput: function (ev, target){
            ev.preventDefault();

            var parentNode = DOM.parent(target, '.J_TaskConfig'),
                targetToBeCloned = DOM.get('.J_CaseURI', parentNode),
                neoNode = DOM.clone(targetToBeCloned);

            neoNode.value = '';

            DOM.insertBefore(neoNode, targetToBeCloned);
        },
        
        // 注入测试脚本
        injectResource: function (frame, cfg){
            var host = this,
                scriptNode;

            // 注册事件, 在 iframe onload 时候再注入脚本
            Event.on(frame, 'load', function (){
                var scriptsInjectQueue = host.configs.defaultInjectScripts.concat(cfg.caseURIs);

                S.each(scriptsInjectQueue, function (value){
                    scriptNode = document.createElement('script');
                    scriptNode.src = value;
                    frame.contentWindow.document.body.appendChild(scriptNode);
                });

            });

            frame.src = cfg.testURI + 
                (cfg.testURI.indexOf('?') > -1 ? '&' : '?') +
                't=' + Math.random();

        }

    };


    S.ready(function (){
        uiTester.init();
    });
});
