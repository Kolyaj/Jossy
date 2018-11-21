//=== index.js
//#include foo.js
alert('index');

//=== foo.js
//#include bar.js
alert('foo');

//=== bar.js
//#include foo.js
alert('bar');

//===
alert('foo');


alert('bar');


alert('index');
