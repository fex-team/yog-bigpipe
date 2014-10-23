yog-bigpipe 
===========

[![Build Status](https://travis-ci.org/fex-team/yog-bigpipe.svg?branch=master)](https://travis-ci.org/fex-team/yog-bigpipe)
[![Coverage Status](https://coveralls.io/repos/fex-team/yog-bigpipe/badge.png)](https://coveralls.io/r/fex-team/yog-bigpipe)

An express.js middleware for fis widget pipline output.

This middleware is bundled in [yog](https://github.com/fex-team/yog).

With [yog](https://github.com/fex-team/yog) you can simple use the pagelet like
this.

```tpl
{% extends './layout.tpl' %}

{% block content %}
    {% widget "./pagelets/jumbotron/jumbotron.tpl" id="jumbotron" mode="async" %}
{% endblock %}

```

And in your controller, you can assign async data like this.

```javascript

router.get('/', function(req, res) {

    // pagelet Id
    res.bigpipe.bind('jumbotron', function(setter) {

        // simulate an async progress
        setTimeout(function() {
            
            // now set data to the pagelet
            setter(null, {
                asyncData: 'xxx'
            });
        }, 2000);
    });

    res.render('page/index.tpl');
});

```

Then the jumbotron content will be rendered in chunk mode.
