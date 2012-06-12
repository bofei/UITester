(function () {
    //重置setTimeout,setInterval
    // ajax等异步方法
    var S = KISSY, D = S.DOM, E = S.Event;


    var createTestCase = function (target) {
        var testCase = 'describe("属性测试用例",function(){\n';
        var selector = uitest.inner.elToSelector(target);

        var tag = target.tagName.toLowerCase()
        if (tag === "input" || tag === "textarea" || tag === "button") {

            testCase += '  it("' + selector + ' to be exist"' + ', function(){\n';
        

            testCase += '    expect("' + selector + '").toHaveProp("value", "' + target.value + '");\n';
            testCase += '  })\n})\n'
            uitest.inner.outterCall("appendCaseCode", [testCase])
        }
        else {
            var html = target.innerHTML;
            testCase += '  it("' + selector + ' to be exist"' + ', function(){\n';
            console.log(html.replace(/\s/g, ""))

            html = html.replace(/\n/g, "\\n").replace(/\n/g, "\\n").replace(/"/g, '\\"');

            testCase += '    expect("' + selector + '").toHaveHtml("' + html + '");\n';
            testCase += '  })\n})\n'
            uitest.inner.outterCall("appendCaseCode", [testCase])
        }


    }


    //事件类型
    E.on(document.body, "click", function (e) {
        if (uitest.configs.caseType == "innerhtml") {
            var target = e.target;
            window.setTimeout(function () {
                createTestCase(target);
            }, 0)
        }
    })
})();