/**
 * @typedef {JossyInputFile}
 * @prop {string} path - путь к файлу
 * @prop {Buffer|string} [contents] - содержимое файла. Если его нет, будет считан файл из path
 */
var JossyParser = require('./JossyParser');

module.exports = require('iclass').create({
    constructor: function() {
        this._parser = new JossyParser();
    },

    getParser: function() {
        return this._parser;
    },

    /**
     * @param {string|JossyInputFile} inputFile
     * @param {Array<string>} labels
     * @param {Object} context
     */
    compile: function(inputFile, labels, context) {
        return this.getParser().parseFile(inputFile).then(function(fileStructure) {
            return fileStructure.compile(labels, context);
        });
    }
});
