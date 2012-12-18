#!/usr/bin/env node

if (require.main == module) {
    if (process.argv[2]) {
        if (process.argv[2] == 'server') {
            var contextVars = process.argv.slice(3);
            var port = 9595;
            if (+contextVars[0]) {
                port = +contextVars.shift();
            }
            createServer(port, contextVars);
        } else {
            compileFile(process.argv[2], process.argv.slice(3));
        }
    } else {
        console.log('Usage: ...');
    }
} else {
    module.exports = require('./jossy');
}

function compileFile(fileParam, contextVars) {
    var fileParams = fileParam.split('::');
    require('./jossy').compile(fileParams.shift() || 'index.js', fileParams, makeContext(contextVars), function(err, result) {
        if (err) {
            throw err;
        }
        console.log(result);
    });
}

function createServer(port, contextVars) {
    require('http').createServer(function(req, res) {
        var fname = require('url').parse(req.url).pathname;
        require('./jossy').compile(fname, [], makeContext(contextVars), function(err, result) {
            if (err) {
                console.log('Error: ' + err.message);
                res.writeHead(500);
                res.end('throw new Error(' + JSON.stringify('JossyError: ' + err.message) + ');');
                return;
            }
            res.writeHead(200, {
                'Content-Type': 'text/javascript; charset=UTF-8'
            });
            res.end(result);
        });
    }).listen(port);
}

function makeContext(vars) {
    var context = {};
    for (var i = 0; i < vars.length; i++) {
        context[vars[i]] = true;
    }
    return context;
}