var acorn = require('acorn');

// defined(): the first argument that is not undefined. Replaces acorn-node's
// bundled defaults by replicating them locally so we can call acorn directly
// and drop the abandoned acorn-node wrapper from the runtime tree.
function defined () {
    for (var i = 0; i < arguments.length; i++) {
        if (arguments[i] !== undefined) return arguments[i];
    }
}

function parse (src, opts) {
    if (!opts) opts = {}
    var acornOpts = {
        // Defaults acorn-node used to supply out of the box. acorn 8 with
        // ecmaVersion 'latest' natively parses everything acorn-node's bundled
        // plugins added (bigint, class fields, static class features, numeric
        // separators, import.meta, `export * as ns from`), so no plugins are
        // needed — we call acorn directly.
        ecmaVersion: 'latest',
        allowHashBang: true,
        allowReturnOutsideFunction: true,
        ranges: defined(opts.ranges, opts.range),
        locations: defined(opts.locations, opts.loc),
        allowReserved: defined(opts.allowReserved, true),
        allowImportExportEverywhere: defined(opts.allowImportExportEverywhere, false)
    };

    if (opts.ecmaVersion != null) acornOpts.ecmaVersion = opts.ecmaVersion;
    if (opts.sourceType != null) acornOpts.sourceType = opts.sourceType;
    if (opts.allowHashBang != null) acornOpts.allowHashBang = opts.allowHashBang;
    if (opts.allowReturnOutsideFunction != null) acornOpts.allowReturnOutsideFunction = opts.allowReturnOutsideFunction;

    return acorn.parse(src, acornOpts);
}

module.exports = function (src, file,opts) {
    if (typeof src !== 'string') src = String(src);
    
    try {
        eval('throw "STOP"; (function () { ' + src + '\n})()');
        return;
    }
    catch (err) {
        if (err === 'STOP') return undefined;
        if (err.constructor.name !== 'SyntaxError') return err;
        return errorInfo(src, file, opts);
    }
};

function errorInfo (src, file, opts) {
    try { parse(src,opts) }
    catch (err) {
        return new ParseError(err, src, file);
    }
    return undefined;
}

function ParseError (err, src, file) {
    SyntaxError.call(this);
    
    this.message = err.message.replace(/\s+\(\d+:\d+\)$/, '');
    
    this.line = err.loc.line;
    this.column = err.loc.column + 1;
    
    this.annotated = '\n'
        + (file || '(anonymous file)')
        + ':' + this.line
        + '\n'
        + src.split('\n')[this.line - 1]
        + '\n'
        + Array(this.column).join(' ') + '^'
        + '\n'
        + 'ParseError: ' + this.message
    ;
}

ParseError.prototype = Object.create(SyntaxError.prototype);

ParseError.prototype.toString = function () {
    return this.annotated;
};

ParseError.prototype.inspect = function () {
    return this.annotated;
};
