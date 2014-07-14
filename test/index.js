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
            assert.ok(res.locals.isQuickingMode);

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
            assert.ok(res.locals.isQuickingMode);

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
            assert.ok(res.locals.isQuickingMode);

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
            assert.ok(res.locals.isQuickingMode);

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

describe('render', function() {

    it('single render', function(done) {
        var app = express();
        
        app.use(middleware());

        app.use(function(req, res) {
            var bigpipe = res.bigpipe;

            bigpipe.addPagelet({
                id: 'pageletA',
                mode: 'async',
                locals: {
                    varA: 'value A'
                },
                compiled: function(locals) {
                    return 'the result is ' + locals.varA;
                }
            });

            bigpipe.pipe(res);
        });

        request(app.listen())
            .get('/')
            .end(function(err, res) {
                if (err) return done(err);
                
                assert.equal(res.text, '<script type="text/javascript">BigPipe.onPageletArrive({"container":"","id":"pageletA","html":"the result is value A","js":[],"css":[],"styles":[],"scripts":[]});</script>');
                done();
            });
    });

    it('multi render', function(done) {
        var app = express();
        
        app.use(middleware());

        app.use(function(req, res) {
            var bigpipe = res.bigpipe;

            bigpipe.addPagelet({
                id: 'pageletA',
                mode: 'async',
                locals: {
                    varA: 'value A'
                },
                compiled: function(locals) {
                    return 'the result is ' + locals.varA;
                }
            });

            bigpipe.addPagelet({
                id: 'pageletB',
                mode: 'async',
                locals: {
                    varA: 'value B'
                },
                compiled: function(locals) {
                    return 'the result is ' + locals.varA;
                }
            });

            bigpipe.pipe(res);
        });

        request(app.listen())
            .get('/')
            .end(function(err, res) {
                if (err) return done(err);

                assert.equal(res.text, '<script type="text/javascript">BigPipe.onPageletArrive({"container":"","id":"pageletA","html":"the result is value A","js":[],"css":[],"styles":[],"scripts":[]});</script><script type="text/javascript">BigPipe.onPageletArrive({"container":"","id":"pageletB","html":"the result is value B","js":[],"css":[],"styles":[],"scripts":[]});</script>');
                done();
            });
    });
});


describe('render template', function() {
    
    it('template', function(done) {
        var app = express();
        
        app.use(middleware({
            tpl: {
                _default: '<%= this.id %>'
            }
        }));

        app.use(function(req, res) {
            var bigpipe = res.bigpipe;

            bigpipe.addPagelet({
                id: 'pageletA',
                mode: 'async',
                compiled: function() {
                    return 'whatever';
                }
            });

            bigpipe.addPagelet({
                id: 'pageletB',
                mode: 'async',
                compiled: function() {
                    return 'whatever';
                }
            });

            bigpipe.pipe(res);
        });

        request(app.listen())
            .get('/')
            .end(function(err, res) {
                if (err) return done(err);

                assert.equal(res.text, 'pageletApageletB');
                done();
            });
    });
});


describe('render event', function() {
    
    it('template', function(done) {
        var app = express();
        var expected = 2;
        var actually = 0;
        
        app.use(middleware({
            tpl: {
                _default: '<%= this.id %>'
            }
        }));

        app.use(function(req, res) {
            var bigpipe = res.bigpipe;

            bigpipe.addPagelet({
                id: 'pageletA',
                mode: 'async',
                locals: {
                    key: '123'
                },
                compiled: function() {
                    return 'whatever';
                }
            });

            bigpipe.on('before-pagelet-render', function(pagelet, locals) {
                assert.equal(pagelet.id, 'pageletA');
                assert.equal(locals.key, '123');
                locals.key2 = '456';
                actually++;
            });

            bigpipe.on('after-pagelet-render', function(pagelet, locals) {
                assert.equal(pagelet.id, 'pageletA');
                assert.equal(locals.key, '123');
                assert.equal(locals.key2, '456');
                actually++;
            });

            bigpipe.pipe(res);
        });

        request(app.listen())
            .get('/')
            .end(function(err, res) {
                if (err) return done(err);

                assert.equal(res.text, 'pageletA');
                assert.equal(actually, expected);
                done();
            });
    });
});

