var path = require('path');
var fs = require('fs');
var Parser = require('./Parser');

module.exports = require('iclass').create({
    constructor: function() {
        this._parsers = {};
        this._parserPromises = {};
    },

    compile: function(fname, context) {
        var parseDependencies = (rootParser) => {
            var dependencies = [];
            Object.keys(this._parsers).forEach((parserPath) => {
                this._parsers[parserPath].getEmptyDependencies().forEach((dependency) => {
                    var dependencyPath = path.resolve(path.dirname(parserPath), dependency);
                    dependencies.push(this._createParser(dependencyPath).then((dependencyParser) => {
                        this._parsers[parserPath].setDependency(dependency, dependencyParser);
                    }));
                });
            });
            if (dependencies.length) {
                return Promise.all(dependencies).then(() => {
                    return parseDependencies(rootParser);
                });
            } else {
                return rootParser;
            }
        };
        return this._createParser(fname).then(parseDependencies).then((rootParser) => {
            return rootParser.compile(context);
        });
    },


    _createParser: function(fname) {
        fname = path.resolve(fname);
        if (!this._parserPromises[fname]) {
            this._parserPromises[fname] = this._createParserInstance(fname).then((parser) => {
                this._parsers[fname] = parser;
                var readStream = fs.createReadStream(fname, 'utf8');
                readStream.pipe(parser);
                readStream.on('error', () => {
                    readStream.unpipe(parser);
                    parser.end(`throw new Error("JossyError: File ${fname} doesn't found.");\n`);
                });
                return parser.getPromise();
            });
        }
        return this._parserPromises[fname];
    },

    _createParserInstance: function() {
        return Promise.resolve(new Parser());
    }
});
