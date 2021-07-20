import {
    Realm,
    ExecutionContext,
    Reference,
    JSNull,
    JSBoolean,
    JSNumber,
    JSObject,
    JSString,
    JSUndefined,
    JSSymbol,
    CompletionRecord,
    EnvironmentRecord,
    ObjectEnvironmentRecord
} from "./runtime.js";

export class Evaluator {
    constructor() {
        this.realm = new Realm();
        this.globalObject = new JSObject();
        this.globalObject.set("log", new JSObject());
        this.globalObject.get("log").call = (args) => {
            console.log(args);
        };
        /** 管理函数调用栈 */
        this.ecs = [
            new ExecutionContext(
                this.realm,
                new ObjectEnvironmentRecord(this.globalObject),
                new ObjectEnvironmentRecord(this.globalObject)
            )
        ];
    }

    evaluate(node) {
        if (this[node.type]) {
            return this[node.type](node);
        }
    }

    evaluateModule(node) {
        // 使用global环境
        let globalEC = this.ecs[0];
        let newEC = new ExecutionContext(
            this.realm,
            new EnvironmentRecord(globalEC.lexicalEnvironment),
            new EnvironmentRecord(globalEC.lexicalEnvironment)
        );
        this.ecs.push(newEC);
        let result = this.evaluate(node);
        this.ecs.pop();
        return result;
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
            const record = this.evaluate(node.children[0]);
            if (record.type === "normal") {
                return this.evaluate(node.children[1]);
            } else {
                return record;
            }
        }
    }

    Statement(node) {
        return this.evaluate(node.children[0]);
    }

    Block(node) {
        if (node.children.length === 2) {
            return;
        }
        let runningEC = this.ecs[this.ecs.length - 1];
        // 新的执行上下文
        let newEC = new ExecutionContext(
            runningEC.realm,
            new EnvironmentRecord(runningEC.lexicalEnvironment),
            runningEC.variableEnvironment
        );

        this.ecs.push(newEC);
        let result = this.evaluate(node.children[1]);
        this.ecs.pop();
        return result;
    }

    BreakStatement(node) {
        return new CompletionRecord("break");
    }

    ContinueStatement(node) {
        return new CompletionRecord("continue");
    }

    IfStatement(node) {
        // 执行 Expression，根据结果看是否执行 Statement
        let condition = this.evaluate(node.children[2]);
        if (condition instanceof Reference) {
            condition = condition.get();
        }

        if (condition.toBoolean().value) {
            return this.evaluate(node.children[4]);
        }
    }

    WhileStatement(node) {
        while (true) {
            let condition = this.evaluate(node.children[2]);
            if (condition instanceof Reference) {
                condition = condition.get();
            }

            if (condition.toBoolean().value) {
                let record = this.evaluate(node.children[4]);
                if (record.type === "continue") {
                    continue;
                } else if (record.type === "break") {
                    // 返回normal，表示whileStatement的终止
                    return new CompletionRecord("normal");
                }
            } else {
                return new CompletionRecord("normal");
            }
        }
    }

    VariableDeclaration(node) {
        // ["var", "Identifier", ";"] 处理第二项的声明信息
        let runningEC = this.ecs[this.ecs.length - 1];
        runningEC.lexicalEnvironment.add(node.children[1].name, new JSUndefined());
        // console.log("Declare variable", node.children[1].name);
        return new CompletionRecord("normal", new JSUndefined());
    }

    ExpressionStatement(node) {
        let result = this.evaluate(node.children[0]);
        if (result instanceof Reference) {
            result = result.get();
        }
        return new CompletionRecord("normal", result);
    }

    Expression(node) {
        return this.evaluate(node.children[0]);
    }

    AdditiveExpression(node) {
        if (node.children.length === 1) {
            // ["MutiplicativeExpression"]
            return this.evaluate(node.children[0]);
        } else {
            // 将左右两边操作数从Reference中取出
            let left = this.evaluate(node.children[0]);
            let right = this.evaluate(node.children[2]);
            if (left instanceof Reference) left = left.get();
            if (right instanceof Reference) right = right.get();

            if (node.children[1].type === "+") {
                return new JSNumber(left.value + right.value);
            } else if (node.children[1].type === "-") {
                return new JSNumber(left.value - right.value);
            }
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
        // console.log(_value);
        return new JSNumber(_value);
    }

    StringLiteral(node) {
        // 处理字符串的真实值，如：转义字符，utf-16处理等
        // console.log(node.value);

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
        // console.log(result);
        return new JSString(result);
    }

    ObjectLiteral(node) {
        if (node.children.length === 2) {
            return {};
        } else if (node.children.length === 3) {
            const obj = new Map();
            // todo obj.prototype = xx

            this.PropertyList(node.children[1], obj);
            return new JSObject(obj);
        }
    }

    BooleanLiteral(node) {
        if (node.value === "false") {
            return new JSBoolean(false);
        } else if (node.value === "true") {
            return new JSBoolean(true);
        }
    }

    NullLiteral() {
        return new JSNull();
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
            if (func instanceof Reference) {
                func = func.get();
            }
            return func.call(args);
        }
    }

    Arguments(node) {
        if (node.children.length === 2) {
            return [];
        } else {
            return this.evaluate(node.children[1]);
        }
    }

    ArgumentList(node) {
        if (node.children.length === 1) {
            let result = this.evaluate(node.children[0]);
            if (result instanceof Reference) {
                result = result.get();
            }
            return [result];
        } else {
            let result = this.evaluate(node.children[2]);
            if (result instanceof Reference) {
                result = result.get();
            }
            return this.evaluate(node.children[0]).concat(result);
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

    FunctionDeclaration(node) {
        let name = node.children[1].name;
        let code = node.children[node.children.length - 2];
        let func = new JSObject();
        func.call = (args) => {
            // 执行时，创建新的上下文
            let newEC = new ExecutionContext(
                this.realm,
                new EnvironmentRecord(func.environment),
                new EnvironmentRecord(func.environment)
            );
            this.ecs.push(newEC);
            this.evaluate(code);
            this.ecs.pop();
        };
        let runningEC = this.ecs[this.ecs.length - 1];
        runningEC.lexicalEnvironment.add(name);
        runningEC.lexicalEnvironment.set(name, func);
        // 定义时的上下文
        func.environment = runningEC.lexicalEnvironment;
        return new CompletionRecord("normal");
    }

    EOF() {
        return null;
    }
}