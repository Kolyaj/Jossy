var basePath = 'tests';
var Jossy = require('../jossy').Jossy;
var jossy = new Jossy();

if (process.argv[2]) {
    jossy.compile(require('path').join(basePath, process.argv[2], 'test.js'), [], {}).then(function(result) {
        console.log(result);
    }).catch(function(err) {
        console.error(err.stack);
    });
} else {
    require('fs').readdir(basePath, function(err, dirs) {
        if (err) {
            throw err;
        }
        dirs.forEach(function(dir) {
            var dirPath = require('path').join(basePath, dir);
            require('fs').stat(dirPath, function(err, stat) {
                if (err) {
                    throw err;
                }
                if (stat.isDirectory()) {
                    jossy.compile(require('path').join(dirPath, 'test.js'), [], {}).then(function(jossyResult) {
                        require('fs').readFile(require('path').join(dirPath, 'result.js'), 'utf8', function(err, result) {
                            if (err) {
                                throw err;
                            }
                            var status = jossyResult.trim() == result.trim() ? '\033[92mok\033[39m' : '\033[91mfail\033[39m';
                            var tabs = '\t' + (dir.length < 8 ? '\t' : '');
                            console.log(dir + tabs + status);
                        });
                    }).catch(function(err) {
                        console.log(dir);
                        console.error(err.stack);
                    });
                }
            });
        });
    });
}
