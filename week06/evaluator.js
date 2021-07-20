import { Realm, ExecutionContext, Reference } from "./runtime.js";

export class Evaluator {
    constructor() {
        this.realm = new Realm();
        this.globalObject = {};
        /** 管理函数调用栈 */
        this.ecs = [new ExecutionContext(this.realm, this.globalObject)];
    }

    evaluate(node) {
        if (this[node.type]) {
            return this[node.type](node);
        }
    }

    Program(node) {
        return this.evaluate(node.children[0]);
    }

    StatementList(node) {
        if (node.children.length === 1) {
            // ["Statement"]
            return this.evaluate(node.children[0]);
        } else {
            // ["StatementList", "Statement"]
            this.evaluate(node.children[0]);
            return this.evaluate(node.children[1]);
        }
    }

    Statement(node) {
        return this.evaluate(node.children[0]);
    }

    VariableDeclaration(node) {
        // ["var", "Identifier", ";"] 处理第二项的声明信息
        let runningEC = this.ecs[this.ecs.length - 1];
        // runningEC.variableEnvironment[node.children[1].name];
        console.log("Declare variable", node.children[1].name);
    }

    ExpressionStatement(node) {
        return this.evaluate(node.children[0]);
    }

    Expression(node) {
        return this.evaluate(node.children[0]);
    }

    AdditiveExpression(node) {
        if (node.children.length === 1) {
            // ["MutiplicativeExpression"]
            return this.evaluate(node.children[0]);
        } else {
            // todo
            console.warn("todo: AdditiveExpression + MutiplicativeExpression");
            this.evaluate(node.children[0]);
            return this.evaluate(node.children[2]);
        }
    }

    MutiplicativeExpression(node) {
        if (node.children.length === 1) {
            // ["PrimaryExpression"]
            return this.evaluate(node.children[0]);
        } else {
            // todo
            console.warn("todo: MutiplicativeExpression * PrimaryExpression");
        }
    }

    PrimaryExpression(node) {
        if (node.children.length === 1) {
            // ["Literal"], ["Identifier"]
            return this.evaluate(node.children[0]);
        } else {
            // todo
            console.warn("todo: PrimaryExpression");
        }
    }

    Literal(node) {
        return this.evaluate(node.children[0]);
    }

    NumberLiteral(node) {
        let _str = node.value;
        let _l = _str.length;
        let _value = 0;
        // 进制
        let _n = 10;

        if (_str.match(/^0b/)) {
            _n = 2;
            _l -= 2;
        } else if (_str.match(/^0o/)) {
            _n = 8;
            _l -= 2;
        } else if (_str.match(/^0x/)) {
            _n = 16;
            _l -= 2;
        }

        while (_l--) {
            // 处理十六进制的子母
            let _c = _str.charCodeAt(_str.length - _l - 1);
            if (_c >= "a".charCodeAt(0)) {
                _c = _c - "a".charCodeAt(0) + 10;
            } else if (_c >= "A".charCodeAt(0)) {
                _c = _c - "A".charCodeAt(0) + 10;
            } else if (_c >= "0".charCodeAt(0)) {
                _c = _c - "0".charCodeAt(0);
            }

            _value = _value * _n + _c;
        }
        console.log(_value);
        return _value;
    }

    StringLiteral(node) {
        // 处理字符串的真实值，如：转义字符，utf-16处理等
        console.log(node.value);

        const result = [];

        // 转义处理
        const _cmap = {
            "'": "'",
            '"': '"',
            "\\": "\\",
            0: String.fromCharCode(0x0000),
            b: String.fromCharCode(0x0008),
            t: String.fromCharCode(0x0009),
            n: String.fromCharCode(0x000a),
            v: String.fromCharCode(0x000b),
            f: String.fromCharCode(0x000c),
            r: String.fromCharCode(0x000d)
        };

        for (let i = 1; i < node.value.length - 1; i++) {
            if (node.value[i] === "\\") {
                ++i;
                const _c = node.value[i];
                if (_c in _cmap) {
                    result.push(_cmap[_c]);
                } else {
                    result.push(_c);
                }
            } else {
                result.push(node.value[i]);
            }
        }
        console.log(result);
        return result.join("");
    }

    ObjectLiteral(node) {
        if (node.children.length === 2) {
            return {};
        } else if (node.children.length === 3) {
            const obj = new Map();
            // todo obj.prototype = xx

            this.PropertyList(node.children[1], obj);
            return obj;
        }
    }

    PropertyList(node, obj) {
        if (node.children.length === 1) {
            this.Property(node.children[0], obj);
        } else {
            this.PropertyList(node.children[0], obj);
            this.Property(node.children[2], obj);
        }
    }

    Property(node, obj) {
        let name;
        if (node.children[0].type === "Identifier") {
            name = node.children[0].name;
        } else if (node.children[0].type === "StringLiteral") {
            name = this.evaluate(node.children[0]);
        }

        obj.set(name, {
            value: this.evaluate(node.children[2]),
            writable: true,
            enumerable: true,
            configable: true
        });
    }

    AssignmentExpression(node) {
        if (node.children.length === 1) {
            return this.evaluate(node.children[0]);
        }

        let left = this.evaluate(node.children[0]);
        let right = this.evaluate(node.children[2]);
        left.set(right);
    }

    LogicalORExpressio(node) {
        if (node.children.length === 1) {
            return this.evaluate(node.children[0]);
        }

        let res = this.evaluate(node.children[0]);
        if (res) {
            return res;
        } else {
            return this.evaluate(node.children[2]);
        }
    }

    LogicalANDExpressio(node) {
        if (node.children.length === 1) {
            return this.evaluate(node.children[0]);
        }

        let res = this.evaluate(node.children[0]);
        if (!res) {
            return res;
        } else {
            return this.evaluate(node.children[2]);
        }
    }

    LeftHandSideExpression(node) {
        return this.evaluate(node.children[0]);
    }

    NewExpression(node) {
        if (node.children.length === 1) {
            return this.evaluate(node.children[0]);
        }

        if (node.children.length === 2) {
            let cls = this.evaluate(node.children[1]);
            return cls.construct();

            // let object = this.realm.Object.constructor();
            // let cls = this.evaluate(node.children[1]);
            // let result = cls.call(object);
            // if(typeof result === "object") {
            //   return result;
            // } else {
            //   return object;
            // }
        }
    }

    CallExpression(node) {
        if (node.children.length === 2) {
            let func = this.evaluate(node.children[0]);
            let args = this.evaluate(node.children[1]);
            return func.call(args);
        }
    }

    MemberExpression(node) {
        if (node.children.length === 1) {
            return this.evaluate(node.children[0]);
        } else if (node.children.length === 3) {
            // obj 为 Reference 类型
            let obj = this.evaluate(node.children[0]).get();
            let prop = obj.get(node.children[2].name);
            if ("value" in prop) {
                return prop.value;
            }
            if ("get" in prop) {
                return prop.get.call(obj);
            }
        } else if (node.children.length === 4) {
            let obj = this.evaluate(node.children[0]).get();
            let prop = obj.get(this.evaluate(node.children[2]));
            if ("value" in prop) {
                return prop.value;
            }
            if ("get" in prop) {
                return prop.get.call(obj);
            }
        }
    }

    Identifier(node) {
        let runningEC = this.ecs[this.ecs.length - 1];
        return new Reference(runningEC.lexicalEnvironment, node.name);
    }

    EOF() {
        return null;
    }
}