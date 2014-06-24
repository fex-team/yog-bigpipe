var Pagelet = require('./pagelet.js');
var status = Pagelet.status;
var mode = Pagelet.mode;

function mixin(a, b) {
    if (a && b) {
        for (var key in b) {
            a[key] = b[key];
        }
    }
    return a;
}


var BigPipe = module.exports = function BigPipe(options) {
    this.options = mixin({}, BigPipe.options, options);
    this.quicklings = [];
    this.pagelets = [];
    this.pipelines = [];
    this.rendered = [];
    this.sources = {};
    this.state = status.pending;
    this.isquicking = false;
};

BigPipe.options = {
    tpl: {
        _default: '<script type="text/javascript">BigPipe.onPageletArrive(${data});</script>',
        quickling: 'BigPipe.onPageletArrive(${data});'
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
    arr.splice.apply(arr, [arr.length, 0].concat(pagelets));
};

BigPipe.prototype.isQuickingMode = function() {
    return this.quicklings.length;
};

BigPipe.prototype.addPagelet = function(obj) {

    // todo 如果 quickling 的 widget 藏在某些异步 widget 里面，岂不是找不到？
    if (!this.isQuickingMode() && obj.mode !== mode.pipeline && obj.mode !== mode.async) {

        // 非 quickling 请求，只接收 pipeline 和 async 模式的 pagelet.
        return false;
    } else if (this.isQuickingMode() && obj.mode !== mode.quickling) {

        // quickling 请求，只接收 quickling 模式的 pagelet.
        return false;
    }

    if (this.quicklings.length && !~this.quicklings.indexOf(obj.id)) {
        // 不在列表里面。
        return false;
    }

    var pagelet = new Pagelet(obj);
    var sources = this.sources;

    this.pagelets.push(pagelet);
    pagelet.mode === mode.pipeline && this.pipelines.push(pagelet);

    pagelet.on('ready', this._onPageletReady.bind(this));

    if (this.state === status.rendering) {
        sources[pagelet.id] && pagelet.setSource(sources[pagelet.id]);
        pagelet.render();
    }
};

BigPipe.prototype.render = function(stream, cb) {
    var pagelets = this.pagelets.concat();
    var sources = this.sources;

    this.stream = stream;
    this.cb = cb;
    this.state = status.rendering;

    if (!pagelets.length) {
        process.nextTick(cb);
    }

    pagelets.forEach(function(pagelet) {
        sources[pagelet.id] && pagelet.setSource(sources[pagelet.id]);
        pagelet.render();
    });
};

BigPipe.prototype.destroy = function() {
    this.stream = this.cb = this.sources = null;

    this.rendered.concat(this.pagelets).forEach(function(pagelet) {
        pagelet.destroy();
    });

    this.rendered = this.pipelines = this.pagelets = this.quicklings = null;
};


BigPipe.prototype._onPageletReady = function(pagelet) {
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

    if (!this.pagelets.length) {
        cb = this.cb;
        // 标记已经完成。
        this.state = status.fulfilled;
        cb(null, '');
    }
};

BigPipe.prototype.outputPagelet = function(pagelet) {
    var content = this.format(pagelet);
    content && this.stream.write(content);
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