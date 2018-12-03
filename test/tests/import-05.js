//=== index.js
//#set a
//#include foo.js

//=== foo.js
alert('foo');
/*#if a#*//*#import bar.js#*//*#endif#*/

//=== bar.js
alert('bar');

//===
alert('bar');
alert('foo');
