var iclass = require('iclass');

module.exports.Builder = iclass.create({
    constructor: function() {
        this._root = {
            type: 'root',
            content: []
        };
        this._macroses = [];
        this._dependencies = {
            '': this
        };
        this._currentBlock = this._root;
        this._completed = false;
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
            search: typeof search === 'string' ? new RegExp(search.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&'), 'g') : search,
            replacement: replacement
        });
    },

    compile: function(context, labels) {
        if (this._completed) {
            return this._compileBlock(this._root, context || {}, labels || []);
        } else {
            throw new Error('Builder is not ready for compile.');
        }
    },

    end: function() {
        if (this._currentBlock.type !== 'root') {
            this.appendError('Unexpected EOF.');
        }
        this._completed = true;
    },

    reset: function() {
        this._resetBlock(this._root);
    },

    appendCode: function(code) {
        var lastBlock = this._currentBlock.content[this._currentBlock.content.length - 1];
        code = this._macroses.reduce((code, macros) => {
            return code.replace(macros.search, macros.replacement);
        }, code);
        if (lastBlock && lastBlock.type === 'code') {
            lastBlock.code += code;
        } else {
            this._currentBlock.content.push({
                type: 'code',
                code: code,
                included: false
            });
        }
    },

    appendError: function(message) {
        this.appendCode(`throw new Error("JossyError: ${message}");\n`);
    },

    appendInclude: function(fname, labels) {
        if (fname) {
            this._dependencies[fname] = null;
        }
        this._currentBlock.content.push({
            type: 'include',
            path: fname,
            labels: labels
        });
    },

    appendWithout: function(fname, labels) {
        if (fname) {
            this._dependencies[fname] = null;
        }
        this._currentBlock.content.push({
            type: 'without',
            path: fname,
            labels: labels
        });
    },

    appendLabel: function(label) {
        if (this._currentBlock.type === 'root') {
            var labelBlock = {
                parent: this._currentBlock,
                type: 'label',
                label: label,
                content: []
            };
            this._currentBlock.content.push(labelBlock);
            this._currentBlock = labelBlock;
        } else {
            this.appendError('label directive must be at root level.');
        }
    },

    appendEndlabel: function() {
        if (this._currentBlock.type === 'label') {
            this._currentBlock = this._currentBlock.parent;
        } else {
            this.appendError('Unexpected endlabel directive.');
        }
    },

    appendIf: function(varname, value) {
        if (this._currentBlock.type === 'if') {
            this.appendError('if directives can not be nested.');
        } else {
            var ifBlock = {
                parent: this._currentBlock,
                type: 'if',
                varname: varname,
                value: value,
                content: []
            };
            this._currentBlock.content.push(ifBlock);
            this._currentBlock = ifBlock;
        }
    },

    appendEndif: function() {
        if (this._currentBlock.type === 'if') {
            this._currentBlock = this._currentBlock.parent;
        } else {
            this.appendError('Unexpected endif directive.');
        }
    },

    appendSet: function(varname) {
        this._currentBlock.content.push({
            type: 'set',
            varname: varname,
            value: true
        });
    },

    appendUnset: function(varname) {
        this._currentBlock.content.push({
            type: 'set',
            varname: varname,
            value: false
        });
    },


    _compileBlock: function(block, context, labels) {
        if (block.type === 'code') {
            if (!block.included) {
                block.included = true;
                return block.code;
            }

        } else if (block.type === 'include') {
            return this._dependencies[block.path].compile(context, block.labels);

        } else if (block.type === 'without') {
            this._dependencies[block.path].compile(context, block.labels);

        } else if (block.type === 'set') {
            context[block.varname] = block.value;

        } else if (this._isValidContentBlock(block, context, labels)) {
            return block.content.map((nestedBlock) => {
                return this._compileBlock(nestedBlock, context, labels);
            }).join('');
        }
        return '';
    },

    _isValidContentBlock: function(block, context, labels) {
        if (block.type === 'root') {
            return true;
        } else if (block.type === 'if') {
            return Boolean(context[block.varname]) === Boolean(block.value);
        } else if (block.type === 'label') {
            return !labels.length || labels.indexOf(block.label) > -1;
        }
        return false;
    },

    _resetBlock: function(block) {
        if (block.type === 'code') {
            block.included = false;
        } else if (block.content) {
            block.content.forEach(this._resetBlock, this);
        }
    }
});
