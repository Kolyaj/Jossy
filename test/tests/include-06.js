//=== index.js
//#include foo.js::t2

//=== foo.js
alert(1);
//#label t2
//#include ::t3
alert(2);
//#endlabel t2
//#label t3
alert(3);
//#endlabel t3
alert(1);

//===
alert(1);
alert(3);
alert(1);


alert(2);
