(function (root) {
    // BigPipe 依赖的各种处理器
    // 可以通过此部分换成 [lazyrender](https://github.com/rgrove/lazyload/)，
    // 以达到更好的 js 并发下载性能。

    var d = document;
    var head = d.getElementsByTagName('head')[0];
    var loadedRes = {};
    var loadingRes = {};

    // get broswer info
    var browser = (function () {
        var ua = navigator.userAgent.toLowerCase();
        var match = /(webkit)[ \/]([\w.]+)/.exec(ua) ||
            /(opera)(?:.*version)?[ \/]([\w.]+)/.exec(ua) ||
            /(msie) ([\w.]+)/.exec(ua) || !/compatible/.test(ua) && /(mozilla)(?:.*? rv:([\w.]+))?/.exec(ua) ||
            [];
        return match[1];
    })();

    // load Js and excute it.
    // 加载 JS 并执行它。
    function loadJs(url, ignoreDuplicate, cb) {
        if (ignoreDuplicate && loadedRes[url]) {
            cb && cb();
            return;
        }
        if (ignoreDuplicate && loadingRes[url]) {
            loadingRes[url].push(cb);
            return;
        }
        loadingRes[url] = loadingRes[url] || [];
        var script = d.createElement('script');
        var loaded = false;
        var wrap = function () {
            if (loaded) {
                return;
            }
            loaded = true;
            loadedRes[url] = true;
            if (ignoreDuplicate) {
                for (var i = 0; i < loadingRes[url].length; i++) {
                    loadingRes[url][i] && loadingRes[url][i]();
                }
                loadingRes[url] = null;
            }
            cb && cb();
        };
        script.setAttribute('src', url);
        script.setAttribute('type', 'text/javascript');
        script.onload = script.onerror = wrap;
        script.onreadystatechange = wrap;
        head.appendChild(script);
    }

    // load css and apply it.
    // 加载 css, 并应用该样式。
    function loadCss(url, ignoreDuplicate, cb) {
        if (ignoreDuplicate && loadedRes[url]) {
            cb && cb();
            return;
        }
        if (ignoreDuplicate && loadingRes[url]) {
            loadingRes[url].push(cb);
            return;
        }
        loadingRes[url] = loadingRes[url] || [];
        var link = d.createElement('link');
        link.type = 'text/css';
        link.rel = 'stylesheet';
        link.href = url;

        if (browser === 'msie') {
            link.onreadystatechange = function () {
                /loaded|complete/.test(link.readyState) && cb();
            }
        }
        else if (browser === 'opera') {
            link.onload = cb;
        }
        else {
            // FF, Safari, Chrome
            (function () {
                try {
                    link.sheet.cssRule;
                }
                catch (e) {
                    setTimeout(arguments.callee, 20);
                    return;
                }
                loadedRes[url] = true;
                if (ignoreDuplicate) {
                    for (var i = 0; i < loadingRes[url].length; i++) {
                        loadingRes[url][i] && loadingRes[url][i]();
                    }
                    loadingRes[url] = null;
                }
                cb();
            })();
        }

        head.appendChild(link);
    }


    // eval js code.
    // 直接执行 js 代码。
    function globalEval(code) {
        var script;

        code = code.replace(/^\s+/, '').replace(/\s+$/, '');

        if (code) {
            if (code.indexOf('use strict') === 1) {
                script = document.createElement('script');
                script.text = code;
                head.appendChild(script).parentNode.removeChild(script);
            }
            else {
                eval(code);
            }
        }
    }

    function saveLoadedRes() {
        var domain = window.location.protocol + '//' + window.location.host;
        var scripts = document.getElementsByTagName('script');
        var links = document.getElementsByTagName('link');
        for (var i = 0; i < scripts.length; i++) {
            addRes(scripts[i].src);
        }
        for (var j = 0; j < links.length; j++) {
            addRes(links[j].href);
        }

        function addRes(url) {
            if (url) {
                loadedRes[url] = true;
                // 同时保存一份无domain的数据处理原始URL是绝对路径的情况
                if (url.indexOf(domain) === 0) {
                    loadedRes[url.replace(domain, '')] = true;
                }
                // 支持 combo 的保存
                var match = url.match(/(.*)\?\?(.*)/);
                if (match && match.length === 3) {
                    var origin = match[1];
                    var combo = match[2] || '';
                    var items = combo.split(',');
                    for (var i = 0; i < items.length; i++) {
                        loadedRes[origin + items[i]] = true;
                    }
                }
            }
        }
    }

    // append style cod to dom.
    // 直接应用样式代码到页面。
    function appendStyle(code) {
        var dom = document.createElement('style');
        dom.innerHTML = code;
        head.appendChild(dom);
    }

    // ajax 请求，简单实现，可以修改成使用 jQuery.ajax 如果已经依赖了的话。
    function ajax(url, cb, data) {
        var xhr = new(window.XMLHttpRequest || ActiveXObject)('Microsoft.XMLHTTP');

        xhr.onreadystatechange = function () {
            if (this.readyState == 4) {
                if (this.status !== 200) {
                    cb(this.responseText);
                }
                else {
                    cb(null, this.responseText);
                }
            }
        };
        xhr.open(data ? 'POST' : 'GET', url + '&t=' + (new Date()).getTime(), true);

        if (data) {
            xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        }
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.send(data);
    }

    // 可以换成 jQuery.extend
    function mixin(a, b) {
        if (a && b) {
            for (var k in b) {
                if (b.hasOwnProperty(k)) {
                    a[k] = b[k];
                }
            }
        }
        return a;
    }

    var Util = {
        loadJs: loadJs,
        loadCss: loadCss,
        appendStyle: appendStyle,
        globalEval: globalEval,
        saveLoadedRes: saveLoadedRes,
        ajax: ajax,
        mixin: mixin
    };

    // expose it.
    root.BigPipeUtil = Util;
})(this);

