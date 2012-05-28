(function () {
    //重置setTimeout,setInterval
    // ajax等异步方法
    var S = KISSY, D = S.DOM, E = S.Event;


    var createTestCase = function (target) {

        var testCase = 'describe("属性测试用例"，function(){</br>';
        var selector = elToSelector(target);
        var attrs = target.attributes;

        testCase += '<span class="tab1"></span>it("' + selector + ' has attribute"'  + ', function(){</br>';


        testCase += '<span class="tab2"></span>var target = KISSY.DOM.get("' + selector + '")";</br>';
        for (var i = 0; i < attrs.length; i++) {


            var name = attrs[i].name;
            var value = attrs[i].value;


            testCase += '<span class="tab2"></span>except(target).toHaveAttr("' + name + '","' + value + '");</br>';


        }


        //showMsg(123);
        testCase += '<span class="tab1"></span>});</br>});'
        showMsg(testCase)

    }

    //事件类型
    E.on(document.body, "click", function (e) {
        console.log(e)
        if (caseType == "attr") {
            var target = e.target;
            var selector = elToSelector(e.target);
            createTestCase(target);
        }


    })


})();