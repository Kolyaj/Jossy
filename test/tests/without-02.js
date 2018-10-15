//=== index.js
//#without foo.js::t3
//#include foo.js

//=== foo.js
alert(1);
//#label t2
alert(2);
//#endlabel t2
//#label t3
alert(3);
//#endlabel t3

//===
alert(2);
