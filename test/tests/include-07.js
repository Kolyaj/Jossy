//=== index.js
//#include foo.js::l1

//=== foo.js
//#label l1
//#include bar.js
//#endlabel l1
//#label l2
alert(2);
//#endlabel l2

//=== bar.js
alert(1);
//#include foo.js::l2

//===
alert(1);
alert(2);
