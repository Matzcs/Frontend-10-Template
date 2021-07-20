export class Realm {
    constructor() {
      this.global = new Map();
      this.Object = new Map();
      this.Object.call = function () {};
      this.Object_prototype = new Map();
    }
  }
  
  export class EnvironmentRecord {
    constructor() {
      this.thisValue;
      this.variables = new Map();
      this.outer = null;
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
      this.object[this.property] = value;
    }
    get() {
      return this.object[this.property];
    }
  }