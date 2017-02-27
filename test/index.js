var jossy = require('../lib/Jossy');
var assert = require('assert');
var fs = require('fs');
var path = require('path');

describe('Jossy', () => {
    var dirs = fs.readdirSync(__dirname);
    dirs.forEach((dir) => {
        var dirPath = path.join(__dirname, dir);
        if (fs.statSync(dirPath).isDirectory()) {
            it(dir, function() {
                return Promise.all([jossy(path.join(__dirname, dir, 'test.js')), readResult(dir)]).then((results) => {
                    assert.equal(results[0].trim(), results[1].trim());
                });
            });
        }
    });

    it('Multiple compile', function() {
        var compiler = new jossy.Jossy();
        var dir = 'include-11';
        return readResult(dir).then((result) => {
            return compiler.compile(path.join(__dirname, dir, 'test.js')).then((compileResult1) => {
                assert.equal(compileResult1, result);
                return compiler.compile(path.join(__dirname, dir, 'test.js')).then((compileResult2) => {
                    assert.equal(compileResult2, result);
                });
            });
        });
    });

    it('Multiple concurent compile', function() {
        var compiler = new jossy.Jossy();
        var dir = 'include-11';
        return readResult(dir).then((result) => {
            return Promise.all([compiler.compile(path.join(__dirname, dir, 'test.js')), compiler.compile(path.join(__dirname, dir, 'test.js'))]).then(([compileResult1, compileResult2]) => {
                assert.equal(compileResult1, result);
                assert.equal(compileResult2, result);
            });
        });
    });
});

function readResult(dir) {
    return new Promise((resolve, reject) => {
        var dirname = path.join(__dirname, dir);
        fs.readFile(path.join(dirname, 'result.js'), 'utf8', (err, content) => {
            if (err) {
                reject(err);
            } else {
                resolve(content.replace(/\$\{__dirname}/g, dirname));
            }
        });
    });
}
