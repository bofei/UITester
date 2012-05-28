(function () {
    var
        win = window,
        lastMsg = "",
        funs = [],
        timer,
        sendQueue = [],
        queueTimer;

    var windowName = {
        send:function (options) {
            var target = options.target,
                msg = options.data;
            /**每隔410秒发送一次消息， 防止消息遗漏*/
            sendQueue.push({msg:msg, target:target});
            if (!queueTimer) {
                queueTimer = window.setInterval(function () {
                    if (sendQueue.length > 0) {
                        var sendObject = sendQueue.shift()
                        sendObject.target.name = KISSY.JSON.stringify(sendObject.msg);
                    }

                }, 210)
            }
        },
        bind:function (fun) {
            funs.push(fun);
            if (!timer) {
                timer = setInterval(function () {

                    var msg = window.name;
                    if (msg != lastMsg) {

                        lastMsg = msg;

                        for (var i = 0; i < funs.length; i++) {
                            funs[i](KISSY.JSON.parse(msg));
                        }


                    }
                }, 100);
            }
        }
    }


    win.postmsg = {

        send:function (options) {

            var target = options.target;
            if (!options.target) {

                return;
            }
            var msg = options.data;


            if (("postMessage" in target)) {

                target.postMessage(KISSY.JSON.stringify(msg), options.origin || '*');
            }
            else {


                windowName.send(options);
            }
        },
        bind:function (fun) {
            if (win.postMessage) {
                if (win.addEventListener) {
                    win.addEventListener("message", function (e) {
                        fun.apply(win, [KISSY.JSON.parse(e.data), e]);
                    }, false);
                } else if (win.attachEvent) {
                    win.attachEvent("onmessage", function (e) {
                        fun.apply(win, [KISSY.JSON.parse(e.data), e]);
                    });
                }
            }
            else {
                windowName.bind(fun);
            }


        }
    };
})();