(function (root) {
    // Event
    var Util = root.BigPipeUtil,
        slice = [].slice,
        protos;

    protos = {

        on: function (name, callback) {
            var me = this,
                set, handler;

            set = this._events || (this._events = []);
            set.push({
                e: name,
                cb: callback,
                id: set.length,
                ctx: this
            });

            return this;
        },

        once: function (name, callback) {
            var me = this,
                once;

            once = function () {
                me.off(name, once);
                return callback.apply(me, arguments);
            };

            once._cb = callback;
            return me.on(name, once);
        },

        off: function (name, cb) {
            var events = this._events;

            if (!name && !cb) {
                this._events = [];
                return this;
            }

            each(findHandlers(events, name, cb), function (item) {
                delete events[item.id];
            });

            return this;
        },

        trigger: function (type) {
            var args, events, allEvents;

            if (!this._events || !type) {
                return this;
            }

            args = slice.call(arguments, 1);
            events = findHandlers(this._events, type);
            return triggerHanders(events, args);
        }
    };

    // 根据条件过滤出事件handlers.
    function findHandlers(arr, name, callback) {
        var ret = [];

        each(arr, function (handler) {
            if (handler &&
                (!name || handler.e === name) &&
                (!callback || handler.cb === callback || handler.cb._cb === callback)) {
                ret.push(handler);
            }
        });

        return ret;
    }

    function each(arr, iterator) {
        for (var i = 0, len = arr.length, item; i < len; i++) {
            item = arr[i];
            iterator.call(item, item, i);
        }
    }

    function triggerHanders(events, args) {
        var i = -1,
            len = events.length,
            handler;

        while (++i < len) {
            handler = events[i];

            if (handler.cb.apply(handler.ctx, args) === false) {
                break;
            }
        }
    }

    root.BigPipeEvent = Util.mixin({
        mixto: function (obj) {
            return Util.mixin(obj, protos);
        }
    }, protos);

})(this);