describe('render order', function() {
    
    it('async', function(done) {
        var app = express();
        
        app.use(middleware({
            tpl: {
                _default: '<%= this.id %>'
            }
        }));

        app.use(function(req, res) {
            var bigpipe = res.bigpipe;

            bigpipe.addPagelet({
                id: 'pageletA',
                mode: 'async',
                compiled: function() {
                    return 'whatever';
                }
            });

            bigpipe.addPagelet({
                id: 'pageletB',
                mode: 'async',
                compiled: function() {
                    return 'whatever';
                }
            });

            // 50 ms later
            bigpipe.bind('pageletA', function(next) {
                setTimeout(function() {
                    next();
                }, 50);
            });

            // 10 ms later
            bigpipe.bind('pageletB', function(next) {
                setTimeout(function() {
                    next();
                }, 10);
            });


            bigpipe.pipe(res);
        });

        request(app.listen())
            .get('/')
            .end(function(err, res) {
                if (err) return done(err);

                assert.equal(res.text, 'pageletBpageletA');
                done();
            });
    });

    it('pipeline', function(done) {
        var app = express();
        
        app.use(middleware({
            tpl: {
                _default: '<%= this.id %>'
            }
        }));

        app.use(function(req, res) {
            var bigpipe = res.bigpipe;

            bigpipe.addPagelet({
                id: 'pageletA',
                mode: 'pipeline',
                compiled: function() {
                    return 'whatever';
                }
            });

            bigpipe.addPagelet({
                id: 'pageletB',
                mode: 'pipeline',
                compiled: function() {
                    return 'whatever';
                }
            });

            // 50 ms later
            bigpipe.bind('pageletA', function(next) {
                setTimeout(function() {
                    next();
                }, 50);
            });

            // 10 ms later
            bigpipe.bind('pageletB', function(next) {
                setTimeout(function() {
                    next();
                }, 10);
            });


            bigpipe.pipe(res);
        });

        request(app.listen())
            .get('/')
            .end(function(err, res) {
                if (err) return done(err);

                assert.equal(res.text, 'pageletApageletB');
                done();
            });
    });
});

describe('render quickling', function() {
    
    it('quickling 1', function(done) {
        var app = express();
        
        app.use(middleware({
            tpl: {
                _default: '<%= this.id %>'
            }
        }));

        app.use(function(req, res) {
            var bigpipe = res.bigpipe;

            bigpipe.addPagelet({
                id: 'pageletA',
                mode: 'async',
                compiled: function() {
                    return 'whatever';
                }
            });

            bigpipe.addPagelet({
                id: 'pageletB',
                mode: 'quickling',
                compiled: function() {
                    return 'whatever';
                }
            });

            bigpipe.pipe(res);
        });

        request(app.listen())
            .get('/?pagelet=pageletB')
            .end(function(err, res) {
                if (err) return done(err);

                assert.equal(res.text, 'pageletB');
                done();
            });
    });


    it('quickling 2', function(done) {
        var app = express();
        
        app.use(middleware({
            tpl: {
                _default: '<%= this.id %>'
            }
        }));

        app.use(function(req, res) {
            var bigpipe = res.bigpipe;

            bigpipe.addPagelet({
                id: 'pageletA',
                mode: 'async',
                compiled: function() {
                    return 'whatever';
                }
            });

            bigpipe.addPagelet({
                id: 'pageletB',
                mode: 'quickling',
                compiled: function() {
                    return 'whatever';
                }
            });

            bigpipe.pipe(res);
        });

        request(app.listen())
            .get('/?pagelet=pageletA')
            .end(function(err, res) {
                if (err) return done(err);

                assert.equal(res.text, '');
                done();
            });
    });
});

