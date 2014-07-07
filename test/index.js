var assert = require("assert");
var middleware = require('..');
var express = require('express');
var should = require('should');
var request = require('supertest');

describe('middleware initialize', function() {

    it('check bigpipe expose', function(done) {
        var app = express();
        var responseText = 'hello world';

        app.use(middleware());

        app.use(function(req, res, next) {
            res.should.have.property('bigpipe');

            res.once('finish', function() {
                should(res.bigpipe).not.be.ok;
            });

            res.end(responseText);
        });

        request(app.listen())
            .get('/')
            .end(function(err, res) {
                if (err) return done(err);
                
                assert.equal(res.text, responseText);

                done();
            });
    });

    it('check bigpipe options', function(done) {
        var app = express();
        var responseText = 'hello world';

        app.use(middleware({
            key: 'test'
        }));

        app.use(function(req, res, next) {
            var bigpipe = res.bigpipe;

            bigpipe.options.should.have.property('key', 'test');

            res.end(responseText);
        });

        request(app.listen())
            .get('/')
            .end(function(err, res) {
                if (err) return done(err);
                
                assert.equal(res.text, responseText);
                done();
            });
    });
});

describe('bigpipe quickling filter', function() {
    
    it('single pagelet', function(done) {
        var app = express();
        var responseText = 'hello world';

        app.use(middleware());

        app.use(function(req, res, next) {
            var bigpipe = res.bigpipe;

            assert.ok(bigpipe.isQuickingMode());

            bigpipe.quicklings.should.have.property(0, 'pageletA');

            res.end(responseText);
        });

        request(app.listen())
            .get('/?pagelet=pageletA')
            .end(function(err, res) {
                if (err) return done(err);
                
                assert.equal(res.text, responseText);
                done();
            });
    });

    it('signle pagelets', function(done) {
        var app = express();
        var responseText = 'hello world';

        app.use(middleware());

        app.use(function(req, res, next) {
            var bigpipe = res.bigpipe;

            assert.ok(bigpipe.isQuickingMode());

            bigpipe.quicklings.should.have.property(0, 'pageletA');

            res.end(responseText);
        });

        request(app.listen())
            .get('/?pagelets=pageletA')
            .end(function(err, res) {
                if (err) return done(err);
                
                assert.equal(res.text, responseText);
                done();
            });
    });

    it('multi pagelets', function(done) {
        var app = express();
        var responseText = 'hello world';

        app.use(middleware());

        app.use(function(req, res, next) {
            var bigpipe = res.bigpipe;

            assert.ok(bigpipe.isQuickingMode());

            bigpipe.quicklings.should.have.property(0, 'pageletA');

            res.end(responseText);
        });

        request(app.listen())
            .get('/?pagelets[]=pageletA')
            .end(function(err, res) {
                if (err) return done(err);
                
                assert.equal(res.text, responseText);
                done();
            });
    });

    it('more pagelets', function(done) {
        var app = express();
        var responseText = 'hello world';

        app.use(middleware());

        app.use(function(req, res, next) {
            var bigpipe = res.bigpipe;

            assert.ok(bigpipe.isQuickingMode());

            bigpipe.quicklings.should.have.property(0, 'pageletA');
            bigpipe.quicklings.should.have.property(1, 'pageletB');

            res.end(responseText);
        });

        request(app.listen())
            .get('/?pagelets[]=pageletA&pagelets[]=pageletB')
            .end(function(err, res) {
                if (err) return done(err);
                
                assert.equal(res.text, responseText);
                done();
            });
    });
});

// describe('render', function() {

//     it('simple render', function(done) {
//         var app = express();
        
//         app.use(middleware());

//         app.use(function(req, res, next) {
//             var bigpipe = res.bigpipe;

//             bigpipe.addPagelet({
//                 id: 'pageletA',
//                 mode: 'async',
//                 locals: {
//                     varA: 'value A'
//                 },
//                 compiled: function(locals) {
//                     return 'the result is ' + locals.varA;
//                 }
//             });

//             bigpipe.render(res, function() {
//                 next();
//             });
//         });

//         request(app.listen())
//             .get('/')
//             .end(function(err, res) {
//                 if (err) return done(err);
                
//                 assert.equal(res.text, 'the result is value A');
//                 done();
//             });
//     });
// });