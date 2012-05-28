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

