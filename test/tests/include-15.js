//=== index.js
//#include foo.js
alert('index');

//=== foo.js
alert('foo');
//#label foo
//#include bar.js::bar
alert('foo.foo');
//#endlabel foo

//=== bar.js
alert('bar');
//#label bar
//#include foo.js::foo
alert('bar.bar');
//#endlabel bar

//===
alert('foo');
alert('bar');
alert('foo.foo');
alert('bar.bar');
alert('index');
