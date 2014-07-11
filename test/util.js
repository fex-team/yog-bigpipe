var _ = require('../lib/util.js');
var assert = require("assert");

describe('_.tpl', function() {

    it('pre compile', function() {
        var fn = _.tpl('hello world');

        assert.equal(fn(), 'hello world');
        assert.equal(fn(1), 'hello world');
    });
});