module.exports = require('iclass').create({
    constructor: function(msg, file, line) {
        this._message = msg;
        this._file = file;
        this._line = line;
    },

    toString: function() {
        return 'JossyError: ' + this._message + ' (' + this._file + ':' + this._line + ')';
    }
});
