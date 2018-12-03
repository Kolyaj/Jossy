//=== index.js
alert('index');
//#import foo.js::foo

//=== foo.js
alert('foo');
//#label foo
alert('foo::foo');
//#endlabel foo

//===
alert('foo');
alert('foo::foo');
alert('index');
