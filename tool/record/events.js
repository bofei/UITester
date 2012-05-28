//重置setTimeout,setInterval
//ajax等异步方法
var S = KISSY, D = S.DOM, E = S.Event;
var testType = "event"
var showMsg = function (msg) {
    console.log(123);
    var p = D.create("<p></p>");
    for (var i = 0; i < arguments.length; i++) {
        var s = D.create("<span>" + arguments[i] + "</span>");
        p.appendChild(s);
    }
    console.log(p)
    D.get("#test-case").appendChild(p)
}

E.on(".type", "click", function (e) {
    var target = e.target;
    testType = D.attr(target, "data-value");
})

//事件类型

//交互事件测试
// mouse events supported
var Events = {};
Events.mouseEvents = {
    click     :1,
    dblclick  :1,
    mouseover :1,
    mouseout  :1,
    mouseenter:1,
    mouseleave:1,
    mousedown :1,
    mouseup   :1,
    mousemove :1
};

// key events supported
Events.keyEvents = {
    keydown :1,
    keyup   :1,
    keypress:1
};

// HTML events supported
Events.uiEvents = {
    blur  :1,
    change:1,
    focus :1,
    resize:1,
    scroll:1,
    select:1
};

// events that bubble by default
Events.bubbleEvents = {
    //scroll:1,
    // resize:1,
    //reset :1,
    //submit:1,
    // change:1,
    // select:1,
    // error :1,
    //abort :1
};
var actionLock = false;
var changeEventRecords = [];
var preEventRecord;
var mutationRecords = [];
//将元素转化的全局唯一的选择器
var elToSelector = function (el) {

    var selector = el.tagName;

    if (el.id) {
        selector += "#" + el.id;
    }

    if (el.className) {
        var classNameArray = el.className.split(" ");
        for (var p in classNameArray) {
            selector += "." + classNameArray[p]
        }
    }

    return selector

}

//记录事件
for (var bp in Events) {

    for (var p in Events[bp]) {
        (function (type) {

            E.on(document.body, type, function (e) {
                if (testType != "event")return;

                var record = {
                    type  :e.type,
                    event :e,
                    target:e.target
                }
                if (e.type == "change") {

                    record.newValue = e.target.value
                    changeEventRecords.push(record);
                }
                else {
                    preEventRecord = record;
                }
                if (mutationRecords.length > 0) {
                    var newmutationRecords = mutationRecords;
                    createTestCase(preEventRecord, newmutationRecords)
                    mutationRecords = [];
                }


            })
        })(p);

    }
}

//记录变化

var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;


var observer = new MutationObserver(function (mutations) {
    if (testType != "event")return;
    console.log(mutations)
    //事件发生，lock;
    if (actionLock)return;
    var realMutations = [];

    mutations.forEach(function (mutation) {
        if (D.parent(mutation.target, "#test-page")) {
            realMutations.push(mutation);

        }
    })

    if (realMutations.length == 0)return;

    mutationRecords = realMutations
    actionLock = true;


    actionLock = false;


    /*
     mutations.forEach(function (mutation) {
     console.log(mutation)
     if (mutation.type == "attributes") {
     var oldValue = mutation.oldValue;
     var newValue = mutation.target.getAttribute(mutation.attributeName)

     if (!oldValue && newValue) {
     console.log("ADD ATTR", mutation.attributeName, oldValue, newValue)

     }
     ;
     if (oldValue && !newValue) {
     console.log("remove ATTR", mutation.attributeName, oldValue, newValue)

     }
     ;
     if (oldValue && newValue) {
     console.log("change ATTR", mutation.attributeName, oldValue, newValue)

     }
     ;
     }
     });
     */
});

observer.observe(document, {
    attributes           :true,
    childList            :true,
    characterData        :true,
    subtree              :true,
    attributeOldValue    :true,
    characterDataOldValue:true
});


var createTestCase = function (action, mutations) {

    var testCase = 'describe("交互动作测试用例"，function(){</br>';
    var selector = elToSelector(action.target);
    var type = action.type;
    testCase += '<span class="tab1"></span>it("' + type + '  ' + selector + '", function(){</br>';

    for (var i = 0; i < changeEventRecords.length; i++) {
        testCase += '<span class="tab2"></span>KISSY.DOM.get("' + elToSelector(changeEventRecords[i].target) + '").value ="' + changeEventRecords[i].newValue + '";</br>';
    }
    inputRecords = [];
    testCase += '<span class = "tab2" ></span>simulate(KISSY.DOM.get("' + selector + '"),"' + type + '");</br>';


    testCase += '<span class="tab2"></span>waitsMatchers(function(){</br>'
    mutations.forEach(function (mutation) {

        if (mutation.type == "attributes") {
            var oldValue = mutation.oldValue;
            var newValue = mutation.target.getAttribute(mutation.attributeName)

            if (!oldValue && newValue) {
                console.log("ADD ATTR", mutation.attributeName, oldValue, newValue);
                testCase += '<span class="tab3"></span>except(KISSY.DOM.get("' + selector + '")).toHaveAttr("' + mutation.attributeName + '","' + newValue + '");</br>';

            }
            ;
            if (oldValue && !newValue) {
                console.log("remove ATTR", mutation.attributeName, oldValue, newValue)
                testCase += '<span class="tab3"></span>except(KISSY.DOM.get("' + selector + '")).not.toHaveAttr("' + mutation.attributeName + '","' + oldValue + '");</br>';

            }
            ;
            if (oldValue && newValue) {
                console.log("change ATTR", mutation.attributeName, oldValue, newValue)
                testCase += '<span class="tab3"></span>except(KISSY.DOM.get("' + selector + '")).toHaveAttr("' + mutation.attributeName + '","' + newValue + '");</br>';

            }
            ;
        }
    });

    testCase += '<span class="tab2"></span>})</br>'
//showMsg(123);
    testCase += '<span class="tab1"></span>});</br>});'
    showMsg(testCase)

}


/*
 //自动发现测试用例

 var lis = document.querySelectorAll('a');
 console.log(lis);
 var i = 0;
 setInterval(function () {
 if (i >= lis.length)return;
 simulate(lis[i], "click");
 i++;
 }, 100)
 */

