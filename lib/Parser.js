var iclass = require('iclass');

module.exports.Parser = iclass.create({
    constructor: function() {
        this._directives = [];

        this._registerDirective('include', true, (builder, params) => {
            var paramsParts = params.split('::');
            var fname = paramsParts.shift();
            builder.appendInclude(fname, paramsParts);
        });

        this._registerDirective('import', true, (builder, params) => {
            var paramsParts = params.split('::');
            var fname = paramsParts.shift();
            builder.appendImport(fname, paramsParts);
        });

        this._registerDirective('without', true, (builder, params) => {
            var paramsParts = params.split('::');
            var fname = paramsParts.shift();
            builder.appendWithout(fname, paramsParts);
        });

        this._registerDirective('label', true, (builder, label) => {
            builder.appendLabel(label);
        });

        this._registerDirective('endlabel', false, (builder) => {
            builder.appendEndlabel();
        });

        this._registerDirective('if', true, (builder, params) => {
            var args = params.split(/\s+/);
            var value = true;
            if (args.length > 1 && args[0] === 'not') {
                value = false;
                args.shift();
            }
            builder.appendIf(args[0], value);
        });

        this._registerDirective('endif', false, (builder) => {
            builder.appendEndif();
        });

        this._registerDirective('set', true, (builder, params) => {
            builder.appendSet(params.split(/\s+/)[0]);
        });

        this._registerDirective('unset', true, (builder, params) => {
            builder.appendUnset(params.split(/\s+/)[0]);
        });

        this._registerDirective('define', true, (builder, params) => {
            var args = params.split(' ');
            var search = args.shift();
            var replacement = args.join(' ');
            builder.addMacros(search, replacement);
        });
    },

    parse: function(code, builder) {
        var needExtraNl = code.lastIndexOf('\n') !== code.length - 1;
        code.split('\n').forEach((line, i, lines) => {
            if (line.match(/^\s*\/\/#([a-z_]+)(\s+[\s\S]*)?$/)) {
                this._parseDirective(builder, RegExp.$1, RegExp.$2);
            } else {
                var inlineDirectiveRegexp = /\/\*#([a-z_]+)(\s+[\s\S]*?)?#\*\//g;
                var lastFoundedIndex = 0;
                while (inlineDirectiveRegexp.exec(line)) {
                    var declaration = RegExp['$&'];
                    var directiveName = RegExp.$1;
                    var directiveArg = RegExp.$2;
                    builder.appendCode(line.substring(lastFoundedIndex, inlineDirectiveRegexp.lastIndex - declaration.length));
                    this._parseDirective(builder, directiveName, directiveArg);
                    lastFoundedIndex = inlineDirectiveRegexp.lastIndex;
                }
                builder.appendCode(line.substr(lastFoundedIndex) + (i < lines.length - 1 || needExtraNl ? '\n' : ''));
            }
        });
        builder.end();
        return builder;
    },


    _registerDirective: function(name, needArgument, fn) {
        this._directives.push({
            name: name,
            needArgument: needArgument,
            fn: fn
        });
    },

    _parseDirective: function(builder, name, arg) {
        arg = arg ? arg.trim() : '';
        var directiveFound = this._directives.some((directive) => {
            if (directive.name === name) {
                if (directive.needArgument && !arg) {
                    builder.appendError(`${name} directive expected any argument.`);
                } else {
                    directive.fn(builder, arg);
                }
                return true;
            }
            return false;
        });
        if (!directiveFound) {
            builder.appendError(`Unknown directive ${name}`);
        }
    }
});
