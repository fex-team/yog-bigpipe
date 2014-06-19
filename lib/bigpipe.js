var Pagelet = require('./pagelet.js');
var status = Pagelet.status;
var mode = Pagelet.mode;


var BigPipe = module.exports = function BigPipe(options) {
    this.options = options;

    this.pagelets = [];
    this.pipelines = [];
    this.rendered = [];
    this.sources = {};
    this.state = status.pending;
};

BigPipe.prototype.bind = function(id, fn) {
    this.sources[id] = fn;
};

BigPipe.prototype.addPagelet = function(obj) {

    // 目前只支持这两种模式。
    if (obj.mode !== mode.pipeline && obj.mode !== mode.async) {
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
        this.destroy();
        process.nextTick(cb);
    }

    pagelets.forEach(function(pagelet) {
        sources[pagelet.id] && pagelet.setSource(sources[pagelet.id]);
        pagelet.render();
    });
};

BigPipe.prototype.destroy = function() {
    this.stream = this.cb = null;
};


BigPipe.prototype._onPageletReady = function(pagelet) {
    var content, cb, idx, item;

    if (pagelet.mode ===mode.async) {
        content = pagelet.toJs();
        content && this.stream.write(content);
        this._markPageletRendered(pagelet);
    } else if (pagelet.mode ===mode.pipeline) {
        // 必须按顺序
        idx = this.pipelines.indexOf(pagelet);

        // 必须是第一个才开始吐数据。否则等待。
        if (idx===0) {
            while((item = this.pipelines[0]) && item.state === status.fulfilled) {
                content = item.toJs();
                content && this.stream.write(content);
                this._markPageletRendered(item);
            }
        }
    }

    if (!this.pagelets.length) {
        cb = this.cb;
        // 标记已经完成。
        this.state = status.fulfilled;
        this.destroy();
        cb(null, '');
    }
};

BigPipe.prototype._markPageletRendered = function(pagelet) {
    var idx = this.pagelets.indexOf(pagelet);
    var removed = this.pagelets.splice(idx, 1)[0];

    idx = this.pipelines.indexOf(pagelet);
    ~idx && this.pipelines.splice(idx, 1);

    // should I save this?
    this.rendered.push(removed);
};