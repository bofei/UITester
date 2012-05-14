KISSY.add('UITester', function (S){

    var DOM = S.DOM, Event = S.Event, IO = S.IO,
        jasmine, uiTester,
        doc = document,
        win = window;

    uiTester = {
        configs: {
            taskForm: null,
            taskQueues: [
                /**
                 *
                 *
                 *
                 */
            ],

        },

        // 初始化测试模块
        init: function (){
            var host = this;

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
        },

        // 启动队列中的任务
        startTask: function (){
        },
        
        // 创建 iframe
        createIframe: function (){
            var neoIframe = DOM.create('iframe');
            
            DOM.css(neoIframe, {
                position: 'absolute',
                left: '-9999px'
            });

            document.body,appendChild(neoIframe);

            return neoIframe;
        },

        // 注入测试脚本
        injectResource: function (){
        },

    };


    uiTester.init();
});
