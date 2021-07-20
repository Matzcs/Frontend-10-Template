class XRegExp {
    constructor(source, flag, root = "root") {
        this.table = new Map();
        this.regexp = new RegExp(this.compileRegExp(source, root, 0).source, flag);
        // console.log(this.regexp);
        // console.log(this.table);
    }

    exec(str) {
        const r = this.regexp.exec(str);
        for (let i = 1; i < r.length; i++) {
            if (r[i] !== void 0) {
                // console.log(this.table.get(i - 1), r[0]);
                r[this.table.get(i - 1)] = r[i];
            }
        }

        return r;
    }

    compileRegExp(source, name, start) {
        if (source[name] instanceof RegExp) {
            return {
                source: source[name].source,
                length: 0
            };
        }

        let length = 0;

        const regexp = source[name].replace(/\<([^>]+)\>/g, (str, $1) => {
            this.table.set(start + length, $1);
            this.table.set($1, start + length);

            ++length;

            const r = this.compileRegExp(source, $1, start + length);

            length += r.length;

            return "(" + r.source + ")";
        });
        return {
            length: length,
            source: regexp
        };
    }

    get lastIndex() {
        return this.regexp.lastIndex;
    }

    set lastIndex(value) {
        this.regexp.lastIndex = value;
    }
}

export function* scan(str) {
    const xregexp = {
        InputElement: "<Whitespace>|<LineTerminator>|<Comments>|<Token>",
        Whitespace: / /,
        LineTerminator: /\n/,
        Comments: /\/\*(?:[^*]|\*[^\/])\*\/|\/\/[^\n]*/,
        Token: "<Literal>|<Keywords>|<Identifier>|<Punctuator>",
        Literal: "<NumberLiteral>|<StringLiteral>|<BooleanLiteral>|<NullLiteral>",
        NumberLiteral: /0x[0-9a-fA-F]+|0o[0-7]+|0b[10]+|(?:[1-9][0-9]*|0)(?:\.[0-9]*)?|\.[0-9]+/,
        BooleanLiteral: /true|false/,
        StringLiteral: /\"(?:[^"\n]|\\[\s\S])*\"|\'(?:[^"\n]|\\[\s\S])*\'/,
        NullLiteral: /null/,
        Keywords: /(?:await|break|case|catch|class|const|let|var|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|in|instanceof|new|return|super|switch|this|throw|try|typeof|void|while|with|yield)(?![a-zA-Z$_])/,
        Identifier: /[a-zA-Z_$][a-zA-Z0-9_$]*/,
        Punctuator: /\{|\}|\(|\)|\[|\]|\.|(?:\.\.\.)|;|,|<|>|<=|>=|==|!=|===|!==|\+|-|\*|%|\*\*|\+\+|--|<<|>>|>>>|&&|\|\||&|\||\^|!|~|\?|:|=|\+=|-=|\*=|%=|\*\*=|<<=|>>=|>>>=|&=|\|=|\^=|=>/
    };

    const regexp = new XRegExp(xregexp, "g", "InputElement");
    while (regexp.lastIndex < str.length) {
        const r = regexp.exec(str);

        if (r.Whitespace) {
            // todo:
        } else if (r.LineTerminator) {
            // todo: 追加分号
        } else if (r.Comments) {
        } else if (r.NumberLiteral) {
            yield {
                type: "NumberLiteral",
                value: r[0]
            };
        } else if (r.BooleanLiteral) {
            yield {
                type: "BooleanLiteral",
                value: r[0]
            };
        } else if (r.StringLiteral) {
            yield {
                type: "StringLiteral",
                // todo: 处理字符串
                value: r[0]
            };
        } else if (r.NullLiteral) {
            yield {
                type: "NullLiteral",
                value: null
            };
        } else if (r.Identifier) {
            yield {
                type: "Identifier",
                name: r[0]
            };
        } else if (r.Keywords || r.Punctuator) {
            yield {
                type: r[0]
            };
        } else {
            throw new Error("unexpected token " + r[0]);
        }

        if (!r[0].length) break;
    }

    yield {
        type: "EOF"
    };
}