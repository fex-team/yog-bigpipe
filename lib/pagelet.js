var util = require("util");
var EventEmitter = require("events").EventEmitter;

var Pagelet = module.exports = function Pagelet(obj) {
    this.mode = obj.mode;
    this.id = obj.id;
    this.locals = obj.locals;
    this.compiled = obj.compiled;
    this.state = status.pending;
    this.scripts = [];
    this.js = [];
    this.css = [];
    this.styles = [];
    this.html = '';
};

util.inherits(Pagelet, EventEmitter);

var status = Pagelet.status = {
    pending: 'pending',
    rendering: 'rendering',
    fulfilled: 'fulfilled'
};

Pagelet.mode = {
    pipeline: 'pipeline',
    async: 'async',
    quickling: 'quickling'
};


Pagelet.prototype.setSource = function(source) {
    this.source = source;
};

Pagelet.prototype.render = function() {
    var source = this.source;
    var self = this;

    this.state = status.rendering;

    if (typeof source === 'function') {
        source.call(null, function(err, val) {
            if (err) {
                self.emit('error', err);
                return;
            }

            self._render(val);
        });
    } else if (typeof source ==='string' && source) {
        // todo 自动创建 model 与之关联
    } else {
        this._render();
    }
};

Pagelet.prototype._render = function(model) {
    var locals = this.locals;
    var fn = this.compiled;
    var _yog = locals._yog;
    var self = this;
    var output;

    model && (locals['model'] = model);

    this.fis = _yog.fis.fork();
    locals._yog = _yog.fork(this.fis, locals._yog.bigpipe);
    var origin = locals._yog.addPagelet;
    locals._yog.addPagelet = function() {
        var args = arguments;
        var me = this;
        self.once('ready', function() {
            origin.apply(me, args);
        });
    };

    output = fn(locals);
    this.analyse(output);
};

Pagelet.prototype.analyse = function(output) {
    var fis = this.fis;
    var scripts = this.scripts;
    var js = this.js;
    var css = this.css;
    var styles = this.styles;
    var p;

    // 收集js, css, html
    if(fis.getResourceMap()) {
        scripts.push('require.resourceMap(' + JSON.stringify(this.getResourceMap()) + ');');
    }

    styles.splice.apply(styles, [styles.length, 0].concat(fis.styles));
    output = output.replace(/<script[^>]*?>([\s\S]+?)<\/script>/ig, function(_, content) {
        scripts.push(content);
        return '';
    }).replace(/<style[^>]*?>([\s\S]+?)<\/style>/ig, function(_, content) {
        styles.push(content);
        return '';
    });
    scripts.splice.apply(scripts, [scripts.length, 0].concat(fis.scripts));
    fis.sync['js'] && (js = fis.sync['js'].concat());
    fis.sync['css'] && (css = fis.sync['css'].concat());

    this.html = output;
    this.state = status.fulfilled;
    this.emit('ready', this);
};

Pagelet.prototype.toJson = function() {
    return {
        id: this.id,
        html: this.html,
        js: this.js,
        css: this.css,
        styles: this.styles,
        scripts: this.scripts
    };
}