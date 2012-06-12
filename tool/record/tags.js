(function () {
    //重置setTimeout,setInterval
    // ajax等异步方法
    var S = KISSY, D = S.DOM, E = S.Event;
    S.ready(function(){

        var createTestCase = function (target) {
            var testCase = 'describe("属性测试用例",function(){\n';
            var selector = uitest.inner.elToSelector(target);
            testCase += '  it("' + selector + ' to be exist"' + ', function(){\n';
            testCase += '    expect("' + selector + '").toExist();\n';
            testCase += '  })\n})\n'
            uitest.inner.outterCall("appendCaseCode", [testCase])

        }


        //事件类型
        E.on(document.body, "click", function (e) {
            if (uitest.configs.caseType == "tags") {
                var target = e.target;
                window.setTimeout(function () {
                    createTestCase(target);
                }, 0)
            }
        })

    })


})();