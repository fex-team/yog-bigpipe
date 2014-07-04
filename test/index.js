var assert = require("assert");
var middleware = require('..');

describe('middleware', function() {
    
    it('Check the init function.', function() {
        var fn = middleware();
        
        assert.ok(typeof fn === 'function', 'this is should be an function.');
        assert.equal(fn.length, 3, 'should have three arguments');
    });
});