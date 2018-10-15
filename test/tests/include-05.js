//=== index.js
//#include foo.js::t2::t4

//=== foo.js
alert(1);
//#label t2
alert(2);
//#endlabel
//#label t3
alert(3);
//#endlabel
//#label t4
alert(4);
//#endlabel
//#label t5
alert(5);
//#endlabel

//===
alert(1);
alert(2);
alert(4);