(function (root) {
    var Util = root.BigPipeUtil;
    var Event = root.BigPipeEvent;
    var BigPipe = function () {
        var insertQueue = [];

        // The order of render pagelet.
        // - load css
        // - append style
        // - insert html
        // - load js.
        // - exec scripts.
        //
        // data
        //  - container       optional
        //  - id              pagelet Id
        //  - html            pagelet content
        //  - js              []
        //  - css             []
        //  - styles          []
        //  - scripts         []
        //  - done            function
        // onDomInserted called when dom inserted.
        function PageLet(data, onDomInserted) {
            var remaining = 0;
            var item = {
                cssLoaded: false,
                finish: function () {
                    insertDom(data);
                }
            };

            var loadCss = function () {
                insertQueue.push(item);
                // load css
                if (data.css && data.css.length) {
                    remaining = data.css.length;
                    for (var i = 0, len = remaining; i < len; i++) {
                        Util.loadCss(data.css[i], BigPipe.ignoreDuplicate, function () {
                            --remaining;
                            if (remaining === 0) {
                                item.cssLoaded = true;
                                finishInsertQueue();
                            }
                        });
                    }
                }
                else {
                    item.cssLoaded = true;
                    finishInsertQueue();
                }
            };

            var finishInsertQueue = function () {
                var item = insertQueue[0];
                while (item && item.cssLoaded) {
                    insertQueue.shift();
                    item.finish();
                    item = insertQueue[0];
                }
            };

            var insertDom = function () {
                var i, len, dom, node, text, scriptText, temp;

                // insert style code
                if (data.styles && data.styles.length) {
                    for (i = 0, len = data.styles.length; i < len; i++) {
                        Util.appendStyle(data.styles[i]);
                    }
                }

                dom = data.container && typeof data.container === 'string' ?
                    document.getElementById(data.container) :
                    (data.container || document.getElementById(data.id));

                if (data.extend) {
                    temp = document.createElement('div');
                    temp.innerHTML = data.html;
                    while (temp.firstChild) {
                        dom.appendChild(temp.firstChild);
                    }
                }
                else {
                    dom.innerHTML = data.html;
                }
                setTimeout(function () {
                    onDomInserted(data);
                }, 0);
            };

            var loadJs = function (callback) {
                var len = data.js && data.js.length;
                var remaining = len;
                var i;

                // exec data.scripts
                var next = function () {
                    var i, len;

                    // eval scripts.
                    if (data.scripts && data.scripts.length) {
                        for (i = 0, len = data.scripts.length; i < len; i++) {
                            Util.globalEval(data.scripts[i]);
                        }
                    }

                    callback && callback(data);
                };


                if (!len) {
                    next && next();
                    return;
                }

                for (i = 0; i < len; i++) {
                    Util.loadJs(data.js[i], BigPipe.ignoreDuplicate, next && function () {
                        --remaining || next();
                    });
                }
            };

            return {
                loadCss: loadCss,
                loadJs: loadJs
            };
        }

        var count = 0,
            pagelets = [],
            /* registered pagelets */
            currReqID = null,
            resourceChecked = false,
            cache = {},
            globalBigPipeLoadIndex = 0;

        return {

            // This is method will be executed automaticlly.
            //
            // - after chunk output pagelet.
            // - after async load quickling pagelet.
            onPageletArrive: function (obj) {
                if (!resourceChecked) {
                    Util.saveLoadedRes();
                    resourceChecked = true;
                }
                currReqID = obj.reqID;
                // console.log('arrive', obj.id);
                this.trigger('pageletarrive', obj);
                var pagelet = new PageLet(obj, function () {
                    // console.log('dom ready', obj.id);
                    var item;
                    count--;
                    // enforce js executed after dom inserted.
                    if (count === 0) {
                        while ((item = pagelets.shift())) {
                            BigPipe.trigger('pageletinsert', pagelet, item.pageletData);
                            // console.log('pagelet exec js', item.pageletData.id);
                            item.loadJs((function (item) {
                                // console.log('pagelet exec done', item.pageletData.id);
                                BigPipe.trigger('pageletdone', pagelet, item.pageletData);
                            })(item));
                        }
                    }
                });
                pagelet.pageletData = obj;
                pagelets.push(pagelet);
                count++;
                pagelet.loadCss();
            },

            // Async load quicking pagelet.
            // An quickling pagelet rendered only after someone called the
            // BigPipe.load('pageletId');
            //
            // BigPipe.load(pageleteIds);
            // BigPipe.load({
            //   pagelets: ['pageletA']
            //   param: 'key=val&kay=vel'
            //   container: dom or {
            //      pageletA: dom,
            //      pageletB: another dom
            //   },
            //   cb: function() {
            //
            //   }
            // });
            //
            // params:
            //   - pagelets       pagelet id or array of pagelet id.
            //   - param          extra params for the ajax call.
            //   - search         replace location.search for the ajax call, without '?'.
            //   - container      by default, the pagelet will be rendered in
            //                    some document node with the same id. With this
            //                    option the pagelet can be renndered in
            //                    specified document node.
            //   - extend
            load: function (pagelets) {
                var args = [];
                var currentPageUrl = location.href;
                var containers = {};
                var pageletRequestID = globalBigPipeLoadIndex++;
                var obj, i, id, cb, remaining = 0,
                    search, url, param, container;

                // convert arguments.
                // so we can accept
                //
                // - string with pagelet ID
                // - string with pagelet IDs split by `,`.
                // - array of string with pagelet ID
                // - object with pagelets key.
                if (pagelets instanceof Array) {
                    obj = {
                        pagelets: pagelets
                    };
                }
                else {
                    obj = typeof pagelets === 'string' ? {
                        pagelets: pagelets
                    } : pagelets;
                    pagelets = obj.pagelet || obj.pagelets;
                    typeof pagelets === 'string' &&
                        (pagelets = pagelets.split(/\s*,\s*/));
                }

                for (i = pagelets.length - 1; i >= 0; i--) {
                    id = pagelets[i];
                    args.push('pagelets[]=' + id);
                    container = obj.container && obj.container[id] || obj.container;
                    containers[id] = container;
                }
                args.push('reqID=' + pageletRequestID);

                function onPageArrive(data) {
                    // !data.reqID 用于兼容老版本未返回reqID的情况
                    if (data.reqID === undefined || data.reqID === pageletRequestID) {
                        var id = data.id;
                        // console.log('req', data.reqID, 'pagelet', data.id, 'arrive');
                        remaining++;
                        containers[id] && (data.container = containers[id]);
                        data.extend = obj.extend;
                    }
                }

                BigPipe.on('pageletarrive', onPageArrive);
                obj.search && args.push(obj.search);
                obj.param && args.push(obj.param);
                if (obj.url) {
                    url = obj.url + (obj.url.indexOf('?') === -1 ? '?' : '&') + args.join('&');
                }
                else {
                    if (!obj.search) {
                        url = (location.search ? location.search + '&' : '?') + args.join('&');
                    }
                    else {
                        url = '?' + args.join('&');
                    }
                }
                BigPipe.on('pageletdone', function (pagelet, res) {
                    // !res.reqID 用于兼容老版本未返回reqID的情况
                    if (res.reqID === undefined || res.reqID === pageletRequestID) {
                        remaining--;
                        // console.log('req', res.reqID, 'pagelet', res.id, 'done');
                        if (remaining === 0) {
                            // console.log('req', res.reqID, 'done');
                            BigPipe.off('pageletdone', arguments.callee);
                            BigPipe.off('pageletarrive', onPageArrive);
                            obj.cb && obj.cb();
                        }
                    }
                });

                // console.log('req', pageletRequestID, url, 'start');

                if (cache[obj.cacheID]) {
                    var requestCache = cache[obj.cacheID];
                    // 同步requestID
                    pageletRequestID = requestCache.reqID;
                    Util.globalEval(requestCache.content);
                }
                else {
                    Util.ajax(url, function (err, res) {
                        if (err) {
                            return obj.cb && obj.cb(err);
                        }
                        // if the page url has been moved.
                        if (currentPageUrl !== location.href) {
                            return;
                        }
                        Util.globalEval(res);
                        if (obj.cacheID) {
                            cache[obj.cacheID] = {
                                content: res,
                                reqID: currReqID
                            };
                        }
                    });
                }
            }
        };
    }();

    Event.mixto(BigPipe);
    BigPipe.ignoreDuplicate = true;
    window.BigPipe = BigPipe;
})(this);
