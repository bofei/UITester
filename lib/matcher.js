/*基于KISSY 1.2*/
//KISSY.use('dom,sizzle',function(){


var S = KISSY,
    $ = S.all;
function supportCheck(){
    var container,table, td,  conMarginTop, style, positionTopLeftWidthHeight,
        paddingMarginBorderVisibility, paddingMarginBorder,
        body = document.getElementsByTagName("body")[0];

    if ( !body ) {
        // Return for frameset docs that don't have a body
        return;
    }

    conMarginTop = 1;
    paddingMarginBorder = "padding:0;margin:0;border:";
    positionTopLeftWidthHeight = "position:absolute;top:0;left:0;width:1px;height:1px;";
    paddingMarginBorderVisibility = paddingMarginBorder + "0;visibility:hidden;";
    style = "style='" + positionTopLeftWidthHeight + paddingMarginBorder + "5px solid #000;";


    container = document.createElement("div");
    container.style.cssText = paddingMarginBorderVisibility + "width:0;height:0;position:static;top:0;margin-top:" + conMarginTop + "px";
    body.insertBefore( container, body.firstChild );

    // Construct the test element
   var  div = document.createElement("div");
    container.appendChild( div );

    // Check if table cells still have offsetWidth/Height when they are set
    // to display:none and there are still other visible table cells in a
    // table row; if so, offsetWidth/Height are not reliable for use when
    // determining if an element has been hidden directly using
    // display:none (it is still safe to use offsets if a parent element is
    // hidden; don safety goggles and see bug #4512 for more information).
    // (only IE 8 fails this test)
    div.innerHTML = "<table><tr><td style='" + paddingMarginBorder + "0;display:none'></td><td>t</td></tr></table>";
    var  tds = div.getElementsByTagName( "td" );
    var isSupported = ( tds[ 0 ].offsetHeight === 0 );

    tds[ 0 ].style.display = "";
    tds[ 1 ].style.display = "none";

    // Check if empty table cells still have offsetWidth/Height
    // (IE <= 8 fail this test)

    return reliableHiddenOffsets = isSupported && ( tds[ 0 ].offsetHeight === 0 );
};
var reliableHiddenOffsets = supportCheck();
function isHidden(elem){
    var width = elem.offsetWidth,
        height = elem.offsetHeight;

    return ( width === 0 && height === 0 ) || (!reliableHiddenOffsets && ((elem.style && elem.style.display) || S.DOM.css( elem, "display" )) === "none");
}

function isVisible(elem){
    return !isHidden(elem);
}

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

    var uiMatchers = {
        // kissy 1.2 node.hasClass
        toHaveClass: function(className) {
            var nodeList = $(this.actual);
            var result = true;
            for(var i = 0;nodeList[i];i++){
                if(!nodeList.item(i).hasClass(className)){
                    result = false;
                    break;
                }
            }
            return result;
        },
        // 获取元素是否可见
        toBeVisible: function() {
            var nodeList = $(this.actual);
            return isVisible(nodeList[0]);
        },

        toBeHidden: function() {

            var nodeList = $(this.actual);
           return isHidden(nodeList[0]);
        },

        toBeSelected: function() {
            var nodeList = $(this.actual);
            return nodeList.filter(':selected').length == nodeList.length;
        },

        toBeChecked: function() {

            var nodeList = $(this.actual);
            return nodeList.filter(':checked').length == nodeList.length;
        },

        toBeEmpty: function() {
            var nodeList = $(this.actual);
            return nodeList.filter(':empty').length == nodeList.length;

        },

        toExist: function() {
            var nodeList = $(this.actual);
            return nodeList.length;
        },
        // 有属性attributeName 且为  expectedAttributeValue
        toHaveAttr: function(attributeName, expectedAttributeValue) {
            var nodeList = $(this.actual);
             var result = true;
            for(var i = 0;nodeList[i];i++){
                if(nodeList.item(i).attr(attributeName) != expectedAttributeValue ) {
                    result = false;
                    break;
                }
            }
            return result;

        },

        toHaveProp: function(propertyName, expectedPropertyValue) {
            var nodeList = $(this.actual);
            var result = true;
            for(var i = 0;nodeList[i];i++){
                if(nodeList.item(i).prop(propertyName) != expectedPropertyValue ) {
                    result = false;
                    break;
                }
            }
            return result;

        },

        toHaveId: function(id) {
            var nodeList = $(this.actual);
            return nodeList.item(0).attr('id') == id;
        },

        toHaveHtml: function(html) {
            var nodeList = $(this.actual);
            return S.trim(nodeList.item(0).html()) == S.trim(html);
        },

        toHaveText: function(text) {
            var nodeList = $(this.actual);
            var trimmedText = S.trim(nodeList.item(0).text());
            if (text && S.isFunction(text.test)) {
                return text.test(trimmedText);
            } else {
                return trimmedText == text;
            }
        },

        toHaveValue: function(value) {
            var nodeList = $(this.actual);
            var result = true;
            for(var i = 0;nodeList[i];i++){
                if(nodeList.item(i).val() != value ) {
                    result = false;
                    break;
                }
            }
            return result;



        },


        toBe: function(selector) {
            var nodeList = $(this.actual);
            return nodeList.filter(selector).length;
        },

        toContain: function(selector) {
            return $(selector,this.actual).length;
        },

        toBeDisabled: function(selector){
            var nodeList = $(this.actual);
            return nodeList.filter(':disabled').length == nodeList.length;
        },

        toBeFocused: function(selector) {
            var nodeList = $(this.actual);
            return nodeList.filter(':focus').length == nodeList.length;
        }
        // css 属性判断

        // 元素位置

    };


    this.addMatchers(uiMatchers);
}) ;
//});