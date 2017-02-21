var {Parser} = require('lblr-parser');
var iclass = require('iclass');

module.exports = iclass.create(Parser, {
    constructor: function() {
        Parser.call(this, true);

        this._promise = new Promise((resolve, reject) => {
            this.once('complete', () => {
                resolve(this);
            });
            this.once('error', (err) => {
                reject(err);
            });
        });

        this._root = {
            type: 'root',
            content: []
        };
        this._macroses = [];
        this._dependencies = {
            '': this
        };
        this._currentBlock = this._root;

        this.registerLineProcessor(/^/, (ignored, line) => {
            this._addCodeBlock(line);
        });

        this._registerDirective('include', true, (params) => {
            var paramsParts = params.split('::');
            var fname = paramsParts.shift();
            if (fname) {
                this._dependencies[fname] = null;
            }
            this._currentBlock.content.push({
                type: 'include',
                path: fname,
                labels: paramsParts
            });
        });

        this._registerDirective('without', true, (params) => {
            var paramsParts = params.split('::');
            var fname = paramsParts.shift();
            if (fname) {
                this._dependencies[fname] = null;
            }
            this._currentBlock.content.push({
                type: 'without',
                path: fname,
                labels: paramsParts
            });
        });

        this._registerDirective('label', true, (label) => {
            if (this._currentBlock.type == 'root') {
                var labelBlock = {
                    parent: this._currentBlock,
                    type: 'label',
                    label: label,
                    content: []
                };
                this._currentBlock.content.push(labelBlock);
                this._currentBlock = labelBlock;
            } else {
                this._createErrorCode('label directive must be at root level.');
            }
        });

        this._registerDirective('endlabel', false, () => {
            if (this._currentBlock.type == 'label') {
                this._currentBlock = this._currentBlock.parent;
            } else {
                this._createErrorCode('Unexpected endlabel directive.');
            }
        });

        this._registerDirective('if', true, (params) => {
            if (this._currentBlock.type == 'if') {
                this._createErrorCode('if directives can not be nested.');
            } else {
                var args = params.split(/\s+/);
                var value = true;
                if (args.length > 1 && args[0] == 'not') {
                    value = false;
                    args.shift();
                }
                var ifBlock = {
                    parent: this._currentBlock,
                    type: 'if',
                    varname: args[0],
                    value: value,
                    content: []
                };
                this._currentBlock.content.push(ifBlock);
                this._currentBlock = ifBlock;
            }
        });

        this._registerDirective('endif', false, () => {
            if (this._currentBlock.type == 'if') {
                this._currentBlock = this._currentBlock.parent;
            } else {
                this._createErrorCode('Unexpected endif directive.');
            }
        });

        this._registerDirective('set', true, (params) => {
            var args = params.split(/\s+/);
            this._currentBlock.content.push({
                type: 'set',
                varname: args[0],
                value: true
            });
        });

        this._registerDirective('unset', true, (params) => {
            var args = params.split(/\s+/);
            this._currentBlock.content.push({
                type: 'set',
                varname: args[0],
                value: false
            });
        });

        this._registerDirective('define', true, (params) => {
            var args = params.split(' ');
            let search = args.shift();
            let replacement = args.join(' ');
            this.addMacros(search, replacement);
        });

        this.once('complete', () => {
            if (this._currentBlock.type != 'root') {
                this._createErrorCode('Unexpected EOF.');
            }
        });
    },

    getEmptyDependencies: function() {
        return Object.keys(this._dependencies).filter((path) => {
            return !this._dependencies[path];
        });
    },

    setDependency: function(path, dependency) {
        this._dependencies[path] = dependency;
    },

    addMacros: function(search, replacement) {
        this._macroses.push({
            search: typeof search == 'string' ? new RegExp(search.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&'), 'g') : search,
            replacement: replacement
        });
    },

    compile: function(context, labels) {
        return this._compileBlock(this._root, context || {}, labels || []);
    },

    reset: function() {
        this._resetBlock(this._root);
    },

    getPromise: function() {
        return this._promise;
    },


    _registerDirective: function(name, needArgument, fn) {
        this.registerLineProcessor(new RegExp(`^\\s*//#${name}(\\s+[\\s\\S]*)?$`), (ignored, arg) => {
            arg = arg ? arg.trim() : '';
            if (needArgument && !arg) {
                this._createErrorCode(`${name} directive expected any argument.`);
            } else {
                return fn(arg);
            }
        });
    },

    _addCodeBlock: function(code) {
        this._macroses.forEach((macros) => {
            code = code.replace(macros.search, macros.replacement);
        });
        var lastBlock = this._currentBlock.content[this._currentBlock.content.length - 1];
        if (lastBlock && lastBlock.type == 'code') {
            lastBlock.code += code;
        } else {
            this._currentBlock.content.push({
                type: 'code',
                code: code,
                included: false
            });
        }
    },

    _createErrorCode: function(message) {
        this._addCodeBlock(`throw new Error("JossyError: ${message}");\n`);
    },

    _compileBlock: function(block, context, labels) {
        if (block.type == 'code') {
            if (!block.included) {
                block.included = true;
                return block.code;
            }

        } else if (block.type == 'include') {
            return this._dependencies[block.path].compile(context, block.labels);

        } else if (block.type == 'without') {
            this._dependencies[block.path].compile(context, block.labels);

        } else if (block.type == 'set') {
            context[block.varname] = block.value;

        } else if (this._isValidContentBlock(block, context, labels)) {
            return block.content.map((nestedBlock) => {
                return this._compileBlock(nestedBlock, context, labels);
            }).join('');
        }
        return '';
    },

    _isValidContentBlock: function(block, context, labels) {
        if (block.type == 'root') {
            return true;
        } else if (block.type == 'if') {
            return Boolean(context[block.varname]) == Boolean(block.value);
        } else if (block.type == 'label') {
            return !labels.length || labels.indexOf(block.label) > -1;
        }
        return false;
    },

    _resetBlock: function(block) {
        if (block.type == 'code') {
            block.included = false;
        } else if (block.content) {
            block.content.forEach(this._resetBlock, this);
        }
    }
});
