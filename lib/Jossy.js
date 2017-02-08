var JossyParser = require('./JossyParser');

module.exports = require('iclass').create({
    constructor: function() {
        this._parser = new JossyParser();
    },

    getParser: function() {
        return this._parser;
    },

    compile: function(fname, labels, context) {
        return this._parser.parseFile(fname).then(function(fileStructure) {
            return fileStructure.compile(labels, context);
        });
    }
});