describe('Provider', function() {
    
    it('bigpipe.bind', function(done) {
        var app = express();
        
        app.use(middleware({
            tpl: {
                _default: '<%= this.html %>'
            }
        }));

        app.use(function(req, res) {
            var bigpipe = res.bigpipe;

            bigpipe.addPagelet({
                id: 'pageletA',
                mode: 'async',
                compiled: function(locals) {
                    return locals.content;
                }
            });

            bigpipe.bind('pageletA', function(next) {
                next(null, {content: 'test123'});
            });

            bigpipe.pipe(res);
        });

        request(app.listen())
            .get('/')
            .end(function(err, res) {
                if (err) return done(err);

                assert.equal(res.text, 'test123');
                done();
            });
    });

    it('bigpipe.bind all', function(done) {
        var app = express();
        
        app.use(middleware({
            tpl: {
                _default: '<%= this.html %>'
            }
        }));

        app.use(function(req, res) {
            var bigpipe = res.bigpipe;

            bigpipe.addPagelet({
                id: 'pageletA',
                mode: 'async',
                compiled: function(locals) {
                    return locals.content;
                }
            });

            bigpipe.bind('all', function( id, next) {
                assert.equal(id, 'pageletA');
                next(null, {content: 'test123'});
            });

            bigpipe.pipe(res);
        });

        request(app.listen())
            .get('/')
            .end(function(err, res) {
                if (err) return done(err);

                assert.equal(res.text, 'test123');
                done();
            });
    });


    it('prepare-pagelet-source', function(done) {
        var app = express();
        
        app.use(middleware({
            tpl: {
                _default: '<%= this.html %>'
            }
        }));

        app.use(function(req, res) {
            var bigpipe = res.bigpipe;

            bigpipe.addPagelet({
                id: 'pageletA',
                mode: 'async',
                compiled: function(locals) {
                    return locals.content;
                }
            });

            bigpipe.on('prepare-pagelet-source', function(id, setter) {
                assert.equal(id, 'pageletA');
                setter(function(next) {
                    next(null, {content: 'test123'});
                });
            });

            bigpipe.pipe(res);
        });

        request(app.listen())
            .get('/')
            .end(function(err, res) {
                if (err) return done(err);

                assert.equal(res.text, 'test123');
                done();
            });
    });


    it('onPagelt', function(done) {
        var app = express();
        
        app.use(middleware({
            tpl: {
                _default: '<%= this.html %>'
            }
        }));

        app.use(function(req, res) {
            var bigpipe = res.bigpipe;

            bigpipe.addPagelet({
                id: 'pageletA',
                mode: 'async',
                locals:{
                    onPagelet: function(id, next) {
                        assert.equal(id, 'pageletA');
                        next(null, {content: 'test123'});
                    }
                },
                compiled: function(locals) {
                    return locals.content;
                }
            });

            bigpipe.pipe(res);
        });

        request(app.listen())
            .get('/')
            .end(function(err, res) {
                if (err) return done(err);

                assert.equal(res.text, 'test123');
                done();
            });
    });

    it('onPageltXXX', function(done) {
        var app = express();
        
        app.use(middleware({
            tpl: {
                _default: '<%= this.html %>'
            }
        }));

        app.use(function(req, res) {
            var bigpipe = res.bigpipe;

            bigpipe.addPagelet({
                id: 'pageletA',
                mode: 'async',
                locals: {
                    onPageletPageletA: function(next) {
                        next(null, {content: 'test123'});
                    }
                },
                compiled: function(locals) {
                    return locals.content;
                }
            });

            bigpipe.pipe(res);
        });

        request(app.listen())
            .get('/')
            .end(function(err, res) {
                if (err) return done(err);

                assert.equal(res.text, 'test123');
                done();
            });
    });

});

describe('render error', function() {
    
    it('template', function(done) {
        var app = express();
        
        app.use(middleware({
            tpl: {
                _default: '<%= this.id %>'
            }
        }));

        app.use(function(req, res) {
            var bigpipe = res.bigpipe;

            bigpipe.addPagelet({
                id: 'pageletA',
                mode: 'async',
                locals: {
                    key: '123'
                },
                compiled: function() {
                    return 'whatever';
                }
            });

            bigpipe.bind('pageletA', function(setter) {
                setter('error occer');
            });

            bigpipe.on('error', function(reason) {
                assert.equal(reason, 'error occer');
                done();
            });

            bigpipe.pipe(res);
        });

        request(app.listen())
            .get('/')
            .end(function(err, res) {
                if (err) return done(err);
                done('error');
            });
    });

    it('compiled', function(done) {
        var app = express();
        
        app.use(middleware({
            tpl: {
                _default: '<%= this.id %>'
            }
        }));

        app.use(function(req, res) {
            var bigpipe = res.bigpipe;

            bigpipe.addPagelet({
                id: 'pageletA',
                mode: 'async',
                locals: {
                    key: '123'
                },
                compiled: function() {
                    throw new Error('error occer');
                    return 'whatever';
                }
            });

            bigpipe.on('error', function(err) {
                assert.equal(err.message, 'error occer');
            });

            bigpipe.pipe(res);
        });

        request(app.listen())
            .get('/')
            .end(function(err, res) {
                done();
            });
    });
});


