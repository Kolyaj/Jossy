var path = require('path');
var fs = require('fs');
var {Parser} = require('./Parser');
var {Builder} = require('./Builder');
var {promisify} = require('util');

var readFile = promisify(fs.readFile);

module.exports = function(fname, context, options = {}) {
    return new module.exports.Jossy(options.failOnErrors).compile(fname, context);
};

module.exports.Jossy = require('iclass').create({
    parserCtor: Parser,

    constructor: function(failOnErrors = false) {
        this._failOnErrors = failOnErrors;
        this._parser = new this.parserCtor();
        this._builders = {};
        this._parserPromises = {};
        this._internalFiles = {};
    },

    compile: function(fname, context) {
        fname = path.resolve(fname);
        var parseDependencies = (rootBuilder) => {
            var dependencies = [];
            Object.keys(this._builders).forEach((builderPath) => {
                this._builders[builderPath].getEmptyDependencies().forEach((dependency) => {
                    var dependencyPath = path.resolve(path.dirname(builderPath), dependency);
                    dependencies.push(this._parse(dependencyPath).then((dependencyBuilder) => {
                        this._builders[builderPath].setDependency(dependency, dependencyBuilder);
                    }));
                });
            });
            if (dependencies.length) {
                return Promise.all(dependencies).then(() => {
                    return parseDependencies(rootBuilder);
                });
            } else {
                return rootBuilder;
            }
        };
        return this._parse(fname).then(parseDependencies).then((rootBuilder) => {
            var result = rootBuilder.compile(context);
            Object.keys(this._builders).forEach((path) => {
                this._builders[path].reset();
            });
            return result;
        });
    },

    compileCode: function(fname, content, context) {
        this._internalFiles[path.resolve(fname)] = content;
        return this.compile(fname, context);
    },


    _parse: function(fname) {
        if (!this._parserPromises[fname]) {
            this._parserPromises[fname] = this._readFile(fname).catch((err) => {
                if (this._failOnErrors) {
                    throw err;
                } else {
                    return `throw new Error("JossyError: ${err.message}.");\n`;
                }
            }).then((code) => {
                this._builders[fname] = this._parseCode(code, fname);
                return this._builders[fname];
            });
        }
        return this._parserPromises[fname];
    },

    _createBuilder: function() {
        return new Builder(this._failOnErrors);
    },

    _parseCode: function(code, fname) {
        return this._parser.parse(code, this._createBuilder(fname));
    },

    _readFile: function(fname) {
        return this._internalFiles[fname] ? Promise.resolve(this._internalFiles[fname]) : readFile(fname, 'utf8');
    }
});
