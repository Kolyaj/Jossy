var JossyParser = require('./lib/JossyParser');

exports.compile = function(readFile, fname, labels, context, callback) {
    if (typeof readFile != 'function') {
        callback = context;
        context = labels;
        labels = fname;
        fname = readFile;
        readFile = null;
    }
    new JossyParser(readFile).parseFile(fname, function(err, fileStructure) {
        if (err) {
            callback(err);
            return;
        }
        callback(null, fileStructure.compile(labels, context));
    });
};
