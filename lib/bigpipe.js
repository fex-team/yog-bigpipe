var Pagelet = require('./pagelet.js');
var status = Pagelet.status;
var mode = Pagelet.mode;


var BigPipe = module.exports = function BigPipe(options) {
    this.options = options;

    this.pagelets = [];
    this.pipelines = [];
    this.sources = {};
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

    this.pagelets.push(pagelet);
    pagelet.mode === mode.pipeline && this.pipelines.push(pagelet);

    pagelet.on('ready', this._onPageletReady.bind(this));
};

BigPipe.prototype.render = function(steam, cb) {
    var pagelets = this.pagelets;
    var sources = this.sources;
    this.steam = steam;
    this.remaining = pagelets.length;
    this.cb = cb;

    if (!this.remaining) {
        process.nextTick(cb);
    }

    pagelets.forEach(function(pagelet) {
        sources[pagelet.id] && pagelet.setSource(sources[pagelet.id]);
        pagelet.render();
    });
};


BigPipe.prototype._onPageletReady = function(pagelet) {
    var content, cb;

    if (pagelet.mode ===mode.async) {
        this.remaining--;
        content = pagelet.output();
        content && this.steam.write(content);
    }

    if (!this.remaining) {
        cb = this.cb;
        this.cb = null;
        cb(null, '');
    }
};