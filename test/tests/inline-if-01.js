//=== index.js
//#set a
/*#if a #*/alert('a');/*#endif#*//*#if not a #*/alert('not a');/*#endif#*/
alert('-');
//#unset a
/*#if a #*/alert('a');/*#endif#*//*#if not a #*/alert('not a');/*#endif#*/

//===
alert('a');
alert('-');
alert('not a');
