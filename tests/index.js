require('../jossy').compile('include-01/test.js', [], {}, function(err, result) {
    if (err) {
        throw err;
    }
    console.log(result);
});