describe('render js/css analyse', function() {
    
    it('js/css', function(done) {
        var app = express();
        var should = require('should');
        
        app.use(middleware({
            tpl: {
                _default: '<%= this.html %>'
            }
        }));

        app.use(function(req, res) {
            var bigpipe = res.bigpipe;

            bigpipe.addPagelet({
                id: 'pageletA',
                mode: 'async',
                compiled: function() {
                    return '<script xx>embed script</script>' +
                        '<script src="js file" xxx>fff</script>test123' + 
                        '<style xxx>embed css</style>' + 
                        '<link xxx href="css file"/>';
                }
            });

            bigpipe.on('pagelet-done', function(pagelet) {
                pagelet.scripts.should.have.property(0, 'embed script');
                pagelet.styles.should.have.property(0, 'embed css');
                pagelet.js.should.have.property(0, 'js file');
                pagelet.css.should.have.property(0, 'css file');
                
                assert.equal(pagelet.html, 'test123');
            });

            bigpipe.pipe(res);
        });

        request(app.listen())
            .get('/')
            .end(function(err, res) {
                if (err) return done(err);

                assert.equal(res.text, 'test123');
                done();
            });
    });


    it('js/css 2', function(done) {
        var app = express();
        var should = require('should');
        
        app.use(middleware({
            tpl: {
                _default: '<%= this.html %>'
            }
        }));

        app.use(function(req, res) {
            var bigpipe = res.bigpipe;

            bigpipe.addPagelet({
                id: 'pageletA',
                mode: 'async',
                compiled: function() {
                    return '<script xx>embed script</script>' +
                        '<script src="js file" xxx>fff</script>test123' + 
                        '<style xxx>embed css</style>' + 
                        '<link xxx href="css file"/>';
                }
            });

            bigpipe.on('after-pagelet-render', function(pagelet) {
                pagelet.addStyle('embed css 2');
                pagelet.addScript('embed script 2');
                pagelet.addJs('js file 2');
                pagelet.addCss('css file 2');
            });

            bigpipe.on('pagelet-done', function(pagelet) {
                pagelet.scripts.should.have.property(1, 'embed script');
                pagelet.scripts.should.have.property(0, 'embed script 2');
                pagelet.styles.should.have.property(1, 'embed css');
                pagelet.styles.should.have.property(0, 'embed css 2');
                pagelet.js.should.have.property(1, 'js file');
                pagelet.js.should.have.property(0, 'js file 2');
                pagelet.css.should.have.property(1, 'css file');
                pagelet.css.should.have.property(0, 'css file 2');

                assert.equal(pagelet.html, 'test123');
            });

            bigpipe.pipe(res);
        });

        request(app.listen())
            .get('/')
            .end(function(err, res) {
                if (err) return done(err);

                assert.equal(res.text, 'test123');
                done();
            });
    });


    it('js/css 3', function(done) {
        var app = express();
        var should = require('should');
        
        app.use(middleware({
            tpl: {
                _default: '<%= this.html %>'
            }
        }));

        app.use(function(req, res) {
            var bigpipe = res.bigpipe;

            bigpipe.addPagelet({
                id: 'pageletA',
                mode: 'async',
                compiled: function() {
                    return '<script xx>embed script</script>' +
                        '<script src="js file" xxx>fff</script>test123' + 
                        '<style xxx>embed css</style>' + 
                        '<link xxx href="css file"/><link xxx />';
                }
            });

            bigpipe.on('pagelet-done', function(pagelet) {
                pagelet.scripts.should.have.property(0, 'embed script');
                pagelet.styles.should.have.property(0, 'embed css');
                pagelet.js.should.have.property(0, 'js file');
                pagelet.css.should.have.property(0, 'css file');
                
                assert.equal(pagelet.html, 'test123<link xxx />');
            });

            bigpipe.pipe(res);
        });

        request(app.listen())
            .get('/')
            .end(function(err, res) {
                if (err) return done(err);

                assert.equal(res.text, 'test123<link xxx />');
                done();
            });
    });


    it('addJs, addStyle, addCss ...', function(done) {
        var app = express();
        var should = require('should');
        
        app.use(middleware({
            tpl: {
                _default: '<%= this.html %>'
            }
        }));

        app.use(function(req, res) {
            var bigpipe = res.bigpipe;

            bigpipe.addPagelet({
                id: 'pageletA',
                mode: 'async',
                compiled: function() {
                    return '';
                }
            });

            bigpipe.on('after-pagelet-render', function(pagelet) {
                pagelet.addStyle(['embed css', 'embed css 2']);
                pagelet.addScript(['embed script', 'embed script 2']);
                pagelet.addJs(['js file', 'js file 2']);
                pagelet.addCss(['css file', 'css file 2']);
            });

            bigpipe.on('pagelet-done', function(pagelet) {
                pagelet.scripts.should.have.property(0, 'embed script');
                pagelet.scripts.should.have.property(1, 'embed script 2');
                pagelet.styles.should.have.property(0, 'embed css');
                pagelet.styles.should.have.property(1, 'embed css 2');
                pagelet.js.should.have.property(0, 'js file');
                pagelet.js.should.have.property(1, 'js file 2');
                pagelet.css.should.have.property(0, 'css file');
                pagelet.css.should.have.property(1, 'css file 2');

                assert.equal(pagelet.html, '');
            });

            bigpipe.pipe(res);
        });

        request(app.listen())
            .get('/')
            .end(function(err, res) {
                if (err) return done(err);

                assert.equal(res.text, '');
                done();
            });
    });
});

