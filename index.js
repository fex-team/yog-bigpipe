var BigPipe = require('./lib/bigpipe.js');

module.exports = function( options ) {

    return function(req, res, next) {
        var bigpipe = res.bigpipe = new BigPipe(options);
        var pagelet = req.param('pagelet');
        var pagelets = req.param('pagelets');
        var destroy = function() {
            res.removeListener('finish', destroy);
            //res.removeListener('close', destroy);

            bigpipe.destroy();
            bigpipe = res.bigpipe = null;
        };

        if (!Array.isArray(pagelets)) {
            pagelets = pagelets ? [ pagelets ] : [];
        }

        pagelet && pagelets.push(pagelet);
        bigpipe.addQuicklingPagelets(pagelets);

        res.on('finish', destroy);
        //res.on('close', destroy);

        next();
    }
}