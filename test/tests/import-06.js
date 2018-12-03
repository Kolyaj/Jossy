//=== index.js
alert('index');
//#import foo.js::

//=== foo.js
alert('foo');
//#label bar
//#import bar.js
//#endlabel

//=== bar.js
alert('bar');

//===
alert('foo');
alert('index');
