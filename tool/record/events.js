(function () {
    //重置setTimeout,setInterval
    // ajax等异步方法
    var S = KISSY, D = S.DOM, E = S.Event;


    var actionLock = false;
    var changeEventRecords = [];
    var preEventRecord;
    var mutationRecords = [];

    var allEventRecord = [];
    var validEvent = function (target, type) {
        var result = false;
        if (target['on' + type])result = true;
        else if (target["_bindEventType"] && target["_bindEventType"][type]) {
            result = true
        }

        return result;
    }

    for (var p in uitest.configs.events) {

        (function (type) {

            document.body.addEventListener(type, function (e) {


                if (uitest.configs.caseType != "event")return;

                if (!uitest.configs.events[type])return;


                if (validEvent(e.target, e.type)) allEventRecord.push(S.merge({}, e));


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


                    for (var i = 0; i < allEventRecord.length && i < 50; i++) {
                        var et = allEventRecord[i];
                        //  simulate(et.target, et.type);
                        console.log(et.type);

                    }


                    mutationRecords = [];
                }


            }, true, true)
        })(p);

    }


//记录变化

    var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;


    var observer = new MutationObserver(function (mutations) {

        if (uitest.configs.caseType != "event")return;
        window.setTimeout(function () {
            createTestCase(allEventRecord, mutations)
            allEventRecord = [];
        }, 0)


    });

    observer.observe(document, {
        attributes           :true,
        childList            :true,
        characterData        :true,
        subtree              :true,
        attributeOldValue    :true,
        characterDataOldValue:true
    });


    var createTestCase = function (allEventRecord, mutations) {

        var testCase = 'describe("交互动作测试用例",function(){\n';


        testCase += '  it("' + 12 + '", function(){\n';

        var expectNum = 0;
        var verifys = [];


        mutations.forEach(function (mutation) {
            console.log(mutation)


            if (mutation.type == "attributes") {

                var oldValue = mutation.oldValue;
                var newValue = mutation.target.getAttribute(mutation.attributeName)

                var selector = uitest.inner.elToSelector(mutation.target)

                if (!oldValue && newValue) {
                    var v = 'exp' + (++expectNum)
                    testCase += '    var ' + v + ' = expect("' + selector + '").willAddAttr("' + mutation.attributeName + '","' + newValue + '");\n';
                    verifys.push(v + ".verify();")
                }

                if (oldValue && !newValue) {
                    var v = 'exp' + (++expectNum)
                    testCase += '    var exp' + (++expectNum) + ' = expect("' + selector + '").willRemoveAttr("' + mutation.attributeName + '","' + oldValue + '");\n';
                    verifys.push(v + ".verify();")
                }

                if (oldValue && newValue) {
                    var v = 'exp' + (++expectNum)
                    testCase += '    var exp' + (++expectNum) + ' = expect("' + selector + '").willModifyAttr("' + mutation.attributeName + '","' + oldValue + '","' + newValue + '");\n';
                    verifys.push(v + ".verify();")
                }
                ;
            }
            if (mutation.type == "characterData") {

                var target = mutation.target.parentNode;
                var newValue = target.innerHTML;

                var selector = uitest.inner.elToSelector(target)


                var v = 'exp' + (++expectNum)
                testCase += '    var exp' + (++expectNum) + ' = expect("' + selector + '").willModifyInnerHTML("' + newValue + '");\n';
                verifys.push(v + ".verify();")

            }
            if (mutation.type == "childList") {


                var addedNodes = mutation.addedNodes;
                var removedNodes = mutation.removedNodes;


                var selector = uitest.inner.elToSelector(mutation.target)


                if (addedNodes.length > 0) {
                    for (var i = 0; i < addedNodes.length; i++) {
                        var v = 'exp' + (++expectNum);
                        var se = uitest.inner.elToSelector(addedNodes[i])
                        testCase += '    var ' + v + ' = expect("' + selector + '").willAddChildren("' + se + '");\n';
                        verifys.push(v + ".verify();")
                    }


                }
                if (removedNodes.length > 0) {
                    for (var i = 0; i < removedNodes.length; i++) {
                        var v = 'exp' + (++expectNum);
                        var se = uitest.inner.elToSelector(removedNodes[i])
                        testCase += '    var ' + v + ' = expect("' + selector + '").willRemoveChildren("' + se + '");\n';
                        verifys.push(v + ".verify();")
                    }


                }


            }

        });


        var hasSelectorChange = function (target, mutations) {
        };

        for (var i = 0; i < allEventRecord.length; i++) {

            var selector = uitest.inner.elToSelector(allEventRecord[i].target);
            var keyCode = '';
            if (/^key/.test(allEventRecord[i].type)) {
                keyCode = ',{keyCode:' + allEventRecord[i].keyCode + ',charCode:' + allEventRecord[i].charCode + '}';
            }
            testCase += '    simulate("' + selector + '","' + allEventRecord[i].type + '"' + keyCode + ');\n';
        }


        testCase += '    waitsMatchers(function(){\n'

        for (var i = 0; i < verifys.length; i++) {
            testCase += '        ' + verifys[i] + "\n"
        }


        testCase += '    })\n'

        testCase += '  })\n})'

        uitest.inner.outterCall("appendCaseCode", [testCase]);

    }


})();