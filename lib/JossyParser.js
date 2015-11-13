var FileStructure = require('./FileStructure');
var JossyError = require('./JossyError');
var Q = require('q');

var fs = require('fs');
var fsRealpath = Q.denodeify(fs.realpath);
var fsStat = Q.denodeify(fs.stat);
var fsReadFile = Q.denodeify(fs.readFile);

module.exports = require('iclass').create(require('lblr-parser').Parser, {
    constructor: function() {
        module.exports.superclass.constructor.apply(this, arguments);
        this._realpathCache = {};

        this._prefilters = [];

        this.registerLineProcessor(/^/, function(line, ignored, meta) {
            meta.fileStructure.addCode(line);
        });

        this.registerDirective('include', function(file, params, cache) {
            var paramsParts = params.split('::');
            var includeFileName = paramsParts.shift();
            if (includeFileName) {
                return this._internalParseFile(file.getRelativePathOf(includeFileName), cache).then(function(result) {
                    file.addInclude(result.fileStructure, paramsParts);
                });
            } else {
                file.addInclude(file, paramsParts);
            }
        }, this);

        this.registerDirective('without', function(file, params, cache) {
            var paramsParts = params.split('::');
            return this._internalParseFile(file.getRelativePathOf(paramsParts.shift()), cache).then(function(result) {
                file.addWithout(result.fileStructure, paramsParts);
            });
        }, this);

        this.registerDirective('label', function(file, label) {
            file.beginLabel(label);
        }, this);
        this.registerDirective('endlabel', function(file) {
            file.endLabel();
        }, this);

        this.registerDirective('if', function(file, params) {
            if (!params.trim()) {
                throw new Error('Bad "if" directive');
            }
            var args = params.split(/\s+/);
            var value = true;
            if (args.length > 1 && args[0] == 'not') {
                value = false;
                args.shift();
            }
            file.beginIf(args[0], value);
        }, this);
        this.registerDirective('endif', function(file) {
            file.endIf();
        }, this);

        this.registerDirective('set', function(file, params) {
            if (!params.trim()) {
                throw new Error('Bad set directive');
            }
            var args = params.split(/\s+/);
            file.addSet(args[0]);
        }, this);
        this.registerDirective('unset', function(file, params) {
            if (!params.trim()) {
                throw new Error('Bad unset directive');
            }
            var args = params.split(/\s+/);
            file.addUnset(args[0]);
        }, this);

        this.registerDirective('define', function(file, params) {
            if (!params.trim()) {
                throw new Error('Bad define directive');
            }
            var args = params.split(' ');
            file.addMacros(args.shift(), args.join(' '));
        }, this);
    },

    registerDirective: function(name, fn, ctx) {
        this.registerLineProcessor(new RegExp('^\\s*//#' + name + '(\\s+[\\s\\S]*)?$'), function(line, ignored, arg, meta) {
            return fn.call(ctx, meta.fileStructure, arg ? arg.trim() : '', meta.cache);
        });
    },

    appendPrefilter: function(fn, ctx) {
        this._prefilters.push({
            fn: fn,
            ctx: ctx
        });
    },

    prependPrefilter: function(fn, ctx) {
        this._prefilters.unshift({
            fn: fn,
            ctx: ctx
        });
    },

    parseFile: function(fname) {
        var cache = {};
        return this._internalParseFile(fname, cache).then(function(result) {
            var resolvedCount = 0;
            return (function waitCachePromises() {
                var keys = Object.keys(cache);
                if (keys.length > resolvedCount) {
                    resolvedCount = keys.length;
                    var promises = Object.keys(cache).map(function(key) {
                        return cache[key].promise;
                    });
                    return Q.all(promises).then(waitCachePromises);
                } else {
                    return result.fileStructure;
                }
            })();
        });
    },


    _internalParseFile: function(fname, cache) {
        var that = this;
        return that._normalizePath(fname).then(function(fname) {
            if (!cache[fname]) {
                var fileStructure = new FileStructure(fname);
                cache[fname] = {
                    fileStructure: fileStructure,
                    promise: fsReadFile(fname, 'utf8').then(function(content) {
                        content = that._prefilters.reduce(function(content, item) {
                            return item.fn.call(item.ctx, fname, content);
                        }, content);
                        return that.parse(content, {fileStructure: fileStructure, cache: cache});
                    })
                };
            }
            return cache[fname];
        });
    },

    _normalizePath: function(fname) {
        if (!this._realpathCache[fname]) {
            this._realpathCache[fname] = Q.all([fsRealpath(fname), fsStat(fname)]).then(function(results) {
                if (!results[1].isFile()) {
                    throw new Error();
                }
                return results[0].replace(/\\/g, '/');
            }).catch(function() {
                throw new Error('File ' + fname + ' not found');
            });
        }
        return this._realpathCache[fname];
    }
});
