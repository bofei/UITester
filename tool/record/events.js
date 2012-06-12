(function () {



    //重置setTimeout,setInterval
    // ajax等异步方法
    var S = KISSY, D = S.DOM, E = S.Event;
    S.ready(function () {
        var start = false;


        var actionLock = false;
        var changeEventRecords = [];
        var preEventRecord;
        var mutationRecords = [];

        var allEventRecord = [];
        var allMutationRecords = [];
        var validEvent = function (target, type) {
            var result = false;
            if (target['on' + type])result = true;
            else if (target["_bindEventType"] && target["_bindEventType"][type]) {
                result = true
            }
            else if (type == "change") {
                result = true
            }

            return result;
        }
        var timer;
        for (var p in uitest.configs.events) {

            (function (type) {

                document.body.addEventListener(type, function (e) {

                    start = true;


                    if (uitest.configs.caseType != "event")return;

                    if (!uitest.configs.events[type])return;


                    if (validEvent(e.target, e.type)) {
                        if (e.type == "change") {
                            e.changeValue = e.target.value;
                        }
                        allEventRecord.push(S.merge({}, e));
                    }

                }, true, true)
            })(p);

        }


//记录变化

        var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;


        var observer = new MutationObserver(function (mutations) {
            if (uitest.configs.caseType != "event")return;
            allMutationRecords = allMutationRecords.concat(mutations);
            uitest.inner.outterCall("showCreateBtn");
        });

        observer.observe(document, {
            attributes           :true,
            childList            :true,
            characterData        :true,
            subtree              :true,
            attributeOldValue    :true,
            characterDataOldValue:true
        });

        uitest.inner.removeEventTypeTestCase = function () {
            allEventRecord = [];
            allMutationRecords = [];
            uitest.inner.outterCall("hideCreateBtn");

        }


        uitest.inner.createEventTypeTestCase = function () {

            var mutations = allMutationRecords;
            uitest.inner.outterCall("hideCreateBtn");

            //分析最终状态
            //随机数过滤


            /**
             * 异常情况:
             * 多次修改同一个属性
             * 添加多个相同的标签
             * 添加之后立即删除
             *
             *
             */
            var testCase = [];


            uitest.inner.hasSelectorChange(mutations);


            var expectNum = 0;
            var verifys = [];

            var records = [];

            var hasRecords = function (rec) {
                for (var i = 0; i < records.length; i++) {
                    if (records[i] === rec)return i;
                }
            }
            var hasChildListRecords = function (rec) {

                for (var i = 0; i < records.length; i++) {
                    if (records[i] && rec) {
                        if (records[i].replace(/\d+/g, "") === rec.replace(/\d+/g, ""))return i;
                    }

                }
            }

            var toS = uitest.inner.elToSelector;
            var toSP = uitest.inner.elToSelectorRelativeParent;


            var testCase = 'describe("交互动作测试用例",function(){\n';


            testCase += '  it("' + 12 + '", function(){\n';


            mutations.forEach(function (mutation) {


                if (mutation.type == "attributes") {

                    var oldValue = mutation.oldValue;
                    var newValue = mutation.target.getAttribute(mutation.attributeName)


                    var selector = uitest.inner.elToSelector(mutation.target)

                    if (!oldValue && newValue && !/\d+/.test(newValue)) {

                        if (D.attr(mutation.target, mutation.attributeName) === newValue) {

                            var expect = 'expect("' + selector + '").willAddAttr("' + mutation.attributeName + '","' + newValue + '");\n'
                            if (!hasRecords(expect)) {
                                records.push(expect);

                            }

                        }


                    }

                    if (oldValue && !newValue && !/\d+/.test(oldValue)) {
                        if (!D.hasAttr(mutation.target, mutation.attributeName)) {

                            var expect = 'expect("' + selector + '").willRemoveAttr("' + mutation.attributeName + '","' + oldValue + '");\n'
                            if (!hasRecords(expect)) {
                                records.push(expect);

                            }


                        }
                    }

                    if (oldValue && newValue && !/\d+/.test(newValue)) {
                        if (D.attr(mutation.target, mutation.attributeName) === newValue) {


                            var expect = 'expect("' + selector + '").willModifyAttr("' + mutation.attributeName + '","' + newValue + '");\n'
                            if (!hasRecords(expect)) {
                                records.push(expect);


                            }

                        }
                    }
                    ;
                }
                if (mutation.type == "characterData") {

                    var target = mutation.target.parentNode;
                    var newValue = target.innerHTML;

                    var selector = uitest.inner.elToSelector(target)


                    var expect = 'expect("' + selector + '").willModifyInnerHTML("' + newValue + '");\n';
                    if (!hasRecords(expect)) {
                        records.push(expect);

                    }


                }

                if (mutation.type == "childList") {


                    var addedNodes = mutation.addedNodes;
                    var removedNodes = mutation.removedNodes;
                    //分析


                    var selector = uitest.inner.elToSelector(mutation.target)

                    if (addedNodes.length > 0) {
                        for (var i = 0; i < addedNodes.length; i++) {
                            addedNodes[i]._isJsAdd = true;

                            if (addedNodes[i].ownerDocument) {
                                var se = toSP(addedNodes[i]);
                                var expect = 'expect("' + selector + '").willAddChildren("' + se + '", 1);\n';
                                var removeExpect = 'expect("' + selector + '").willRemoveChildren("' + se + '", 1);\n';

                                var index = hasChildListRecords(removeExpect);
                                var addIndex = hasChildListRecords(expect);
                                if (index !== undefined) {
                                    var num = /\d+/.exec(records[index])[0];
                                    if (num == "1")records[index] = null;
                                    else {
                                        num = parseInt(num) - 1;
                                        records[index] = 'expect("' + selector + '").willRemoveChildren("' + se + '", ' + num + ');\n';
                                    }

                                }
                                else if (addIndex !== undefined) {

                                    var num = /\d+/.exec(records[addIndex])[0];


                                    num = parseInt(num) + 1;

                                    records[addIndex] = 'expect("' + selector + '").willAddChildren("' + se + '", ' + num + ');\n';
                                    console.log("add chilcd," + records[addIndex])
                                }
                                else {
                                    records.push(expect);
                                    console.log("add chilcd," + expect)

                                }


                            }


                        }

                    }
                    if (removedNodes.length > 0) {
                        for (var i = 0; i < removedNodes.length; i++) {


                            var se = toSP(removedNodes[i]);
                            var expect = 'expect("' + selector + '").willRemoveChildren("' + se + '", 1);\n';

                            var addExpect = 'expect("' + selector + '").willAddChildren("' + se + '", 1);\n';
                            var index = hasChildListRecords(addExpect);
                            var removeIndex = hasChildListRecords(expect);
                            if (index !== undefined) {
                                var num = /\d+/.exec(records[index])[0];
                                if (num == "1")records[index] = null;
                                else {
                                    num = parseInt(num) - 1;
                                    records[index] = 'expect("' + selector + '").willAddChildren("' + se + '", ' + num + ');\n';
                                }

                            }
                            else if (removeIndex !== undefined) {
                                num = parseInt(num) + 1;
                                records[removeIndex] = 'expect("' + selector + '").willRemoveChildren("' + se + '", ' + num + ');\n';
                            }
                            else {
                                records.push(expect);

                            }


                        }


                    }


                }


            });


            for (var i = 0; i < records.length; i++) {
                var v = "exp" + i;

                testCase += '    var ' + v + ' = ' + records[i];
                verifys.push(v + ".verify();")

            }


            for (var i = 0; i < allEventRecord.length; i++) {


                var selector = uitest.inner.elToSelector(allEventRecord[i].target);
                var keyCode = '';
                if (/^key/.test(allEventRecord[i].type)) {
                    keyCode = ',{keyCode:' + allEventRecord[i].keyCode + ',charCode:' + allEventRecord[i].charCode + '}';
                }
                if (allEventRecord[i].type === "change") {
                    testCase += '    KISSY.DOM.get("' + selector + '").value = ' + allEventRecord[i].changeValue + '\n';
                }
                testCase += '    simulate("' + selector + '","' + allEventRecord[i].type + '"' + keyCode + ');\n';
            }


            for (var i = 0; i < verifys.length; i++) {
                testCase += '    waitsMatchers(function(){' + verifys[i] + '});\n'
            }


            testCase += '  })\n})'

            uitest.inner.outterCall("appendCaseCode", [testCase]);
            allEventRecord = [];
            allMutationRecords = []

        }


    })


})();