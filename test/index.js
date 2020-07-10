var jossy = require('../lib/Jossy');
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var {promisify} = require('util');
var mock = require('mock-fs');

var readFile = promisify(fs.readFile);

var readTest = async(testFileName) => {
    var files = {};
    var input;
    var output;
    var layers;
    var currentFileContent;
    var testContent = await readFile(path.join(__dirname, 'tests', testFileName), 'utf8');
    testContent.split('\n').forEach((line) => {
        if (line.match(/^\/\/@(layer|layers)=(.*)/)) {
            var name = RegExp.$1;
            var value = RegExp.$2;
            if (name === 'layer') {
                layers = value.trim();
            } else if (name === 'layers') {
                layers = value.split(',').map((item) => {
                    return item.trim();
                });
            }
        } else if (line.indexOf('//===') === 0) {
            var fname = line.substr(5).trim();
            currentFileContent = [];
            if (fname) {
                if (!input) {
                    input = fname;
                }
                files[fname] = currentFileContent;
            } else {
                output = currentFileContent;
            }
        } else {
            if (currentFileContent) {
                currentFileContent.push(line + '\n');
            } else {
                throw new Error(`Unexpected file content in ${testFileName}`);
            }
        }
    });
    Object.keys(files).forEach((fname) => {
        files[fname] = files[fname].join('').trim();
    });
    if (!input) {
        throw new Error(`No file found in ${testFileName}`);
    }
    if (!output) {
        throw new Error(`Output not found in ${testFileName}`);
    }
    return {
        files: files,
        input: input,
        output: output.join('').trim(),
        layers: layers
    };
};

describe('Jossy', () => {
    afterEach(() => {
        mock.restore();
    });

    fs.readdirSync(path.join(__dirname, 'tests')).forEach((fname) => {
        if (/\.js$/.test(fname)) {
            it(fname.substr(0, fname.length - 3), async() => {
                var test = await readTest(fname);
                mock(test.files);
                var result = await new jossy.Jossy().compile(test.input, {}, test.layers);
                assert.equal(result.trim(), test.output.trim());
            });
        }
    });

    it('Multiple compile', async() => {
        var compiler = new jossy.Jossy();
        var test = await readTest('include-11.js');
        mock(test.files);
        var result1 = await compiler.compile(test.input);
        var result2 = await compiler.compile(test.input);
        assert.equal(result1.trim(), test.output.trim());
        assert.equal(result2.trim(), test.output.trim());
    });

    it('Multiple concurent compile', async() => {
        var compiler = new jossy.Jossy();
        var test = await readTest('include-11.js');
        mock(test.files);
        var [result1, result2] = await Promise.all([compiler.compile(test.input), compiler.compile(test.input)]);
        assert.equal(result1.trim(), test.output.trim());
        assert.equal(result2.trim(), test.output.trim());
    });

    it('Compile inline code', async() => {
        var compiler = new jossy.Jossy();
        mock({
            '/foo/bar.js': 'alert(1);'
        });
        var result = await compiler.compileCode('/foo/baz.js', '//#include bar.js');
        assert.equal(result.trim(), 'alert(1);');
    });

    it('Build error', async() => {
        var compiler = new jossy.Jossy();
        mock({
            '/foo/bar.js': '//#include foo.js'
        });
        var result = await compiler.compile('/foo/bar.js');
        assert.equal(result.trim(), 'throw new Error("JossyError: ENOENT, no such file or directory \'/foo/foo.js\'.");');
    });

    it('Build error and failOnError', async() => {
        var compiler = new jossy.Jossy(true);
        mock({
            '/foo/bar.js': '//#include foo.js'
        });
        assert.rejects(async() => {await compiler.compile('/foo/bar.js');}, {message: /no such file or directory/});
    });
});
