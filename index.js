if (require.main == module) {
    if (process.argv[2]) {
        var context = {};

        if (process.argv[2] == 'server') {
            var startContextArg = 3;
            var port = 9595;
            if (+process.argv[3]) {
                port = +process.argv[3];
                startContextArg = 4;
            }
            for (; startContextArg < process.argv.length; startContextArg++) {
                context[process.argv[startContextArg]] = true;
            }
            require('http').createServer(function(req, res) {
                var fname = require('url').parse(req.url).pathname;
                require('./jossy').compile(fname, [], context, function(err, result) {
                    if (err) {
                        console.log('Error: ' + err.message);
                        res.writeHead(500);
                        res.end('throw new Error(' + JSON.stringify('JossyError: ' + err.message) + ');');
                        return;
                    }
                    res.writeHead(200, {
                        'Content-Type': 'text/javascript; charset=UTF-8'
                    });
                    res.end(result);
                });
            }).listen(port);
        } else {
            var params = process.argv[2].split('::');
            for (var i = 3; i < process.argv.length; i++) {
                context[process.argv[i]] = true;
            }
            require('./jossy').compile(params.shift() || 'index.js', params, context, function(err, result) {
                if (err) {
                    throw err;
                }
                console.log(result);
            });
        }
    } else {
        console.log('Usage:');
    }
} else {
    module.exports = require('./jossy');
}