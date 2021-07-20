export class Realm {
    constructor() {
        this.global = new Map();
        this.Object = new Map();
        this.Object.call = function () { };
        this.Object_prototype = new Map();
    }
}

// JS类型实现
// Number String Boolean Object Null Undefined Symbol
export class JSValue {
    get type() {
        if (this.constructor === JSNumber) {
            return "number";
        }
        if (this.constructor === JSString) {
            return "string";
        }
        if (this.constructor === JSBoolean) {
            return "boolean";
        }
        if (this.constructor === JSObject) {
            return "object";
        }
        if (this.constructor === JSNull) {
            return "null";
        }
        if (this.constructor === JSUndefined) {
            return "undefined";
        }
        if (this.constructor === JSSymbol) {
            return "symbol";
        }
        return "undefined";
    }
}
export class JSNumber extends JSValue {
    constructor(value) {
        super();
        this.memory = new ArrayBuffer(8);
        if (arguments.length) {
            // Float64Array 符合 IEEE 标准
            new Float64Array(this.memory)[0] = value;
        } else {
            new Float64Array(this.memory)[0] = 0;
        }
    }
    get value() {
        return new Float64Array(this.memory)[0];
    }

    toString() { }
    toNumber() {
        return this;
    }
    toBoolean() {
        if (new Float64Array(this.memory)[0] === 0) {
            return new JSBoolean(false);
        } else {
            return new JSBoolean(true);
        }
    }
    toObject() {
        // todo: box
    }
}
export class JSString extends JSValue {
    constructor(characters) {
        super();
        // this.memory = new ArrayBuffer(characters.length * 2);
        // 简易版
        this.characters = characters;
    }
    toString() {
        return this;
    }
    toNumber() { }
    toBoolean() {
        if (this.characters.length === 0) {
            return new JSBoolean(false);
        } else {
            return new JSBoolean(true);
        }
    }
}
export class JSBoolean extends JSValue {
    constructor(value) {
        super();
        this.value = value || false;
    }
    toString() {
        if (this.value) {
            return new JSString(["t", "r", "u", "e"]);
        } else {
            return new JSString(["f", "a", "l", "s", "e"]);
        }
    }
    toNumber() {
        if (this.value) {
            return new JSNumber(1);
        } else {
            return new JSNumber(0);
        }
    }
    toBoolean() {
        return this;
    }
}
export class JSObject extends JSValue {
    constructor() {
        super();
        this.properties = new Map();
        this.prototype = null;
    }
    set(name, value) {
        // todo: 是否是writable
        this.setProperty(name, {
            value: value,
            writable: true,
            enumerable: true,
            configurable: true
        });
    }
    get(name) {
        // todo: 原型链处理 && getter
        return this.getProperty(name).value;
    }
    setProperty(name, attributes) {
        this.properties.set(name, attributes);
    }
    getProperty(name) {
        return this.properties.get(name);
    }

    setPrototype(proto) {
        this.prototype = proto;
    }
    getPrototype() {
        return this.prototype;
    }
}
export class JSNull extends JSValue {
    toString() {
        return new JSString(["n", "u", "l", "l"]);
    }
    toNumber() {
        return new JSNumber(0);
    }
    toBoolean() {
        return new JSBoolean(false);
    }
}
export class JSUndefined extends JSValue {
    toString() {
        return new JSString(["u", "n", "d", "e", "f", "i", "n", "e", "d"]);
    }
    toNumber() {
        return new JSNumber(NaN);
    }
    toBoolean() {
        return new JSBoolean(false);
    }
}
export class JSSymbol extends JSValue {
    constructor(name) {
        super();
        this.name = name || "";
    }
}

export class EnvironmentRecord {
    constructor(outer) {
        this.variables = new Map();
        this.outer = outer;
    }
    add(name) {
        this.variables.set(name, new JSUndefined());
    }
    get(name) {
        if (this.variables.has(name)) {
            return this.variables.get(name);
        } else if (this.outer) {
            return this.outer.get(name);
        } else {
            return new JSUndefined();
        }
    }
    set(name, value = new JSUndefined()) {
        if (this.variables.has(name)) {
            this.variables.set(name, value);
        } else if (this.outer) {
            this.outer.set(name, value);
        } else {
            this.variables.set(name, value);
        }
    }
}

export class ObjectEnvironmentRecord {
    constructor(object, outer) {
        this.object = object;
        this.outer = outer;
    }
    add(name) {
        this.object.set(name, new JSUndefined());
    }
    get(name) {
        return this.object.get(name);
        // todo: with statement need outer
    }
    set(name, value = new JSUndefined()) {
        this.object.set(name, value);
    }
}

/** 管理存储变量执行环境 */
export class ExecutionContext {
    constructor(realm, lexicalEnvironment, variableEnvironment) {
        variableEnvironment = variableEnvironment || lexicalEnvironment;
        this.lexicalEnvironment = lexicalEnvironment;
        this.variableEnvironment = variableEnvironment;
        this.realm = realm;
    }
}

// 管理对象读写，运行时类型，一般语言的运行时会创建，js中无法直接访问
export class Reference {
    constructor(object, property) {
        this.object = object;
        this.property = property;
    }
    set(value) {
        this.object.set(this.property, value);
    }
    get() {
        return this.object.get(this.property);
    }
}

/**
 * 管理语句块执行记录和结果，三元组
 * type: normal break throw return
 */
export class CompletionRecord {
    constructor(type, value, target) {
        this.type = type || "normal";
        this.value = value || new JSUndefined();
        this.target = target || new JSNull();
    }
}