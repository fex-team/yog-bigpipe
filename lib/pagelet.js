var util = require("util");
var EventEmitter = require("events").EventEmitter;
var _ = require('./util.js');
var Promise = require('bluebird');

var Pagelet = module.exports = function Pagelet(obj) {

    this.model = obj.model;
    this.container = obj['container'] || obj['for'];
    this.mode = obj.mode;
    this.id = obj.id;
    this.locals = obj.locals;
    this.compiled = obj.compiled;
    this.reqID = obj.reqID;
    this.skipAnalysis = obj.skipAnalysis;

    this.state = status.pending;
    this.scripts = [];
    this.styles = [];
    this.js = [];
    this.css = [];
    this.html = '';
};

util.inherits(Pagelet, EventEmitter);


// Status Spec.
//
// - `pending` just initialized.
// - `rendering` start rendered but not yet finished.
// - `fulfilled` render finish.
// - `failed` render failed.
var status = Pagelet.status = {
    pending: 'pending',
    rendering: 'rendering',
    fulfilled: 'fulfilled',
    failed: 'failed'
};

// Mode Spec
//
// - `async` 忽略顺序，谁先准备好，谁先输出
// - `pipeline` 按顺序输出，以入库的顺序为准。
// - `quickling` 此类 pagelet 并不是 chunk 输出，而是第二次请求的时候输出。
Pagelet.mode = {
    async: 'async',
    pipeline: 'pipeline',
    quickling: 'quickling'
};

/**
 * 开始渲染 pagelet, 可以指定一个 provider 即数据准备回调。
 *
 * 回调中，第一个参数为状态 error，第二个参数才为数据 data。
 * @example
 *
 * ```javascript
 * pagelet.start(function(done) {
 *     var model = new RemoteModel();
 *
 *     model.fetch(function(err, val) {
 *         done(err, val);
 *     });
 * });
 * ```
 *
 * @method start
 * @param  {Function} provider 数据提供者
 * @return {Undefined}
 */
Pagelet.prototype.start = function (provider, sync) {
    var self = this;

    if (this.state !== status.pending) {
        return this.emit('error', new Error('Alreay rendered.'));
    }

    this.emit('before');

    // mark the state.
    this.state = status.rendering;

    if (sync) {
        return self._render(provider);
    }
    if (provider) {
        provider().then(function (data) {
            self._render(data);
        }).catch(function (err) {
            self._render({
                BigPipeFailed: true,
                err: err
            });
        });
    }
    else {
        self._render();
    }
};


// don't call this directly.
Pagelet.prototype._render = function (model) {
    var self = this;
    if (self.destroyed) {
        return;
    }
    var locals = this.locals || {};
    var fn = this.compiled;
    var output;

    model && (_.mixin(locals, model), locals.model = model);

    this.emit('render:before', locals, fn);

    try {
        output = fn(locals);
    }
    catch (error) {
        return this.emit('error', error);
    }

    this.emit('render:after', locals, fn);

    this.emit('analyse:before', output);
    if (!this.skipAnalysis) {
        this._analyse(output || '');
    }
    else {
        this.html = output;
    }
    this.emit('analyse:after', output);

    this.state = status.fulfilled;
    this.emit('after');
};

/**
 * 解析 html 结果，收集 script, style, js, css.
 */
Pagelet.prototype._analyse = function (output) {
    var scripts = this.scripts;
    var styles = this.styles;
    var js = this.js;
    var css = this.css;

    this.html = output

    // 收集内联或者外链 js
        .replace(/<script([^>]*?)>([\s\S]+?)<\/script>/ig, function (_, attr, content) {
        var m = /src=('|")(.*?)\1/i.exec(attr);

        if (m) {
            js.push(m[2]);
        }
        else {
            scripts.push(content);
        }

        return '';
    })

    // 收集内联样式
    .replace(/<style[^>]*?>([\s\S]+?)<\/style>/ig, function (_, content) {
        styles.push(content);
        return '';
    })

    // 收集外链样式。
    .replace(/<link(.*?)\/>/ig, function (_, attr) {
        var m = /href=('|")(.*?)\1/i.exec(attr);

        if (m) {
            css.push(m[2]);
            return '';
        }

        return _;
    });
};

/**
 * 添加内联样式。
 * @method addStyle
 * @param {String | Array of String} style 样式内容
 */
Pagelet.prototype.addStyle = Pagelet.prototype.addStyles = function (style) {
    style = Array.isArray(style) ? style : [style];

    this.styles.push.apply(this.styles, style);
};

/**
 * 添加内联脚本。
 * @method addScript
 * @param {String | Array of String} script 脚本内容。
 */
Pagelet.prototype.addScript = Pagelet.prototype.addScripts = function (script) {
    script = Array.isArray(script) ? script : [script];

    this.scripts.push.apply(this.scripts, script);
};

/**
 * 添加脚本。
 * @method addJs
 * @param {String | Array of String} js 脚本地址。
 */
Pagelet.prototype.addJs = Pagelet.prototype.addJses = function (js) {
    js = Array.isArray(js) ? js : [js];

    this.js.push.apply(this.js, js);
};

/**
 * 添加样式。
 * @method addCss
 * @param {String | Array of String} js 样式地址。
 */
Pagelet.prototype.addCss = Pagelet.prototype.addCsses = function (css) {
    css = Array.isArray(css) ? css : [css];

    this.css.push.apply(this.css, css);
};

/**
 * 获取 pagelet 渲染后的信息。
 * @method toJson
 * @return {Object}
 */
Pagelet.prototype.toJson = function () {
    return {
        container: this.container || '',
        reqID: this.reqID,
        id: this.id,
        html: this.html,
        js: this.js,
        css: this.css,
        styles: this.styles,
        scripts: this.scripts
    };
};


/**
 * 销毁。
 * @destroy
 */
Pagelet.prototype.destroy = function () {
    this.destroyed = true;
    this.removeAllListeners();
    this._yog = this.mode = this.id = this.locals = this.compiled = this.state = this.html = null;
    this.scripts = this.js = this.css = this.styles = null;
};
