/*
*  1. createEvent（eventType）
参数：eventType 共5种类型：

Events ：包括所有的事件.
HTMLEvents：包括 'abort', 'blur', 'change', 'error', 'focus', 'load', 'reset', 'resize', 'scroll', 'select',
'submit', 'unload'. 事件


UIEevents ：包括 'DOMActivate', 'DOMFocusIn', 'DOMFocusOut', 'keydown', 'keypress', 'keyup'.
间接包含 MouseEvents.

MouseEvents：包括 'click', 'mousedown', 'mousemove', 'mouseout', 'mouseover', 'mouseup'.

MutationEvents:包括 'DOMAttrModified', 'DOMNodeInserted', 'DOMNodeRemoved',
'DOMCharacterDataModified', 'DOMNodeInsertedIntoDocument',
'DOMNodeRemovedFromDocument', 'DOMSubtreeModified'.

2. 在createEvent后必须初始化，为大家介绍5种对应的初始化方法
HTMLEvents 和 通用 Events：
initEvent( 'type', bubbles, cancelable )

UIEvents ：
initUIEvent( 'type', bubbles, cancelable, windowObject, detail )

MouseEvents：
initMouseEvent( 'type', bubbles, cancelable, windowObject, detail, screenX, screenY,
clientX, clientY, ctrlKey, altKey, shiftKey, metaKey, button, relatedTarget )

MutationEvents ：
initMutationEvent( 'type', bubbles, cancelable, relatedNode, prevValue, newValue,
attrName, attrChange )

* */


!function(WIN){
    WIN.Servent  = {
        fire:function(type,el){
            var host = this;
            switch(type){
               case 'click' : host._click(el);
                break;
               case 'mouseover':host._mouseover(el);
                break;
               case 'mouseout':host._mouseout(el);
                break;
                case 'scroll':host._scroll();
                break;
                case 'focus':host._focus(el);
                break;
                case 'submit':host._sumbit(el);
            }
        },
        _click:function(el){
            var evt = document.createEvent("HTMLEvents");
            evt.initEvent('click',true,true);
            el.dispatchEvent(evt);
        },
        _mouseover:function(el){
            var parent = el.parentNode;
            //var archer = mini('.btn')[0]; // 测试event.relatedTarget
            var evt = document.createEvent("MouseEvents");
            // 这里初始化时指定的relatedTarget是什么. 同一节点的mouseout事件触发时, relatedTarget就是什么
            evt.initMouseEvent("mouseover",true,true,window,1,0,0,0,0,false,false,false,false,0,parent);
            el.dispatchEvent(evt);
        },
        _mouseout:function(el){
            var parent = el.parentNode;
            //var archer = mini('.btn')[0]; // 测试event.relatedTarget
            var evt = document.createEvent("MouseEvents");
            evt.initMouseEvent("mouseout",true,true,window,1,0,0,0,0,false,false,false,false,0,parent);
            el.dispatchEvent(evt);
        },
        // 通过重复调用来模拟滚动行为
        // 仅由body支持  有问题
        _scroll:function(){
            var el = document.body;
            var evt = document.createEvent('HTMLEvents');
            evt.initEvent('scroll',false,true);
            el.dispatchEvent(evt);
        },
        _focus:function(el){
            var evt = document.createEvent('HTMLEvents');
            evt.initEvent('focus',false,true);
            el.dispatchEvent(evt);
        },
        _sumbit:function(formEl){
            //var evt = document.createEvent('HTMLEvents');
            //evt.initEvent('submit',true,true);
            //formEl.dispatchEvent(evt);

            // dispatchEvent()对submit无效 直接用submit方法
           formEl.submit();
        }

    };


}(window);

