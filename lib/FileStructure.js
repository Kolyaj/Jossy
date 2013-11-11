module.exports = FileStructure;

function FileStructure(fname) {
    this._fname = fname;
    this._root = {
        type: 'root',
        content: []
    };
    this._macroses = [];
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

    addMacros: function(search, replacement) {
        this._currentBlock.content.push({
            type: 'macros',
            search: search,
            replacement: replacement
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
        this.addCode('throw new Error(' + JSON.stringify('Jossy error: ' + msg) + ');\n');
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
                return this._applyMacroses(block.code);
            }

        } else if (block.type == 'include') {
            return block.fileStructure.compile(block.labels, context);

        } else if (block.type == 'without') {
            block.fileStructure.without(block.labels, context);
            return '';

        } else if (block.type == 'set') {
            context[block.varname] = block.value;

        } else if (block.type == 'macros') {
            this._macroses.push(block);

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
            return !labels.length || labels.indexOf(block.label) > -1;
        }
        return false;
    },

    _applyMacroses: function(code) {
        this._macroses.forEach(function(macros) {
            code = code.split(macros.search).join(macros.replacement);
        });
        return code;
    }
};
