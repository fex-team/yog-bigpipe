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