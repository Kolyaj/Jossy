//=== index.js
alert('index1');
//#imports
alert('index2');
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
alert('index1');
alert('index2');
alert('bar');
alert('foo');
