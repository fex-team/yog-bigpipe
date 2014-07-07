var Pagelet = require('./pagelet.js');
var status = Pagelet.status;
var mode = Pagelet.mode;
var mixin = require('./util.js').mixin;
var Readable = require('stream').Readable;
var util = require('util');

var BigPipe = module.exports = function BigPipe(options) {
    this.options = mixin(mixin({}, BigPipe.options), options);
    this.pagelets = [];
    this.pipelines = [];
    this.rendered = [];
    this.sources = {};
    this.state = status.pending;
    this.quicklings = [];

    Readable.call(this, null);
};

// default options
BigPipe.options = {
    
    // configure output template.
    tpl: {
        _default: '<script type="text/javascript">BigPipe.onPageletArrive(${data});</script>',
        quickling: 'BigPipe.onPageletArrive(${data});'
    }
};

util.inherits(BigPipe, Readable);

// don't call this directly.
BigPipe.prototype._read = function(n) {
    if (this.state === status.pending) {
        this.render();
    }
};

// bind pagelet data source.
// accept fucntion and model name.
BigPipe.prototype.bind = function(id, fn) {
    this.sources[id] = fn;
    return this;
};

BigPipe.prototype.addQuicklingPagelets = function(pagelets) {
    var arr = this.quicklings;
    arr && arr.push.apply(arr, pagelets);
};

BigPipe.prototype.isQuickingMode = function() {
    return !!(this.quicklings && this.quicklings.length);
};

BigPipe.prototype.addPagelet = function(obj) {

    if (this.state === status.fulfilled) {
        return false;
    }

    // todo 如果 quickling 的 widget 藏在某些异步 widget 里面，岂不是找不到？
    if (!this.isQuickingMode() && obj.mode !== mode.pipeline && obj.mode !== mode.async) {

        // 非 quickling 请求，只接收 pipeline 和 async 模式的 pagelet.
        return false;
    } else if (this.isQuickingMode() &&
            (obj.mode !== mode.quickling || !~this.quicklings.indexOf(obj.id))) {

        // quickling 请求，只接收 quickling 模式的 pagelet.
        return false;
    }

    var pagelet = new Pagelet(obj);
    var self = this;
    
    this.pagelets.push(pagelet);
    pagelet.mode === mode.pipeline && this.pipelines.push(pagelet);

    pagelet.once('done', this._onPageletDone.bind(this));

    pagelet.on('before-render', function() {
        var args = [].slice.call(arguments);
        return self.emit.apply(self, ['before-pagelet-render'].concat(args));
    });

    pagelet.on('after-render', function() {
        var args = [].slice.call(arguments);
        return self.emit.apply(self, ['after-pagelet-render'].concat(args));
    });

    if (this.state === status.rendering) {
        this.renderPagelet(pagelet);
    }
};

BigPipe.prototype.render = function() {
    var pagelets = this.pagelets.concat();

    this.state = status.rendering;

    pagelets.forEach(this.renderPagelet.bind(this));
    this._checkFinish();
};

BigPipe.prototype.renderPagelet = function(pagelet) {
    var sources = this.sources;
    var source = sources[pagelet.id];

    if (!source && typeof sources.all === 'function') {
        source = sources.all.bind(null, pagelet.id);
    }

    pagelet.start(source);
};

BigPipe.prototype.destroy = function() {
    this.sources = null;

    this.removeAllListeners();

    this.rendered.concat(this.pagelets).forEach(function(pagelet) {
        pagelet.destroy();
    });

    this.rendered = this.pipelines = this.pagelets = this.quicklings = null;
};

BigPipe.prototype._onPageletDone = function(pagelet) {
    var cb, idx, item;

    if (pagelet.mode ===mode.pipeline) {
        // 必须按顺序
        // idx = this.pipelines.indexOf(pagelet);

        // // if this is not the first pipline pagelet.
        // if (idx !== 0) {
        //     return;
        // }

        // 必须是第一个才开始吐数据。否则等待。
        while((item = this.pipelines[0]) &&
                item.state === status.fulfilled) {

            this.outputPagelet(item);
        }
    } else {
        this.outputPagelet(pagelet);
    }

    process.nextTick(this._checkFinish.bind(this));
};

BigPipe.prototype._checkFinish = function() {
    if (!this.pagelets.length && this.state === status.rendering) {
        // 标记已经完成。
        this.state = status.fulfilled;
        this.push(null);
    }
};

BigPipe.prototype.outputPagelet = function(pagelet) {
    var content = this.format(pagelet);
    content && this.push(content);
    this._markPageletRendered(pagelet);
};

BigPipe.prototype.format = function(pagelet) {
    var tpl = this.options.tpl;
    var type = pagelet.mode;
    var obj = pagelet.toJson();

    tpl = tpl[type] || tpl['_default'];

    return tpl.replace(/\${data}/g, JSON.stringify(obj));

};

BigPipe.prototype._markPageletRendered = function(pagelet) {
    var idx = this.pagelets.indexOf(pagelet);
    var removed = this.pagelets.splice(idx, 1)[0];

    idx = this.pipelines.indexOf(pagelet);
    ~idx && this.pipelines.splice(idx, 1);

    // should I save this?
    this.rendered.push(removed);
};