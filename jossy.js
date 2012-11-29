var JossyParser = require('./lib/JossyParser');

exports.compile = function(fname, labels, context, callback) {
    new JossyParser().parseFile(fname, function(err, fileStructure) {
        if (err) {
            callback(err);
            return;
        }
        callback(null, fileStructure.compile(labels, context));
    });
};
