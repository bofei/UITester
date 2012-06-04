(function () {
    //重置setTimeout,setInterval
    // ajax等异步方法
    var S = KISSY, D = S.DOM, E = S.Event;


    var createTestCase = function (target) {

        var testCase = 'describe("属性测试用例"，function(){\n';
        var selector = uitest.inner.elToSelector(target);
        var attrs = target.attributes;
        if(attrs.length ==0)return;

        testCase += '  it("' + selector + ' has attribute"'  + ', function(){\n';


        testCase += '    var target = KISSY.DOM.get("' + selector + '")";\n';
        for (var i = 0; i < attrs.length; i++) {


            var name = attrs[i].name;
            var value = attrs[i].value;


            testCase += '    except(target).toHaveAttr("' + name + '","' + value + '");\n';


        }


        //showMsg(123);
        testCase += '  });\n});\n'
        uitest.inner.outterCall("appendCaseCode",[testCase])

    }

    //事件类型
    E.on(document.body, "click", function (e) {

        if (uitest.configs.caseType == "attr") {
            var target = e.target;
            var selector = uitest.inner.elToSelector(e.target);
            createTestCase(target);
        }


    })


})();