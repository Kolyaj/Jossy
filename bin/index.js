#!/usr/bin/env node

var fs = require('fs');
var {Jossy} = require('../lib/Jossy');
var {program} = require('commander');
var {version} = require('../package');

var collectArray = function(value, prev) {
    return prev.concat([value]);
};

var collectObject = function(value, prev) {
    return {[value]: true, ...prev};
};

program
    .version(version)
    .requiredOption('-i, --input <path>', 'input file')
    .option('-o, --output <path>', 'output file, if not specified it will be stdout')
    .option('--set <flag>', 'one or more flags for set directive', collectObject, {})
    .option('--label <label>', 'one or more labels in input file that will be included to output', collectArray, [])
    .option('--layer <layer>', 'build only code under this layer, don\'t use with --layers option')
    .option('--layers <layer>', 'one or more layers that will be included to output, dot\'t use with --layer option', collectArray, [])
    .option('--fail-on-errors', 'exit process if build error occured, by default it output new Error() expression');

var args = program.parse(process.argv);
if (args.layer && args.layers.length > 0) {
    console.log('Don\'t use layer and layers options together.');
    process.exit(1);
}

var output = args.output ? fs.createWriteStream(args.output, 'utf8') : process.stdout;
new Jossy(args.failOnErrors).compile(args.input, args.set, args.label, args.layer || args.layers).then((result) => {
    output.write(result);
    if (output !== process.stdout) {
        output.end();
    }
}).catch((err) => {
    console.error(err.stack);
    if (args.output) {
        output.end();
    }
    process.exit(1);
});
