if (require.main == module) {
    require('./jossy').compile(process.argv[2], [], {}, function(err, result) {
        if (err) {
            throw err;
        }
        console.log(result);
    });
} else {
    module.exports = require('./jossy');
}