var _ = module.exports = {};

_.mixin = function mixin(a, b) {
    if (a && b) {
        for (var key in b) {
            a[key] = b[key];
        }
    }
    return a;
};

_.ucfirst = function (str) {
    return str.substring(0, 1).toUpperCase() + str.substring(1);
};

_.tpl = function(str, locals) {
    var code = "var p=[];" +

        "p.push('" +

        // Convert the template into pure JavaScript
        str
            .replace(/[\r\t\n]/g, " ")
            .split("<%").join("\t")
            .replace(/((^|%>)[^\t]*)'/g, "$1\r")
            .replace(/\t=(.*?)%>/g, "',$1,'")
            .split("\t").join("');")
            .split("%>").join("p.push('")
            .split("\r").join("\\'") +

        "');return p.join('');";

    var fn = new Function(code);

    return locals ? fn.call(locals) : fn;
};