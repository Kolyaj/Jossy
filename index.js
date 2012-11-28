if (require.main == module) {
    if (process.argv[2]) {
        var params = process.argv[2].split('::');
        var context = {};
        for (var i = 3; i < process.argv.length; i++) {
            context[process.argv[i]] = true;
        }
        require('./jossy').compile(params.shift() || 'index.js', params, context, function(err, result) {
            if (err) {
                throw err;
            }
            console.log(result);
        });
    } else {
        console.log('Usage:');
    }
} else {
    module.exports = require('./jossy');
}