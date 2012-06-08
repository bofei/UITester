(function () {
    //重置setTimeout,setInterval
    // ajax等异步方法
    var S = KISSY, D = S.DOM, E = S.Event;


    var createTestCase = function (target) {

        var testCase = 'describe("位置测试用例",function(){\n';
        var selector = uitest.inner.elToSelector(target);
        var offset = D.offset(target);


        testCase += '  it("' + selector + ' has position"' + ', function(){\n';
        testCase += '    expect(' + selector + ').atPosition(' + offset.left + ',' + offset.top + ');\n';

        //showMsg(123);
        testCase += '  })\n})\n'
        uitest.inner.outterCall("appendCaseCode", [testCase])

    }

    //事件类型
    E.on(document.body, "click", function (e) {

        if (uitest.configs.caseType == "position") {
            var target = e.target;
            var selector = uitest.inner.elToSelector(e.target);
            createTestCase(target);
        }


    })


})();