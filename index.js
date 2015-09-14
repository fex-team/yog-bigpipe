var BigPipe = require('./lib/bigpipe.js');

module.exports = function (options) {

    return function (req, res, next) {
        var bigpipe = res.bigpipe = new BigPipe(options);
        var pagelet = req.query.pagelet;
        var pagelets = req.query.pagelets;
        var reqID = +req.query.reqID;
        var destroy = function () {
            res.removeListener('finish', destroy);
            //res.removeListener('close', destroy);

            bigpipe.destroy();
            bigpipe = res.bigpipe = null;
        };

        if (!Array.isArray(pagelets)) {
            pagelets = pagelets ? [pagelets] : [];
        }
        bigpipe.reqID = reqID;
        pagelet && pagelets.push(pagelet);
        bigpipe.addQuicklingPagelets(pagelets);

        // res.locals 肯定是一个对象，不信可以去查看 express/middleware/init
        res.locals.isQuickingMode = bigpipe.isQuickingMode();

        res.on('finish', destroy);
        //res.on('close', destroy);

        next();
    }
}
