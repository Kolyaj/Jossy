# Jossy

Jossy -- сборщик JS-файлов в один или несколько модулей. При правильном использовании позволяет не только легко собирать модули, но и также легко пересобирать их при изменении принципов сборки.

## Установка

Jossy написан на NodeJS, поэтому сначала необходимо установить на разработческую машину сам NodeJS. Если NodeJS у вас уже установлен, то достаточно набрать

    npm install -g jossy

Jossy необходим только на этапе разработки, поэтому на боевых серверах NodeJS не понадобится (если вы его, конечно, больше нигде не используете).

## Синтаксис и возможности

### Подключение файлов

Включить содержимое внешнего файла в текущий можно директивой `#include`

    //#include file.js

Путь к файлу указывается относительно расположения текущего файла. Технически, вместо строки с директивой просто вставляется содержимое указанного файла. Однако, если указанный файл уже подключен в текущем модуле ранее, то повторно он включен не будет. Например, файл f1.js

    alert(1);

Файл f2.js

    //#include f1.js
    alert(2);

И файл f3.js

    //#include f1.js
    //#include f2.js

Если скормить Jossy файл f3.js, то на выходе получим

    alert(1);
    alert(2);

### Исключение файлов из сборки

Директива `#without` указывает Jossy исключить из сборки все файлы, которые используются в указанном (включая указанный, разумеется).

Пример. В проекте есть несколько десятков виджетов. Код каждого виджета лежит в отдельном файле. В каждом виджете указаны его зависимости с помощью директивы `#include`. Какие-то виджеты используются на большинстве страниц, и при сборке логично их код вынести в отдельный файл common.js. Выбираем часто используемые виджеты, создаём файл common.js и пишем туда

    //#include widget1.js
    //#include widget2.js
    //#include widget3.js

На одной из страниц используется виджет, достаточно объёмный, чтобы не включать его в common.js, назовём его big-widget. В файле big-widget.js указаны его зависимости, среди которых, разумеется, много тех, которые уже есть в common.js. Если мы просто соберём файл big-widget.js, то получим много продублированного кода. Поэтому рядом с common.js создаём файл feature.js с содержимым

    //#without common.js
    //#include big-widget.js

Теперь код, попавший в common.js, не попадёт в feature.js. Главное не забыть подключить на страницу не только feature.js, но и common.js.

### Условная сборка

В процессе сборки можно определять булевые флаги, в зависимости от которых выводить или не выводить строки кода.

    //#set flag

    //#if flag
    alert('flag');
    //#endif

    //#if not flag
    alert('not flag');
    //#endif

    //#unset flag

Флаги глобальные. Указать их можно не только в коде директивами `#set` и `#unset`, но при запуске сборщика (о запуске сборщика ниже).

Например, файл file.js

    //#if ie
    alert('IE only');
    //#endif

Файл common.js

    //#include file.js

И файл common-ie.js

    //#set ie
    //#include file.js

Точно также можно создать флаг debug и писать отладочные строки только внутри `//#if debug ... //#endif`, тогда отладочный код никогда не попадёт на боевые сервера.

### Подключение кусков файлов

Эта фича узкоспециализирована, но очень полезна при разработке библиотек и фреймворков. Например, в нашей библиотеке есть файл String.js, содержащий несколько десятков функций для работы со строками. Выделять каждую функцию в отдельный файл как-то неправильно, но и подключать потом несколько сотен строк кода ради одной функции тоже не хочется. В результате, обычно всё заканчивается копипастой. В случае с Jossy файл String.js размечается на области. Имена у областей могут быть произвольными, но лучше, чтобы они совпадали с именами функций.

    var String = {};

    //#label truncate
    String.truncate = function() {

    };
    //#endlabel truncate

    //#label escapeHTML
    String.escapeHTML = function() {

    };
    //#endlabel escapeHTML

Теперь, если нам нужна только функция `escapeHTML`, то при подлючении файла String.js пишем

    //#include String.js::escapeHTML

В результате в сборку попадёт только

    var String = {};

    String.escapeHTML = function() {

    };

Если нужно подключить несколько областей, указываем несколько

    //#include String.js::trim::truncate

Если нужно подключить всё, кроме размеченных областей (например, нам нужен только namespace String), то

    //#include String.js::

Если же какой-то области необходима другая область из текущего файла, то используем `#include` без указания файла.

    //#label truncate
    //#include ::trim
    String.truncate = function() {};
    //#endlabel truncate

Обратите внимание, что размеченные таким образом области файла в собранном коде могут поменять порядок и между ними может появиться другой код.

Например,

    //#include String.js::escapeHTML
    alert(1);
    //#include String.js::truncate

После сборки получим

    var String = {};

    String.escapeHTML = function() {

    };

    alert(1);

    String.truncate = function() {

    };

Поэтому использовать `#label` внутри функций и выражений нельзя, на выходе получим поломанный JavaScript.

Кроме этого, `#without` тоже смотрит на эти области. Поэтому, например, `escapeHTML` может попасть в common.js, а `truncate` -- в feature.js.

### Разделение по слоям

Директива `#layer` семантически похожа на `#if`, но в отличие от него позволяет не только включить или исключить часть кода в процессе сборки, но и получить только тот код, который внутри слоя, исключив основной код.

    //#layer layer1
    alert(1);
    //#endlayer
    alert(2);
    
Такой файл мы можем собрать тремя разными способами. Во-первых, без дополнительных параметров в сборку попадёт только `alert(2)`. Во-вторых, мы можем при сборке передать параметр --layer=layer1, получив после сборки `alert(1)`. Наконец, в-третьих, можно передать параметр --layers=layer1, тогда в сборку попадёт и основной код, и код из слоя layer1. 

## Использование

### Сборка из командной строки

    jossy -i input.js -o output.js --set debug --set ie

Где debug и ie -- флаги, которые можно использовать в директиве `#if`. Если параметр -o не указан, то результат сборки выводится в `stdout`.

### Использование сборщика из NodeJS

    var {Jossy} = require('jossy');
    new Jossy().compile('path/to/file.js', {ie: true}).then(function(result) {
        console.log(result);
    });

