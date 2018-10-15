//=== index.js
//#include foo.js::t3
//#include foo.js::t2

//=== foo.js
alert('t1');
//#label t2
alert('t2');
//#endlabel t2
//#label t3
alert('t3');
//#endlabel t3

//===
alert('t1');
alert('t3');

alert('t2');
