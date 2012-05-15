/*基于KISSY 1.2*/

var S = KISSY;
    $ = S.all;
function checkVersion (){
    if(S.version !== '1.20'){
        new Error("请引入kissy 1.2");
        return false;
    }else{
        return true;
    }
}


beforeEach(function(){
    if(!checkVersion()){
        return ;
    }

    this.addMatchers({
        // this.actual {htmlNode}

        hasClass:function(expectClassName){

            return $(this.actual).hasClass(expectClassName);


        },
        // 新增了一个节点
        // spec 里面加一个record属性
        toHaveAppendChild:function(selector,expectNum){
           if(!this.record){
               jasmine.record(this.actual);
               this.spec.matcherArr = [];
               this.spec.matcherArr.pus(arguments.callee)
           }
           if(arguments[1]&&typeof arguments[1] == 'number'){
               var expectNum = expectNum;
           }else{
               var expectNum = 1;
           }

            var recordNode = $(this.record);
            var actualNode = $(this.actual);
            if(!recordNode || !actualNode) {
                return false;
            }
            var actualChildren = $(selector,actualNode);
            var recordChildren = $(selector,recordNode);

           if(recordChildren.length + expectNum == actualChildren.length ){

               return true;
           }
           return false;
        }
    })
}) ;
