//=== index.js
//#include foo.js

//=== foo.js
alert(1);
//#label t2
alert(2);
//#endlabel
//#label t3
alert(3);
//#endlabel

//===
alert(1);
alert(2);
alert(3);
