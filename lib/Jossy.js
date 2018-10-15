var path = require('path');
var fs = require('fs');
var {Parser} = require('./Parser');
var {promisify} = require('util');

var readFile = promisify(fs.readFile);

module.exports = function(fname, context) {
    return new module.exports.Jossy().compile(fname, context);
};

module.exports.Jossy = require('iclass').create({
    parserCtor: Parser,

    constructor: function() {
        this._parser = new this.parserCtor();
        this._builders = {};
        this._parserPromises = {};
    },

    compile: function(fname, context) {
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


    _parse: function(fname) {
        fname = path.resolve(fname);
        if (!this._parserPromises[fname]) {
            this._parserPromises[fname] = readFile(fname, 'utf8').catch((err) => {
                return `throw new Error("JossyError: ${err.message}.");\n`;
            }).then((code) => {
                this._builders[fname] = this._parseCode(code);
                return this._builders[fname];
            });
        }
        return this._parserPromises[fname];
    },

    _parseCode: function(code) {
        return this._parser.parse(code);
    }
});
