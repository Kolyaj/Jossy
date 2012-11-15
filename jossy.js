function FileStructure() {
    this._root = {
        type: 'root',
        content: []
    };
    this._currentBlock = this._root;
}

FileStructure.prototype = {
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

    close: function() {
        if (this._currentBlock.type != 'root') {
            throw new Error('Неожиданный конец файла');
        }
    },

    reset: function() {
        this._resetBlock(this._root);
    },

    compile: function(labels, context) {
        labels = labels || [];
        context = context || {};
        var result = [];
        this._structure.forEach(function(block) {
            if (this._isValidBlock(block, labels, context)) {
                block.content.forEach(function(line) {
                    if (line.type == 'code' && !line.included) {
                        line.included = true;
                        result.push(line.code);
                    } else if (line.type == 'include') {
                        result.push(line.fileStructure.compile(line.labels, context));
                    } else if (line.type == 'set') {
                        context[line.varname] = line.value;
                    }
                });
            }
        }, this);
        return result.join('');
    },

    without: function(labels) {

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
            block.fileStructure.without(block.labels);
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