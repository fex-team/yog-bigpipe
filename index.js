var BigPipe = require('./lib/bigpipe.js');

module.exports = function( options ) {

    return function(req, res, next) {
        res.bigpipe = new BigPipe(options);

        next();
    }
}