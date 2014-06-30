var util = require("util");
var EventEmitter = require("events").EventEmitter;

var Pagelet = module.exports = function Pagelet(obj) {
    this.model = obj.model;
    this.alias = obj['for'];
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

            self.destroyed || self._render(val);
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
    var self = this;
    var output;

    model && (locals['model'] = model);

    this._yog = locals._yog = locals._yog.fork();
    
    // hook sub pagelet render.
    // make that render after this pagelet render.
    var origin = locals._yog.addPagelet;
    var subpagelets = [];

    self.onReady = function() {
        subpagelets.forEach(function(args) {
            origin.apply(locals._yog, args);
        });
        locals._yog.addPagelet = origin;
        locals = self = origin = null;
    };

    locals._yog.addPagelet = function() {
        subpagelets.push(arguments);
    };

    output = fn(locals);
    this.analyse(output);
};

Pagelet.prototype.analyse = function(output) {
    var yog = this._yog;
    var scripts = this.scripts;
    var js = this.js;
    var css = this.css;
    var styles = this.styles;
    var yogScripts = yog.getScripts();
    var yogStyles = yog.getStyles();
    var p;

    // 收集js, css, html
    if(yog.getResourceMap()) {
        scripts.push('require.resourceMap(' + JSON.stringify(this.getResourceMap()) + ');');
    }

    styles.push.apply(styles, yogStyles.embed);

    output = output.replace(/<script[^>]*?>([\s\S]+?)<\/script>/ig, function(_, content) {
        scripts.push(content);
        return '';
    }).replace(/<style[^>]*?>([\s\S]+?)<\/style>/ig, function(_, content) {
        styles.push(content);
        return '';
    });
    scripts.push.apply(scripts, yogScripts.embed);
    
    yogScripts.urls && (js = this.js = yogScripts.urls.concat());
    yogStyles.urls && (css = this.css = yogStyles.urls.concat());

    this.html = output;
    this.state = status.fulfilled;
    this.emit('ready', this);
    this.onReady && this.onReady();
};

Pagelet.prototype.toJson = function() {
    return {
        container: this.alias || '',
        id: this.id,
        html: this.html,
        js: this.js,
        css: this.css,
        styles: this.styles,
        scripts: this.scripts
    };
}

Pagelet.prototype.destroy = function() {
    this.destroyed = true;
    this.removeAllListeners();
    this._yog = this.mode = this.id = this.locals =  this.compiled =  this.state = this.html = null;
    this.scripts = this.js = this.css = this.styles = null;
}