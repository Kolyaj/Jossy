exports.compile = function(fname, labels, context, callback) {
    parseFile(fname, function(err, fileStructure) {
        if (err) {
            callback(err);
            return;
        }
        callback(null, fileStructure.compile(labels, context));
    });


    var cache = {};

    var directives = {
        include: function(file, params, callback) {
            var paramsParts = params.split('::');
            var includeFname = file.getRelativePathOf(paramsParts.shift());
            parseFile(includeFname, function(err, includeFile) {
                if (err) {
                    callback(err);
                    return;
                }
                file.addInclude(includeFile, paramsParts);
                callback();
            });
        },

        label: function(file, label) {
            file.beginLabel(label);
        },

        endlabel: function(file) {
            file.endLabel();
        }
    };

    function parseFile(fname, callback) {
        require('path').exists(fname, function(exists) {
            if (!exists) {
                callback(new Error('File ' + fname + ' not found'));
                return;
            }
            realpath(fname, function(err, fname) {
                if (err) {
                    callback(err);
                    return;
                }
                if (cache[fname]) {
                    callback(null, cache[fname]);
                    return;
                }
                require('fs').readFile(fname, 'utf8', function(err, content) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    var fileStructure = new FileStructure(fname);
                    cache[fname] = fileStructure;
                    var lines = content.split('\n');
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
                            if (line.match(/^\s*\/\/#(.*)$/)) {
                                if (RegExp.$1) {
                                    var command = RegExp.$1.split(' ');
                                    var directive = command.shift();
                                    var params = command.join(' ');
                                    if (/^(include)$/.test(directive)) {
                                        directives[directive](fileStructure, params, asyncParseCallback);
                                        return;
                                    } else if (/^(label|endlabel)$/.test(directive)) {
                                        try {
                                            directives[directive](fileStructure, params);
                                        } catch (err) {
                                            appendError(err);
                                        }
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
        });
    }
};

var realpathCache = {};
function realpath(fname, callback) {
    if (realpathCache[fname]) {
        callback(null, realpathCache[fname]);
    } else {
        require('fs').realpath(fname, function(err, absFname) {
            if (err) {
                callback(err);
                return;
            }
            absFname = absFname.replace(/\\/g, '/');
            realpathCache[fname] = absFname;
            callback(null, absFname);
        });
    }
}


function FileStructure(fname) {
    this._fname = fname;
    this._root = {
        type: 'root',
        content: []
    };
    this._currentBlock = this._root;
}

FileStructure.prototype = {
    getRelativePathOf: function(fname) {
        var path = require('path');
        return path.join(path.dirname(this._fname), fname);
    },

    addCode: function(code) {
        this._currentBlock.content.push({
            type: 'code',
            code: code,
            included: false
        })
    },
    
    addInclude: function(fileStructure, labels) {
        this._currentBlock.content.push({
            type: 'include',
            fileStructure: fileStructure,
            labels: labels
        });
    },

    addWithout: function(fileStructure, labels) {
        this._currentBlock.content.push({
            type: 'without',
            fileStructure: fileStructure,
            labels: labels
        });
    },

    addSet: function(varname) {
        this._currentBlock.content.push({
            type: 'set',
            varname: varname,
            value: true
        });
    },

    addUnset: function(varname) {
        this._currentBlock.content.push({
            type: 'set',
            varname: varname,
            value: false
        });
    },
    
    beginIf: function(varname, value) {
        if (this._currentBlock.type == 'if') {
            throw new Error('Блок if не может быть вложенным');
        }
        var ifBlock = {
            parent: this._currentBlock,
            type: 'if',
            varname: varname,
            value: value,
            content: []
        };
        this._currentBlock.content.push(ifBlock);
        this._currentBlock = ifBlock;
    },
    
    endIf: function() {
        if (this._currentBlock.type != 'if') {
            throw new Error('Попытка закрыть неоткрытый блок if');
        }
        this._currentBlock = this._currentBlock.parent;
    },
    
    beginLabel: function(label) {
        if (this._currentBlock.type != 'root') {
            throw new Error('Блок label не может быть ни во что вложенным');
        }
        var labelBlock = {
            parent: this._currentBlock,
            type: 'label',
            label: label,
            content: []
        };
        this._currentBlock.content.push(labelBlock);
        this._currentBlock = labelBlock;
    },
    
    endLabel: function() {
        if (this._currentBlock.type != 'label') {
            throw new Error('Попытка закрыть неоткрытый блок label');
        }
        this._currentBlock = this._currentBlock.parent;
    },

    error: function(msg) {
        this.addCode('throw new Error("Jossy error: " + ' + JSON.stringify(msg) + ');\n');
    },

    close: function() {
        if (this._currentBlock.type != 'root') {
            throw new Error('Неожиданный конец файла');
        }
    },

    reset: function() {
        this._resetBlock(this._root);
    },

    compile: function(labels, context) {
        return this._compileBlock(this._root, labels || [], context || {});
    },

    without: function(labels, context) {
        this._compileBlock(this._root, labels || [], context || {});
    },
    

    _resetBlock: function(block) {
        if (block.type == 'code') {
            block.included = false;
        } else if (block.type == 'include' || block.type == 'without') {
            block.fileStructure.reset();
        } else if (block.content) {
            block.content.forEach(this._resetBlock, this);
        }
    },

    _compileBlock: function(block, labels, context) {
        if (block.type == 'code') {
            if (!block.included) {
                block.included = true;
                return block.code;
            }

        } else if (block.type == 'include') {
            return block.fileStructure.compile(block.labels, context);

        } else if (block.type == 'without') {
            block.fileStructure.without(block.labels, context);
            return '';

        } else if (block.type == 'set') {
            context[block.varname] = block.value;

        } else if (this._isValidContentBlock(block, labels, context)) {
            return block.content.map(function(nestedBlock) {
                return this._compileBlock(nestedBlock, labels, context);
            }, this).join('');
        }
        return '';
    },

    _isValidContentBlock: function(block, labels, context) {
        if (block.type == 'root') {
            return true;
        } else if (block.type == 'if') {
            return !!context[block.varname] == !!block.value;
        } else if (block.type == 'label') {
            return labels.indexOf(block.label) > -1 || labels.indexOf('full') > -1;
        }
        return false;
    }
};


function JossyError(msg, file, line) {
    this._message = msg;
    this._file = file;
    this._line = line;
}

JossyError.prototype.toString = function() {
    return 'JossyError: ' + this._message + ' (' + this._file + ':' + this._line + ')';
};