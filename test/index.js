var Jossy = require('../lib/Jossy');
var assert = require('assert');
var fs = require('fs');
var path = require('path');

describe('Jossy', () => {
    var dirs = fs.readdirSync(__dirname);
    dirs.forEach((dir) => {
        var dirPath = path.join(__dirname, dir);
        if (fs.statSync(dirPath).isDirectory()) {
            it(dir, function() {
                return Promise.all([compile(dir), readResult(dir)]).then((results) => {
                    assert.equal(results[0].trim(), results[1].trim());
                });
            });
        }
    });
});

function compile(dir) {
    return new Jossy().compile(path.join(__dirname, dir, 'test.js'));
}

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
