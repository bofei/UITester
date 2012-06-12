(function () {
    //重置setTimeout,setInterval
    // ajax等异步方法
    var S = KISSY, D = S.DOM, E = S.Event;

    S.ready(function () {

        var allMutationRecords = [];


        var createTestCase = function (target) {

            var testCase = 'describe("属性测试用例",function(){\n';
            var selector = uitest.inner.elToSelector(target);
            var attrs = target.attributes;
            if (attrs.length == 0)return;

            allMutationRecords.forEach(function (mutation) {
                console.log(mutation)

                if (mutation.type == "attributes" && mutation.target == target) {
                    target._addAttr = {};
                    target._removeAttr = {};
                    target._modifiyAttr = {}


                    var oldValue = mutation.oldValue;
                    var newValue = mutation.target.getAttribute(mutation.attributeName)

                    if (oldValue && !target._modifiyAttr[mutation.attributeName]) {
                        target._modifiyAttr[mutation.attributeName] = oldValue;
                    }

                    if (!oldValue && newValue && !target._addAttr[mutation.attributeName]) {
                        target._addAttr[mutation.attributeName] = true;
                    }
                    ;
                }
                console.log(target._addAttr);

            })


            testCase += '  it("' + selector + ' has attribute"' + ', function(){\n';


            testCase += '    var target = KISSY.DOM.get("' + selector + '");\n';
            for (var i = 0; i < attrs.length; i++) {


                var name = attrs[i].name;


                if (!target._addAttr[name]) {
                    var value = target._modifiyAttr[name] || attrs[i].value;

                    testCase += '    expect(target).toHaveAttr("' + name + '","' + value + '");\n';
                }


            }
            target._addAttr = {};
            target._removeAttr = {};
            target._modifiyAttr = {}


            //showMsg(123);
            testCase += '  })\n})\n'
            uitest.inner.outterCall("appendCaseCode", [testCase])

        }


        var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;


        var observer = new MutationObserver(function (mutations) {


            if (uitest.configs.caseType == "attr") {

                uitest.inner.hasSelectorChange(mutations);
                allMutationRecords = allMutationRecords.concat(mutations);

            }


        });

        observer.observe(document, {
            attributes:true,


            subtree:true

        });


        //事件类型
        E.on(document.body, "click", function (e) {

            if (uitest.configs.caseType == "attr") {
                var target = e.target;

                window.setTimeout(function () {
                    createTestCase(target);
                    allMutationRecords = [];
                }, 10)

            }


        })


    })


})();