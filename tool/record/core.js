(function () {
    //重置setTimeout,setInterval
    // ajax等异步方法
    var S = KISSY, D = S.DOM, E = S.Event;
    window.uitest = {};

    uitest.configs = {
        caseType:"event",
        events  :{
            // mouse events supported
            click     :1,
            dblclick  :1,
            mouseover :1,
            mouseout  :1,
            mouseenter:1,
            mouseleave:1,
            mousedown :1,
            mouseup   :1,
            mousemove :1,
            //key events supported
            keydown   :1,
            keyup     :1,
            keypress  :1,
            /// HTML events supported
            blur      :1,
            change    :1,
            focus     :1,
            resize    :1,
            scroll    :1,
            select    :1


        },
        attr    :{}
    }

    uitest.outter = {
        init            :function () {
            var host = this;
            this.observeCall();
            this.codeEditor();
            this.layout();
            this.initTabs();
            this.caseTypeEvent();
            this.eventConfigsView();
            this.runTestCaseEvent()


        },

        initTabs:function(){
          new S.Tabs('.tabs', {
                // aria:false 默认 true，支持 aria
                switchTo:0,
              triggerType:"click"
          });
        },
        runTestCaseEvent:function () {
            var host = this;
            E.on(".run-test", "click", function (e) {
                console.log(e)
                host.innerCall("runTestCase", [host.textEditor.textModel.text])
            })
        },
        eventConfigsView:function () {
            var host = this;
            var configs = D.get(".configs");
            var html = '<li class="cfg-item hide"><h3 class="event"><a class="title">事件</a><a class="status start">记录</a></h3><ul>';

            for (var p in uitest.configs.events) {
                var checked = "checked";
                if (!uitest.configs.events[p]) {
                    checked = ""
                }

                html += ' <li><label><input value="' + p + '"  type="checkbox" ' + checked + ' />' + p + '</label></li>'
            }
            html += '</ul></li>';
            var e = D.create(html);

            configs.appendChild(e);
            var inputs = D.query("input", e);
            inputs.each(function (input) {
                E.on(input, "change", function (e) {
                        var t = e.target;
                        if (t.checked) {
                            uitest.configs.events[t.value] = 1
                            host.innerCall("supportConfig", ["events", t.value, 1])
                        }
                        else {
                            uitest.configs.events[t.value] = 0
                            host.innerCall("supportConfig", ["events", t.value, 0]);
                        }


                    }
                )

            })


        },
        caseTypeEvent   :function () {
            var host = this;
            E.delegate(".configs", "click", ".status", function (e) {
                var target = e.target;

                if (D.hasClass(target, "start")) {

                    host.innerCall("setConfig", ["caseType", "null"])
                    D.removeClass(target, "start");
                    return;
                }
                else {
                    var all = D.query(".status");
                    for (var i = 0; i < all.length; i++) {
                        D.removeClass(all[i], "start");
                    }

                    D.addClass(target, 'start');
                    caseTest = D.attr(target.parentNode, "class");
                    console.log(caseTest)
                    host.innerCall("setConfig", ["caseType", caseTest])

                }

            })

            E.delegate(".configs", "click", "h3", function (e) {

                var target = e.target.parentNode;
                console.log(target)
                D.toggleClass(target, "hide")


            })

        },

        layout:function () {
            KISSY.use("node, button, resizable", function (S, Node, Button, Resizable) {
                var r = new Resizable({
                    node    :".page",
                    // 指定可拖动的位置
                    handlers:["b"]


                });


            });
        },

        codeEditor    :function () {
            var editor = document.getElementById("test-case");
            var source = "";
            var textModel = new WebInspector.TextEditorModel();
            var textEditor = new WebInspector.TextViewer(textModel);
            editor.appendChild(textEditor.element)
            textEditor.readOnly = false;
            textEditor.mimeType = "text/javascript";
            textModel.setText(null, source);
            this.textEditor = textEditor

        },
        appendCaseCode:function (src) {

            this.textEditor.textModel.appendText(src)
            var lines = D.query(".webkit-line-content");
            var lastLines = lines[lines.length - 1];
            lastLines.scrollIntoView()

        },
        observeCall   :function () {
            var host = this;
            postmsg.bind(function (data) {
                console.log(data);
                if (data.funName && data.args) {
                    host[data.funName] && host[data.funName].apply(host, data.args)

                }
            })
        },
        innerCall     :function (funName, args) {
            console.log("innerCall", funName, args)
            postmsg.send({
                target:D.get("#iframe-target").contentWindow,
                data  :{funName:funName, args:args}
            })
        }



    }

    uitest.inner = {
        init              :function () {
            var host = this;
            this.observeCall();
            var warning = true;
            /*  window.onbeforeunload = function () {
             if (warning) {
             return '';
             }
             }
             */

        },
        runTestCase       :function (src) {
            eval('(' + src + ')');
            (function () {
                var jasmineEnv = jasmine.getEnv();
                jasmineEnv.updateInterval = 1000;

                var htmlReporter = new jasmine.HtmlReporter();

                jasmineEnv.addReporter(htmlReporter);

                jasmineEnv.specFilter = function (spec) {
                    return htmlReporter.specFilter(spec);
                };


                jasmineEnv.execute();


            })();


        },
        setConfig         :function (key, value) {
            uitest.configs[key] = value;
        },
        supportConfig     :function (name, key, value) {
            console.log(arguments)
            uitest.configs[name][key] = value;
            console.log(uitest.configs[name][key])
        },
        _getHasClassParent:function (node) {
            var parent = el.parentNode;

        },
        ///<body>
        // <div id="1">
        // <div>
        //   <a class ="13"></a>
        //     <div>
        //        <span><a class="13"></a><span>
        //     </div>
        //
        // </div>
        // <div></div>
        // </div>
        //</body>
        // #1 div:nth-of-type(1) div .13
        // #1 div div .13
        elToSelector      :function (el) {
            var selector = "";
            if (el.tagName.toLowerCase() === "body") {
                return "body"
            }

            if (el.id) {
                selector += "#" + el.id;
                return selector;
            }
            if (el.className) {
                for (var i = 0; i < el.classList.length; i++) {
                    selector = "." + el.classList[i];
                }
            }
            else {
                selector = el.tagName.toLowerCase();
            }


            var old;
            var p = el;

            while (true) {
                p = D.parent(p);
                var l = D.query(selector, p).length;
                if (l == 1) {
                    old = p;
                } else {
                    break;
                }

                if (p.tagName.toLowerCase() === "body") {
                    break;
                }
            }


            if (!old) {
                old = D.parent(el);
                var c = D.query(selector, old);
                for (var i = 0; i < c.length; i++) {
                    if (c[i] == el) {
                        break;
                    }
                }

                selector = this.elToSelector(old) + " " + selector + ":nth-of-type(" + (i + 1) + ")";

            }

            else {
                if(old.tagName.toLowerCase() =="body"){
                    selector = selector
                }
                else{
                    selector = this.elToSelector(old) + " " + selector;

                }
            }


            return selector;


        },
        observeCall       :function () {
            var host = this;
            postmsg.bind(function (data) {
                console.log("call", data)
                if (data.funName && data.args) {
                    host[data.funName] && host[data.funName].apply(host, data.args)

                }
            })
        },
        outterCall        :function (funName, args) {
            console.log("outtercall")
            postmsg.send({
                target:parent,
                data  :{funName:funName, args:args}
            })
        }
    }


})
    ();