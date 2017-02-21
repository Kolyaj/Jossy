#!/usr/bin/env node

var fs = require('fs');
var Jossy = require('../lib/Jossy');

var context = {};
var args = [];
process.argv.slice(2).forEach((arg) => {
    if (arg.indexOf('-') == 0) {
        context[arg.substr(1)] = true;
    } else {
        args.push(arg);
    }
});

if (!args[0]) {
    console.log('Usage: jossy <input file or dir> <output file or dir> -context_var1 -context_var2 ...');
    process.exit(1);
}

var output = args[1] ? fs.createWriteStream(args[1], 'utf8') : process.stdout;
new Jossy().compile(args[0], context).then((result) => {
    output.write(result);
    if (output != process.stdout) {
        output.end();
    }
}).catch((err) => {
    console.error(err.stack);
    process.exit(1);
});
