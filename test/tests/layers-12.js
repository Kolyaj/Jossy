//@layers=css
//=== index.js
//#import foo.js
alert('index');

//=== foo.js
//#layer css
alert('css');
//#endlayer
alert('foo');

//===
alert('css');
alert('foo');
alert('index');
