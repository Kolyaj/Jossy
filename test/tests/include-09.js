//=== index.js
//#include foo.js::t1

//=== foo.js
alert(1);
//#label t1
//#include ::t2
alert(2);
//#endlabel t1
//#label t2
alert(3);
//#endlabel t2
alert(4);

//===
alert(1);
alert(3);
alert(4);

alert(2);
