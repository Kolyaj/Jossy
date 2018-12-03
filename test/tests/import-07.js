//=== index.js
alert('index');
//#import foo.js::bar

//=== foo.js
alert('foo');
//#label bar
//#import bar.js
//#endlabel

//=== bar.js
alert('bar');

//===
alert('bar');
alert('foo');
alert('index');
