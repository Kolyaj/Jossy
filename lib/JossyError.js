module.exports = JossyError;

function JossyError(msg, file, line) {
    this._message = msg;
    this._file = file;
    this._line = line;
}

JossyError.prototype.toString = function() {
    return 'JossyError: ' + this._message + ' (' + this._file + ':' + this._line + ')';
};
