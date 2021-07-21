export function createElement(type, attributes, ...children) {
    let element;
    if (typeof type === "string") {
        element = new ElementWrapper(type);
    } else {
        element = new type();
    }

    for (let name in attributes) {
        element.setAttribute(name, attributes[name]);
    }

    let processChildern = (children) => {
        for (let child of children) {
            if (typeof child === "object" && child instanceof Array) {
                processChildern(child);
                continue;
            }
            // 文本节点
            if (typeof child === "string") {
                child = new TextWrapper(child);
            }

            element.appendChild(child);
        }
    };
    processChildern(children);
    return element;
}

export const STATE = Symbol("state");
export const ATTRIBUTE = Symbol("attribute");

export class Component {
    constructor(type) {
        // this.root = this.render();
        this[ATTRIBUTE] = Object.create(null);
        this[STATE] = Object.create(null);
    }

    setAttribute(name, value) {
        this[ATTRIBUTE][name] = value;
    }

    appendChild(child) {
        child.mountTo(this.root);
    }

    mountTo(parent) {
        if (!this.root) {
            this.render();
        }
        parent.appendChild(this.root);
    }

    triggerEvent(type, args) {
        this[ATTRIBUTE]["on" + type.replace(/^[\s\S]/, (s) => s.toUpperCase())](
            new CustomEvent(type, { detail: args })
        );
    }

    render() {
        return this.root;
    }
}

class ElementWrapper extends Component {
    constructor(type) {
        super(type);
        this.root = document.createElement(type);
    }

    setAttribute(name, value) {
        this.root.setAttribute(name, value);
    }
}

class TextWrapper extends Component {
    constructor(content) {
        super(content);
        this.root = document.createTextNode(content);
    }
}