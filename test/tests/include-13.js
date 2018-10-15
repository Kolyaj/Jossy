//=== index.js
//#include foo.js::t

//=== foo.js
alert(1);
//#label t
//#include bar.js
//#endlabel t

//=== bar.js
//#include foo.js::

//===
alert(1);
