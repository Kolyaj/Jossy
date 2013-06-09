var FileStructure, JossyError, fileExists;

FileStructure = require('./FileStructure');
JossyError = require('./JossyError');
fileExists = require('fs').exists || require('path').exists;

function _include(file, params, callback) {
    var paramsParts = params.split('::');
    var includeFileName = paramsParts.shift();
    if (includeFileName) {
        var absFileName = file.getRelativePathOf(includeFileName);
        this.parseFile(absFileName, function(err, includeFile) {
            if (err) {
                callback(err);
                return;
            }
            file.addInclude(includeFile, paramsParts);
            callback();
        });
    } else {
        try {
            file.addInclude(file, paramsParts);
            callback();
        } catch (err) {
            callback(err);
        }
    }
}

function _without(file, params, callback) {
    var paramsParts = params.split('::');
    var includeFname = file.getRelativePathOf(paramsParts.shift());
    this.parseFile(includeFname, function(err, includeFile) {
        if (err) {
            callback(err);
            return;
        }
        file.addWithout(includeFile, paramsParts);
        callback();
    });
}

function _label(file, label) {
    file.beginLabel(label);
}

function _endlabel(file) {
    file.endLabel();
}

function _if(file, params) {
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
}

function _endif(file) {
    file.endIf();
}

function _set(file, params) {
    if (!params.trim()) {
        throw new Error('Bad set directive');
    }
    var args = params.split(/\s+/);
    file.addSet(args[0]);
}

function _unset(file, params) {
    if (!params.trim()) {
        throw new Error('Bad unset directive');
    }
    var args = params.split(/\s+/);
    file.addUnset(args[0]);
}

function parseFile(fname, callback) {
    var that = this;
    normalizePath(fname, function(err, fname) {
        if (err) {
            callback(err);
            return;
        }
        if (that._cache[fname]) {
            callback(null, that._cache[fname]);
            return;
        }
        require('fs').readFile(fname, 'utf8', function(err, content) {
            if (err) {
                callback(err);
                return;
            }
            var fileStructure = new FileStructure(fname);
            that._cache[fname] = fileStructure;
            var lines = content.split(/\r?\n/);
            (function parseLines(start) {
                var i;
                var errors = [];

                var appendError = function(err) {
                    var msg = err.message;
                    var line = i + 1;
                    errors.push(new JossyError(msg, fname, line));
                    fileStructure.error(msg);
                };

                var asyncParseCallback = function(err) {
                    if (err) {
                        appendError(err);
                    }
                    parseLines(i + 1);
                };

                for (i = start; i < lines.length; i++) {
                    var line = lines[i];
                    if (line.match(/^\s*\/\/(#|\s*@)([\s\S]*)$/)) {
                        if (RegExp.$2) {
                            var command = RegExp.$2.split(' ');
                            var directive = command.shift();
                            var params = command.join(' ');
                            if (/^(require|include|without)$/.test(directive)) {
                                that['_' + directive](fileStructure, params, asyncParseCallback);
                                return;
                            } else if (/^(label|endlabel|if|endif|set|unset)$/.test(directive)) {
                                try {
                                    that['_' + directive](fileStructure, params);
                                } catch (err) {
                                    appendError(err);
                                }
                            } else if (RegExp.$1.indexOf('@') === -1) {
                                appendError(new Error('Unknown directive ' + directive));
                            }
                        }
                    } else {
                        fileStructure.addCode(line + (i < lines.length - 1 ? '\n' : ''));
                    }
                }

                callback(null, fileStructure);
            })(0);
        });
    });
}

function JossyParser() {
    this._cache = {};
}

JossyParser.prototype = {
    parseFile: parseFile,

    _include: _include,
    _require: _include,
    _without: _without,
    _label: _label,
    _endlabel: _endlabel,
    _if: _if,
    _endif: _endif,
    _set: _set,
    _unset: _unset
};

var realpathCache = {};
function normalizePath(fname, callback) {
    if (realpathCache[fname]) {
        callback(null, realpathCache[fname]);
    } else {
        fileExists(fname, function(exists) {
            if (!exists) {
                callback(new Error('File ' + fname + ' not found'));
                return;
            }
            require('fs').realpath(fname, function(err, absFname) {
                if (err) {
                    callback(err);
                    return;
                }
                require('fs').stat(fname, function(err, stat) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    if (!stat.isFile()) {
                        callback(new Error('File ' + fname + ' not found'));
                        return;
                    }
                    absFname = absFname.replace(/\\/g, '/');
                    realpathCache[fname] = absFname;
                    callback(null, absFname);
                });
            });
        });
    }
}

module.exports = JossyParser;
