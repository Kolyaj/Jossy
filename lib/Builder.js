var iclass = require('iclass');

module.exports.Builder = iclass.create({
    constructor: function(failOnErrors = false) {
        this._failOnErrors = failOnErrors;
        this._root = {
            type: 'root',
            content: [
                {
                    type: 'imports',
                    content: []
                }
            ]
        };
        this._macroses = [];
        this._dependencies = {
            '': this
        };
        this._currentBlock = this._root;
        this._currentImportsBlock = this._root.content[0];
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

    compile: function(context, labels, layers) {
        if (this._completed) {
            return this._compileBlock(this._root, context || {}, labels || [], layers);
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

    importsHere: function() {
        if (this._currentBlock.type === 'root') {
            this._currentBlock.content.splice(this._currentBlock.content.indexOf(this._currentImportsBlock), 1);
            this._currentBlock.content.push(this._currentImportsBlock);
        } else {
            this.appendError('Imports cannot be inside if or label');
        }
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
        if (this._failOnErrors) {
            throw new Error(message);
        }

        this.appendCode(`throw new Error("JossyError: ${message}");\n`);
    },

    appendInclude: function(fname, labels) {
        this._insertInclude(this._currentBlock, fname, labels);
    },

    appendImport: function(fname, labels) {
        this._insertInclude(this._currentImportsBlock, fname, labels);
    },

    appendWithout: function(fname, labels) {
        if (fname) {
            this._dependencies[fname] = null;
        }
        this._currentImportsBlock.content.push({
            type: 'without',
            path: fname,
            labels: labels,
            compiledWhen: {}
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
            var importsLabelBlock = {
                parent: this._currentImportsBlock,
                type: 'label',
                label: label,
                content: []
            };
            this._currentImportsBlock.content.push(importsLabelBlock);
            this._currentImportsBlock = importsLabelBlock;
        } else {
            this.appendError('label directive must be at root level.');
        }
    },

    appendEndlabel: function() {
        if (this._currentBlock.type === 'label') {
            this._currentBlock = this._currentBlock.parent;
            this._currentImportsBlock = this._currentImportsBlock.parent;
        } else {
            this.appendError('Unexpected endlabel directive.');
        }
    },

    appendLayer: function(layer) {
        if (this._currentBlock.type === 'root') {
            var layerBlock = {
                parent: this._currentBlock,
                type: 'layer',
                layer: layer,
                content: []
            };
            this._currentBlock.content.push(layerBlock);
            this._currentBlock = layerBlock;
            var importsLayerBlock = {
                parent: this._currentImportsBlock,
                type: 'layer',
                layer: layer,
                content: []
            };
            this._currentImportsBlock.content.push(importsLayerBlock);
            this._currentImportsBlock = importsLayerBlock;
        } else {
            this.appendError('layer directive must be at root level.');
        }
    },

    appendEndLayer: function() {
        if (this._currentBlock.type === 'layer') {
            this._currentBlock = this._currentBlock.parent;
            this._currentImportsBlock = this._currentImportsBlock.parent;
        } else {
            this.appendError('Unexpected endlayer directive');
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
            var importsIfBlock = {
                parent: this._currentImportsBlock,
                type: 'if',
                varname: varname,
                value: value,
                content: []
            };
            this._currentImportsBlock.content.push(importsIfBlock);
            this._currentImportsBlock = importsIfBlock;
        }
    },

    appendEndif: function() {
        if (this._currentBlock.type === 'if') {
            this._currentBlock = this._currentBlock.parent;
            this._currentImportsBlock = this._currentImportsBlock.parent;
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


    _insertInclude: function(target, fname, labels) {
        if (fname) {
            this._dependencies[fname] = null;
        }
        target.content.push({
            type: 'include',
            path: fname,
            labels: labels,
            compiledWhen: {}
        });
    },

    _compileBlock: function(block, context, labels, layers) {
        var contextHash = Object.keys(context).filter((varname) => {
            return context[varname];
        });
        contextHash += layers;

        if (block.type === 'code') {
            if (typeof layers !== 'string' && !block.included) {
                block.included = true;
                return block.code;
            }
        } else if (block.type === 'include') {
            if (!block.compiledWhen[contextHash]) {
                block.compiledWhen[contextHash] = true;
                return this._dependencies[block.path].compile(context, block.labels, layers);
            }
        } else if (block.type === 'without') {
            if (!block.compiledWhen[contextHash]) {
                block.compiledWhen[contextHash] = true;
                this._dependencies[block.path].compile(context, block.labels, layers);
            }
        } else if (block.type === 'set') {
            context[block.varname] = block.value;
        } else if (this._isValidContentBlock(block, context, labels, layers)) {
            return block.content.map((nestedBlock) => {
                return this._compileBlock(nestedBlock, context, labels, block.type === 'layer' ? null : layers);
            }).join('');
        }
        return '';
    },

    _isValidContentBlock: function(block, context, labels, layers) {
        if (block.type === 'root' || block.type === 'imports') {
            return true;
        } else if (block.type === 'if') {
            return Boolean(context[block.varname]) === Boolean(block.value);
        } else if (block.type === 'label') {
            return !labels.length || labels.indexOf(block.label) > -1;
        } else if (block.type === 'layer') {
            return (typeof layers === 'string' && block.layer === layers) || (Array.isArray(layers) && layers.indexOf(block.layer) > -1);
        }
        return false;
    },

    _resetBlock: function(block) {
        if (block.type === 'code') {
            block.included = false;
        } else if (block.type === 'include' || block.type === 'without') {
            block.compiledWhen = {};
        } else if (block.content) {
            block.content.forEach(this._resetBlock, this);
        }
    }
});
