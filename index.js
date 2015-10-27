#!/usr/bin/env node

if (require.main == module) {
    if (process.argv[2]) {
        compileFile(process.argv[2], process.argv.slice(3));
    } else {
        console.log('Usage: ...');
    }
} else {
    module.exports = require('./jossy');
}

function compileFile(fileParam, contextVars) {
    var Jossy = require('./jossy').Jossy;
    var fileParams = fileParam.split('::');
    new Jossy().compile(fileParams.shift() || 'index.js', fileParams, makeContext(contextVars)).then(function(result) {
        console.log(result);
    }).catch(function(err) {
        console.error(err.stack);
    });
}

function makeContext(vars) {
    var context = {};
    for (var i = 0; i < vars.length; i++) {
        context[vars[i]] = true;
    }
    return context;
}
