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
        this._cache = {};
        this._realpathCache = {};

        this._prefilters = [];
        this._postfilters = [];

        this.registerLineProcessor(/^/, function(line, ignored, meta) {
            meta.fileStructure.addCode(line);
        });

        this.registerDirective('include', function(file, params) {
            var paramsParts = params.split('::');
            var includeFileName = paramsParts.shift();
            if (includeFileName) {
                var absFileName = file.getRelativePathOf(includeFileName);
                return this.parseFile(absFileName).then(function(includeFile) {
                    file.addInclude(includeFile, paramsParts);
                });
            } else {
                file.addInclude(file, paramsParts);
            }
        }, this);

        this.registerDirective('without', function(file, params) {
            var paramsParts = params.split('::');
            var includeFname = file.getRelativePathOf(paramsParts.shift());
            return this.parseFile(includeFname).then(function(includeFile) {
                file.addWithout(includeFile, paramsParts);
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
            return fn.call(ctx, meta.fileStructure, arg ? arg.trim() : '');
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

    appendPostfilter: function(fn, ctx) {
        this._postfilters.push({
            fn: fn,
            ctx: ctx
        });
    },

    prependPostfilter: function(fn, ctx) {
        this._postfilters.unshift({
            fn: fn,
            ctx: ctx
        });
    },

    parseFile: function(fname) {
        var that = this;
        return that.normalizePath(fname).then(function(fname) {
            if (that._cache[fname]) {
                return that._cache[fname];
            }
            return fsReadFile(fname, 'utf8').then(function(content) {
                return that.parse(content, {fileStructure: new FileStructure(fname)}).then(function(meta) {
                    that._cache[fname] = meta.fileStructure;
                    return that._cache[fname];
                });
            });
        });
    },

    normalizePath: function(fname) {
        if (this._realpathCache[fname]) {
            return this._realpathCache[fname];
        }
        var that = this;
        return Q.all([fsRealpath(fname), fsStat(fname)]).then(function(results) {
            if (!results[1].isFile()) {
                throw new Error('File ' + fname + ' not found');
            }
            that._realpathCache[fname] = results[0].replace(/\\/g, '/');
            return that._realpathCache[fname];
        }).catch(function() {
            throw new Error('File ' + fname + ' not found');
        });
    }
});
