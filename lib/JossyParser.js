var FileStructure = require('./FileStructure');
var JossyError = require('./JossyError');
var Q = require('q');

var path = require('path');
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

    parseFile: function(inputFile) {
        var cache = {};
        return this._internalParseFile(inputFile, cache).then(function(result) {
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

    _internalParseFile: function(inputFile, cache) {
        var that = this;
        var normalizedInputFile = this._normalizeInputFile(inputFile);

        return that._normalizePath(normalizedInputFile.path, normalizedInputFile.virtual).then(function(fname) {
            if (!cache[fname]) {
                var fileStructure = new FileStructure(fname);
                var contentsPromise;
                if (normalizedInputFile.contents) {
                    contentsPromise = Q(normalizedInputFile.contents);
                } else {
                    contentsPromise = fsReadFile(fname, 'utf8');
                }
                cache[fname] = {
                    fileStructure: fileStructure,
                    promise: contentsPromise.then(function(content) {
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

    /**
     * @param {string} fname
     * @param {boolean} virtual - типа ненастоящий файл, не нужно проверять, существует он или нет на самом деле
     *                            Для такого файла просто преобразуем путь в абсолютный
     * @returns {*}
     */
    _normalizePath: function(fname, virtual) {
        var promise;
        var absolutePath = path.resolve(fname);

        if (!this._realpathCache[fname]) {
            if (virtual) {
                promise = Q(absolutePath);
            } else {
                promise = Q.all([fsRealpath(absolutePath), fsStat(absolutePath)]).then(function(results) {
                    if (!results[1].isFile()) {
                        throw new TypeError(absolutePath + ' is not a file');
                    }
                    return results[0];
                }, function() {
                    throw new Error('File ' + absolutePath + ' not found');
                });
            }

            this._realpathCache[absolutePath] = promise.then(function(result) {
                return result.replace(/\\/g, '/');
            }).catch(console.error);
        }
        return this._realpathCache[absolutePath];
    },

    /**
     *
     * @param {string|JossyInputFile} inputFile
     * @returns {Object}
     * @private
     */
    _normalizeInputFile: function(inputFile) {
        var result = {
            path: null,
            contents: null,
            virtual: false
        };

        if (typeof inputFile === 'string') {
            result.path = inputFile;
        } else if (Object.prototype.toString.call(inputFile) === '[object Object]') {
            result.path = inputFile.path;
            if (typeof inputFile.contents === 'string') {
                result.virtual = true;
                result.contents = inputFile.contents;
            } else if (Buffer.isBuffer(inputFile.contents)) {
                result.virtual = true;
                result.contents = inputFile.contents.toString('utf-8');
            }
        }

        if (!result.path) {
            throw new TypeError('Wrong input file format. Expected string or object with `path` and [`contents`] fields');
        }

        return result;
    }
});
