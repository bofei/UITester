(function () {
    //重置setTimeout,setInterval
    // ajax等异步方法
    var S = KISSY, D = S.DOM, E = S.Event;
    window.caseType = "event";
    window.start = false;
    window.showMsg = function (msg) {
        postmsg.send({
            target:parent,
            data  :{caseCode:msg}
        })
    }


    window.elToSelector = function (el) {
        var selector = el.tagName;
        if (el.id) {
            selector += "#" + el.id;
        }
        if (el.className) {
            var classNameArray = el.className.split(" ");
            for (var p in classNameArray) {
                selector += "." + classNameArray[p]
            }
        }
        return selector
    }

    postmsg.bind(function (data) {
        console.log(data)
        if (data.set) {
            window.caseType = data.set.caseType || window.caseType
            window.start = data.set.start===undefined? window.start:data.set.start
        }
        console.log(window.start);
    })


})();