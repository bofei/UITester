(function () {
    //重置setTimeout,setInterval
    // ajax等异步方法
    var S = KISSY, D = S.DOM, E = S.Event;
    var buildUrl = function () {

        var args = Array.prototype.slice.call(arguments);

        if (args.length < 2) {
            return args[0] || '';
        }

        var uri = args.shift();

        uri += uri.indexOf('?') > 0 ? '&' : '?';

        return uri + args.join('&').replace(/&+/g, '&');

    }

    window.uitest = {};
    uitest.jsonPath = function (obj, expr, arg) {
        var P = {
            resultType:arg && arg.resultType || "VALUE",
            result    :[],
            normalize :function (expr) {
                var subx = [];
                return expr.replace(/[\['](\??\(.*?\))[\]']/g, function ($0, $1) {
                    return "[#" + (subx.push($1) - 1) + "]";
                })
                    .replace(/'?\.'?|\['?/g, ";")
                    .replace(/;;;|;;/g, ";..;")
                    .replace(/;$|'?\]|'$/g, "")
                    .replace(/#([0-9]+)/g, function ($0, $1) {
                        return subx[$1];
                    });
            },
            asPath    :function (path) {
                var x = path.split(";"), p = "$";
                for (var i = 1, n = x.length; i < n; i++)
                    p += /^[0-9*]+$/.test(x[i]) ? ("[" + x[i] + "]") : ("['" + x[i] + "']");
                return p;
            },
            store     :function (p, v) {
                if (p) P.result[P.result.length] = P.resultType == "PATH" ? P.asPath(p) : v;
                return !!p;
            },
            trace     :function (expr, val, path) {
                if (expr) {
                    var x = expr.split(";"), loc = x.shift();
                    x = x.join(";");
                    if (val && val.hasOwnProperty(loc))
                        P.trace(x, val[loc], path + ";" + loc);
                    else if (loc === "*")
                        P.walk(loc, x, val, path, function (m, l, x, v, p) {
                            P.trace(m + ";" + x, v, p);
                        });
                    else if (loc === "..") {
                        P.trace(x, val, path);
                        P.walk(loc, x, val, path, function (m, l, x, v, p) {
                            typeof v[m] === "object" && P.trace("..;" + x, v[m], p + ";" + m);
                        });
                    }
                    else if (/,/.test(loc)) { // [name1,name2,...]
                        for (var s = loc.split(/'?,'?/), i = 0, n = s.length; i < n; i++)
                            P.trace(s[i] + ";" + x, val, path);
                    }
                    else if (/^\(.*?\)$/.test(loc)) // [(expr)]
                        P.trace(P.eval(loc, val, path.substr(path.lastIndexOf(";") + 1)) + ";" + x, val, path);
                    else if (/^\?\(.*?\)$/.test(loc)) // [?(expr)]
                        P.walk(loc, x, val, path, function (m, l, x, v, p) {
                            if (P.eval(l.replace(/^\?\((.*?)\)$/, "$1"), v[m], m)) P.trace(m + ";" + x, v, p);
                        });
                    else if (/^(-?[0-9]*):(-?[0-9]*):?([0-9]*)$/.test(loc)) // [start:end:step]  phyton slice syntax
                        P.slice(loc, x, val, path);
                }
                else
                    P.store(path, val);
            },
            walk      :function (loc, expr, val, path, f) {
                if (val instanceof Array) {
                    for (var i = 0, n = val.length; i < n; i++)
                        if (i in val)
                            f(i, loc, expr, val, path);
                }
                else if (typeof val === "object") {
                    for (var m in val)
                        if (val.hasOwnProperty(m))
                            f(m, loc, expr, val, path);
                }
            },
            slice     :function (loc, expr, val, path) {
                if (val instanceof Array) {
                    var len = val.length, start = 0, end = len, step = 1;
                    loc.replace(/^(-?[0-9]*):(-?[0-9]*):?(-?[0-9]*)$/g, function ($0, $1, $2, $3) {
                        start = parseInt($1 || start);
                        end = parseInt($2 || end);
                        step = parseInt($3 || step);
                    });
                    start = (start < 0) ? Math.max(0, start + len) : Math.min(len, start);
                    end = (end < 0) ? Math.max(0, end + len) : Math.min(len, end);
                    for (var i = start; i < end; i += step)
                        P.trace(i + ";" + expr, val, path);
                }
            },
            eval      :function (x, _v, _vname) {
                try {
                    return $ && _v && eval(x.replace(/@/g, "_v"));
                }
                catch (e) {
                    throw new SyntaxError("jsonPath: " + e.message + ": " + x.replace(/@/g, "_v").replace(/\^/g, "_a"));
                }
            }
        };

        var $ = obj;
        if (expr && obj && (P.resultType == "VALUE" || P.resultType == "PATH")) {
            P.trace(P.normalize(expr).replace(/^\$;/, ""), obj, "$");
            return P.result.length ? P.result : false;
        }
    }

    uitest.configs = {
        caseType:"null",
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
        tags    :{

        },
        attrs   :{
            "globalAttributes":{
                accesskey       :1,
                class           :1,
                contenteditable :1,
                contextmenu     :1,
                dir             :1,
                draggable       :1,
                dropzone        :1,
                hidden          :1,
                id              :1,
                inert           :1,
                itemid          :1,
                itemprop        :1,
                itemref         :1,
                itemscope       :1,
                itemtype        :1,
                lang            :1,
                spellcheck      :1,
                style           :1,
                tabindex        :1,
                title           :1,
                translate       :1,
                customAttributes:1


            },
            "eventAttributes" :{
                onabort         :1,
                onblur          :1,
                oncancel        :1,
                oncanplay       :1,
                oncanplaythrough:1,
                onchange        :1,
                onclick         :1,
                onclose         :1,
                oncontextmenu   :1,
                oncuechange     :1,
                ondblclick      :1,
                ondrag          :1,
                ondragend       :1,
                ondragenter     :1,
                ondragleave     :1,
                ondragover      :1,
                ondragstart     :1,
                ondrop          :1,
                ondurationchange:1,
                onemptied       :1,
                onended         :1,
                onerror         :1,
                onfocus         :1,
                oninput         :1,
                oninvalid       :1,
                onkeydown       :1,
                onkeypress      :1,
                onkeyup         :1,
                onload          :1,
                onloadeddata    :1,
                onloadedmetadata:1,
                onloadstart     :1,
                onmousedown     :1,
                onmousemove     :1,
                onmouseout      :1,
                onmouseover     :1,
                onmouseup       :1,
                onmousewheel    :1,
                onpause         :1,
                onplay          :1,
                onplaying       :1,
                onprogress      :1,
                onratechange    :1,
                onreset         :1,
                onscroll        :1,
                onseeked        :1,
                onseeking       :1,
                onselect        :1,
                onshow          :1,
                onstalled       :1,
                onsubmit        :1,
                onsuspend       :1,
                ontimeupdate    :1,
                onvolumechange  :1,
                onwaiting       :1

            },

            a       :{
                href    :1,
                target  :1,
                download:1,
                ping    :1,
                rel     :1,
                media   :1,
                hreflang:1,
                type    :1
            },
            link    :{
                href    :1,
                rel     :1,
                media   :1,
                hreflang:1,
                type    :1,
                sizes   :1
            },
            img     :{
                alt        :1,
                src        :1,
                srcset     :1,
                crossorigin:1,
                usemap     :1,
                ismap      :1,
                width      :1,
                height     :1
            },
            script  :{
                src    :1,
                async  :1,
                defer  :1,
                type   :1,
                charset:1
            },
            input   :{
                accept        :1,
                alt           :1,
                autocomplete  :1,
                autofocus     :1,
                checked       :1,
                dirname       :1,
                disabled      :1,
                form          :1,
                formaction    :1,
                formenctype   :1,
                formmethod    :1,
                formnovalidate:1,
                formtarget    :1,
                height        :1,
                list          :1,
                max           :1,
                maxlength     :1,
                min           :1,
                multiple      :1,
                name          :1,
                pattern       :1,
                placeholder   :1,
                readonly      :1,
                required      :1,
                size          :1,
                src           :1,
                step          :1,
                type          :1,
                value         :1,
                width         :1
            },
            textarea:{
                autofocus  :1,
                cols       :1,
                dirname    :1,
                disabled   :1,
                form       :1,
                maxlength  :1,
                name       :1,
                placeholder:1,
                readonly   :1,
                required   :1,
                rows       :1,
                wrap       :1
            },
            select  :{
                autofocus:1,
                disabled :1,
                form     :1,
                multiple :1,
                name     :1,
                required :1,
                size     :1
            },
            options :{
                disabled:1,
                label   :1,
                selected:1,
                value   :1

            }

        }
    }

    uitest.outter = {
        init    :function () {
            var host = this;
            this.initPage();
            this.observeCall();
            this.codeEditor();
            this.layout();
            this.initTabs();
            this.caseTypeEvent();
            this.tagsConfigsView();
            this.positionConfigsView();
            // this.centerConfigsView();
            //this.styleConfigsView();
            this.innerHTMLConfigsView();
            //   this.subTreeConfigsView();

            this.attrConfigsView();
            this.eventConfigsView();
            this.runTestCaseEvent()
            this.createEventTest();
            // this.initForm();


        },
        initForm:function () {


        },
        initPage:function () {


            // http://uitest.taobao.net/UITester/tool/query.php?task_id=7

            var idEl = D.get("#task_id");
            var nameEl = D.get("#task_name");
            var task_target_url = D.get("#task_target_uri");
            var iframe = D.get("#iframe-target");


            S.io.getJSON("http://uitest.taobao.net/UITester/tool/query.php", {task_id:location.hash}, function (result) {
                idEl.value = result.id;
                nameEl.value = result.task_name;
                task_target_url.value = buildUrl(result.task_target_url, "inject-type=record&__TEST__");

                iframe.src = task_target_url.value;

            })


            var host = this;
            E.on(".show-login", "click", function () {
                var t = D.get(".login-info");

                if (t.style.display === "none") {
                    t.style.display = "inline"
                }
                else {
                    t.style.display = "none"
                }
            })

            E.on("#save-test", "click", function () {
                D.get("#task_script").value = host.textEditor.textModel.text;
                D.get('#save-form').submit();
            })

            E.on("#reload", "click", function () {
                E.detach(iframe, "load");
                iframe.src = buildUrl(result.task_target_url, "inject-type=record&__TEST__");
            })


        },

        initTabs           :function () {
            this.codeTabs = new S.Tabs('.tabs', {
                // aria:false 默认 true，支持 aria
                switchTo   :0,
                triggerType:"click"
            });
        },
        showResult         :function (result) {
            this.codeTabs.switchTo(1);
            var div = this.codeTabs.panels[1];
            div.innerHTML = JSON.stringify(result)
        },
        runTestCaseEvent   :function () {
            var host = this;
            E.on(".run-test", "click", function (e) {
                var iframe = D.get("#iframe-target");
                E.detach(iframe, "load");
                E.on(iframe, "load", function () {
                    console.log(e)
                    window.setTimeout(function () {
                        host.innerCall("runTestCase", [host.textEditor.textModel.text])
                    }, 2000)
                })

                iframe.src = iframe.src;


            })
        },
        showCreateBtn      :function () {
            D.get(".has-test-case").style.display = "inline-block"
        },
        hideCreateBtn      :function () {
            D.get(".has-test-case").style.display = "none"
        },
        createEventTest    :function () {
            var host = this;
            E.on(".create-test", "click", function () {
                host.innerCall("createEventTypeTestCase")

            })
            E.on(".cancel-test", "click", function () {
                host.innerCall("removeEventTypeTestCase")

            })


        },
        eventConfigsView   :function () {
            var host = this;
            var configs = D.get(".configs");
            var html = '<li class="cfg-item hide"><h3 class="tag" title="交互动作测试用例" data-type="event">事件<a class="status">记录</a></h3><ul>';

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
        tagsConfigsView    :function () {
            var host = this;
            var configs = D.get(".configs");
            var html = '<li class="cfg-item hide"><h3 class="event" title="标签存在测试用例" data-type="tags">标签<a class="status">记录</a></h3><ul>';

            for (var p in uitest.configs.tags) {
                var checked = "checked";
                if (!uitest.configs.events[p]) {
                    checked = ""
                }

                html += ' <li><label><input value="' + p + '"  type="checkbox" ' + checked + ' />' + p + '</label></li>'
            }
            html += '</ul></li>';
            var e = D.create(html);

            configs.appendChild(e);


        },
        positionConfigsView:function () {
            var host = this;
            var configs = D.get(".configs");
            var html = '<li class="cfg-item hide"><h3 class="" title="坐标位置测试用例" data-type="position">位置<a class="status">记录</a></h3><ul>';

            for (var p in uitest.configs.tags) {
                var checked = "checked";
                if (!uitest.configs.events[p]) {
                    checked = ""
                }

                html += ' <li><label><input value="' + p + '"  type="checkbox" ' + checked + ' />' + p + '</label></li>'
            }
            html += '</ul></li>';
            var e = D.create(html);

            configs.appendChild(e);


        },

        centerConfigsView   :function () {
            var host = this;
            var configs = D.get(".configs");
            var html = '<li class="cfg-item hide"><h3 class="" title="位置居中测试用例" data-type="center">居中<a class="status">记录</a></h3><ul>';

            for (var p in uitest.configs.tags) {
                var checked = "checked";
                if (!uitest.configs.events[p]) {
                    checked = ""
                }

                html += ' <li><label><input value="' + p + '"  type="checkbox" ' + checked + ' />' + p + '</label></li>'
            }
            html += '</ul></li>';
            var e = D.create(html);

            configs.appendChild(e);

        },
        styleConfigsView    :function () {
            var host = this;
            var configs = D.get(".configs");
            var html = '<li class="cfg-item hide"><h3 class="" title="样式测试用例" data-type="style">样式<a class="status">记录</a></h3><ul>';

            for (var p in uitest.configs.tags) {
                var checked = "checked";
                if (!uitest.configs.events[p]) {
                    checked = ""
                }

                html += ' <li><label><input value="' + p + '"  type="checkbox" ' + checked + ' />' + p + '</label></li>'
            }
            html += '</ul></li>';
            var e = D.create(html);

            configs.appendChild(e);


        },
        innerHTMLConfigsView:function () {
            var host = this;
            var configs = D.get(".configs");
            var html = '<li class="cfg-item hide"><h3 class="" title="innerHTML测试用例" data-type="innerhtml">内容<a class="status">记录</a></h3><ul>';

            for (var p in uitest.configs.tags) {
                var checked = "checked";
                if (!uitest.configs.events[p]) {
                    checked = ""
                }

                html += ' <li><label><input value="' + p + '"  type="checkbox" ' + checked + ' />' + p + '</label></li>'
            }
            html += '</ul></li>';
            var e = D.create(html);

            configs.appendChild(e);


        },
        subTreeConfigsView  :function () {
            var host = this;
            var configs = D.get(".configs");
            var html = '<li class="cfg-item hide"><h3 class="" title="dom树结构测试用例" data-type="subtree">结构<a class="status">记录</a></h3><ul>';

            for (var p in uitest.configs.tags) {
                var checked = "checked";
                if (!uitest.configs.events[p]) {
                    checked = ""
                }

                html += ' <li><label><input value="' + p + '"  type="checkbox" ' + checked + ' />' + p + '</label></li>'
            }
            html += '</ul></li>';
            var e = D.create(html);

            configs.appendChild(e);


        },
        attrConfigsView     :function () {
            var host = this;
            var configs = D.get(".configs");


            var html = '<li class="cfg-item hide"><h3 class="event" title="标签属性测试用例" data-type="attr">属性<a class="status">记录</a></h3><ul>' +
                '{{#each attrs as bValue bKey}}' +
                '<li class="{{bKey}}"><label><input   type="checkbox" checked /> {{bKey}}</label><ul>' +
                '{{#each bValue as value key}}' +
                '<li class="attr {{key}}"><label><input value="{{value}}" name="uitest.configs.{{bKey}}.{{key}}" type="checkbox" checked/>{{key}}</label></li>' +
                '{{/each}}' +
                '</ul>' +
                '{{/each}}' +
                '</ul></li>';

            KISSY.use("template", function (S, Template) {
                html = Template(html).render(uitest.configs);
                var e = D.create(html);

                configs.appendChild(e);

            });


        },
        caseTypeEvent       :function () {
            var host = this;
            E.delegate(".configs", "click", "h3", function (e) {
                var target = e.target;
                if (e.target.tagName.toLowerCase() !== "h3")   return;


                if (D.hasClass(target, "active")) {

                    host.innerCall("setConfig", ["caseType", "null"])
                    D.removeClass(target, "active");
                    return;
                }
                else {
                    var all = D.query("h3", ".configs");
                    for (var i = 0; i < all.length; i++) {
                        D.removeClass(all[i], "active");
                    }

                    D.addClass(target, 'active');
                    caseTest = D.attr(target, "data-type");

                    host.innerCall("setConfig", ["caseType", caseTest])

                }

            })

            E.delegate(".configs", "click", ".status", function (e) {
                e.halt();

                var target = D.parent(e.target, "li")
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
                console.log("outter obsevecall", data)
                if (data.funName && data.args) {
                    host[data.funName] && host[data.funName].apply(host, data.args)

                }
            })
        },
        innerCall     :function (funName, args) {
            args = args || [];
            console.log("innerCall", funName, args)
            postmsg.send({
                target:D.get("#iframe-target").contentWindow,
                data  :{funName:funName, args:args}
            })
        }



    }

    uitest.inner = {
        init     :function () {

            var host = this;
            this.initProxy();
            this.observeCall();
            this.selectorChangeEvent();
            var warning = true;
            /*window.onbeforeunload = function () {
             if (warning) {
             return '';
             }
             }
             */


        },
        initProxy:function () {
            var realAdd = window.Node.prototype.addEventListener;
            window.Node.prototype.addEventListener = function () {
                if (arguments[3]) {
                    realAdd.apply(this, arguments)
                }
                else {
                    this._bindEventType = this._bindEventType || {};
                    this._bindEventType[arguments[0]] = 1;
                    realAdd.apply(this, arguments)
                }

            }
        },

        createEventTestCase:function () {

        },
        runTestCase        :function (src) {
            var host = this;
            eval(src);
            (function () {
                var jasmineEnv = jasmine.getEnv();
                jasmineEnv.updateInterval = 1000;

                /*  var htmlReporter = new jasmine.HtmlReporter();

                 jasmineEnv.addReporter(htmlReporter);

                 jasmineEnv.specFilter = function (spec) {
                 return htmlReporter.specFilter(spec);
                 };
                 */
                var htmlReporter = new jasmine.JsonReporter(function (json) {
                    console.log(json)
                    host.outterCall("showResult", [json]);
                });

                jasmineEnv.addReporter(htmlReporter);


                jasmineEnv.execute();


            })();


        },
        setConfig          :function (key, value) {
            uitest.configs[key] = value;
        },
        supportConfig      :function (name, key, value) {
            console.log(arguments)
            uitest.configs[name][key] = value;
            console.log(uitest.configs[name][key])
        },
        _getHasClassParent :function (node) {
            var parent = el.parentNode;

        },

        elToSelector              :function (el) {
            if (!el)return;
            var selector = "";
            if (el.tagName.toLowerCase() === "body") {
                return "body"
            }
            if (el.tagName.toLowerCase() === "html") {
                return "html"
            }
            if (el.tagName.toLowerCase() === "head") {
                return "head"
            }

            if (el.id && !/\d/.test(el.id) && el._break !== "id") {
                selector += "#" + el.id;
                return selector;
            }
            if (el.className && !/\d/.test(el.className) && el._break !== "class") {

                selector = "." + el.classList[0];

            }
            else {
                selector = el.tagName.toLowerCase();
            }

            //可能已经被删除
            if (!D.parent(el))return selector;


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
                if (old.tagName.toLowerCase() == "body") {
                    selector = selector
                }
                else {
                    selector = this.elToSelector(old) + " " + selector;

                }
            }


            return selector;


        },
        elToSelectorRelativeParent:function (el) {
            if (!el)return;
            var selector = "";
            if (el.tagName.toLowerCase() === "body") {
                return "body"
            }
            if (el.tagName.toLowerCase() === "html") {
                return "html"
            }
            if (el.tagName.toLowerCase() === "head") {
                return "head"
            }

            if (el.id && !/\d/.test(el.id) && el._break !== "id") {
                selector += "#" + el.id;
                return selector;
            }
            if (el.className && !/\d/.test(el.className) && el._break !== "class") {

                selector = "." + el.classList[0];

            }
            else {
                selector = el.tagName.toLowerCase();
            }

            return selector;


        },
        selectorChangeEvent       :function () {
            var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;


            var observer = new MutationObserver(function (mutations) {


                uitest.inner.hasSelectorChange(mutations);


            });

            observer.observe(document, {
                attributes:true,


                subtree:true

            });

        },

        hasSelectorChange:function (mutations) {
            for (var i = 0; i < mutations.length; i++) {

                if (mutations[i].type == "attributes" || mutations[i].attributeName === "id" || mutations[i].attributeName === "class") {


                    mutations[i].target._break = mutations[i].attributeName;
                }
            }

        },
        observeCall      :function () {
            var host = this;

            postmsg.bind(function (data) {
                console.log("innercall obsevecall", data)

                if (data.funName && data.args) {
                    host[data.funName] && host[data.funName].apply(host, data.args)

                }
            })
        },
        outterCall       :function (funName, args) {
            console.log("outtercall")
            args = args || [];
            postmsg.send({
                target:parent,
                data  :{funName:funName, args:args}
            })
        }
    }


})
    ();