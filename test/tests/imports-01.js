//=== index.js
alert('index');
//#imports
//#import foo.js::bar

//=== foo.js
alert('foo');
//#label bar
//#import bar.js
//#endlabel

//=== bar.js
alert('bar');

//===
alert('index');
alert('bar');
alert('foo');