describe('add pagelet while already started.', function() {

    it('add pagelet', function(done) {
        var app = express();
        
        app.use(middleware({
            tpl: {
                _default: '<%= this.id %>'
            }
        }));

        app.use(function(req, res) {
            var bigpipe = res.bigpipe;

            bigpipe.addPagelet({
                id: 'pageletA',
                mode: 'async',
                locals: {
                    key: '123'
                },
                compiled: function() {
                    

                    bigpipe.addPagelet({
                        id: 'pageletB',
                        mode: 'async',
                        locals: {
                            key: '123'
                        },
                        compiled: function() {
                            return 'whatever';
                        }
                    });

                    return 'whatever';
                }
            });

            bigpipe.pipe(res);
        });

        request(app.listen())
            .get('/')
            .end(function(err, res) {
                if (err) return done(err);
                assert.equal(res.text, 'pageletBpageletA');
                done();
            });
    });
});


describe('some incorrect usage.', function() {
    
    it('addPagelet in wrong time.', function(done) {
        var app = express();
        var wating = 2;
        
        app.use(middleware({
            tpl: {
                _default: '<%= this.id %>'
            }
        }));

        app.use(function(req, res) {
            var bigpipe = res.bigpipe;

            bigpipe.addPagelet({
                id: 'pageletA',
                mode: 'async',
                locals: {
                    key: '123'
                },
                compiled: function() {
                    return 'whatever';
                }
            });

            bigpipe.on('end', function() {
                assert.equal(bigpipe.addPagelet({
                    id: 'pageletB',
                    mode: 'async',
                    locals: {
                        key: '123'
                    },
                    compiled: function() {
                        return 'whatever';
                    }
                }), false);

                --wating || done();
            });

            bigpipe.pipe(res);
        });

        request(app.listen())
            .get('/')
            .end(function(err, res) {
                if (err) return done(err);
                assert.equal(res.text, 'pageletA');
                --wating || done();
            });
    });


    it('add quickling pagelet while it\' is not in quickling mode', function(done) {
        var app = express();
        
        app.use(middleware({
            tpl: {
                _default: '<%= this.id %>'
            }
        }));

        app.use(function(req, res) {
            var bigpipe = res.bigpipe;

            bigpipe.addPagelet({
                id: 'pageletA',
                mode: 'async',
                locals: {
                    key: '123'
                },
                compiled: function() {
                    return 'whatever';
                }
            });

            bigpipe.addPagelet({
                id: 'pageletB',
                mode: 'quickling',
                locals: {
                    key: '123'
                },
                compiled: function() {
                    return 'whatever';
                }
            });

            bigpipe.pipe(res);
        });

        request(app.listen())
            .get('/')
            .end(function(err, res) {
                if (err) return done(err);
                assert.equal(res.text, 'pageletA');
                done();
            });
    });

    it('start pagelet render while alreay rendered', function(done) {
        var app = express();
        
        app.use(middleware({
            tpl: {
                _default: '<%= this.id %>'
            }
        }));

        app.use(function(req, res) {
            var bigpipe = res.bigpipe;

            bigpipe.addPagelet({
                id: 'pageletA',
                mode: 'async',
                locals: {
                    key: '123'
                },
                compiled: function() {
                    return 'whatever';
                }
            });

            bigpipe.on('pagelet-done', function(pagelet) {
                pagelet.start();
            });

            bigpipe.on('error', function(e) {
                assert.equal(e.message, 'Alreay rendered.');
            });

            bigpipe.pipe(res);
        });

        request(app.listen())
            .get('/')
            .end(function(err, res) {
                if (err) return done(err);
                assert.equal(res.text, 'pageletA');
                done();
            });
    });
});