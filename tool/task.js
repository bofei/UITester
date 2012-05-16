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
                 * ����˵��:
                 *
                 * {
                 *   testURI: 'http://www.taobao.com/',
                 *   caseURIs: [
                 *      'http://xxx/test1.js',
                 *      'http://xxx/test2.js',
                 *      'http://xxx/test3.js'
                 *      ],
                 *   status: 'wait' // ��ȡ��ֵ��: waiting, testing, successed, failed
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

        // ��ʼ������ģ��
        init: function (){
            document.domain = 'taobao.com';

            var host = this;

            // ���¼�
            host.bindEvent();
            
        },

        // ��ʼ�� postMessage ����
        _initPostMessage: function (){
        },

        // ����������������
        _addToTaskQueue: function (){
        },

         // ������������Ƴ�����
        _removeFromTaskQueue: function (){
        },

        // Ϊ�������Կ�ܰ��¼�
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

        // ���������е�����
        _startTask: function (ev, target, parentNode){
            ev.preventDefault();

            var host = this;

            var testURI, 
                caseURIs = [],
                testFrame;

            testURI = DOM.get('.J_TestURI', parentNode);
            testFrame = DOM.get('.J_TestFrame', parentNode);

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
        
        // ע����Խű�
        injectResource: function (frame, cfg){
            var host = this,
                scriptNode;

            // ע���¼�, �� iframe onload ʱ����ע��ű�
            Event.on(frame, 'load', function (){
                var scriptsInjectQueue = host.configs.defaultInjectScripts.concat(cfg.caseURIs);

                S.each(scriptsInjectQueue, function (value){
                    scriptNode = document.createElement('script');
                    scriptNode.src = value;
                    //scriptNode = DOM.create('<script src="' + value + '"></script>')
                    frame.contentWindow.document.body.appendChild(scriptNode);
                });


                //var neoNode = frame.contentWindow.document.createElement('script');
                //var neoNode = document.createElement('script');
                //frame.contentWindow.document.body.appendChild(neoNode);
                //neoNode.src = 'http://uitester.taobao.com/tool/test-inject.js'


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
