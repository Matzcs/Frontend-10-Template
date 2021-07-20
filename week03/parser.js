const css = require('css')

const EOF = Symbol("EOF")

const layout = require("./layout.js")

let currentToken = null

let currentAttribute = null

let stack = [{ type: "document", children: [] }]
let currentTextNode = null

// 加入一个新的函数，addCSSRules，这里我们把CSS规则暂存在一个数组里
let rules = [];
function addCssRules(text) {
    var ast = css.parse(text);
    rules.push(...ast.stylesheet.rules)
}

function match(element, selector) {
    if (!selector || !element.attributes) {
        return false
    }

    if (selector.charAt(0) == "#") {
        var attr = element.attributes.filter(attr => attr.naem === "id")[0]
        if (attr && attr.value === selector.replace("#", '')) {
            return
        }
    } else if (selector.charAt(0) === ".") {
        var attr = element.attributes.filter(attr => attr.naem === "class")[0]
        if (attr && attr.value === selector.replace(".", '')) {
            return
        }
    } else {
        if (element, tagName === selector) {
            return true
        }
    }
}

function specificity(selector) {
    let p = [0, 0, 0, 0]
    let selectorParts = selector.split(" ")
    // 只假设此时只有简单选择器
    for (let part of selectorParts) {
        if (part.charAt(0) === "#") {
            p[1] += 1
        } else if (part.charAt(0) === ".") {
            p[2] += 1
        } else {
            p[3] += 1
        }
    }
    return p
}

function compare(sp1, sp2) {
    if (sp1[0] - sp2[0]) {
        return sp1[0] - sp2[0]
    }
    if (sp1[1] - sp2[1]) {
        return sp1[1] - sp2[1]
    }
    if (sp1[2] - sp2[2]) {
        return sp1[2] - sp2[2]
    }

    return sp1[3] - sp2[3]
}

// css的计算是假定在startTag入栈时，此处假设所有的css规则已经收集完毕了
function computeCss(element) {
    // 一个数组调用slice方法不传参数时表示对该数组进行了复制，在调用一下reverse是为了实现匹配元素是从内向外匹配
    var elements = stack.slice().reverse()
    if (!element.computedStyle) {
        element.computedStyle = {}
    }

    for (let rule of rules) {
        let selectorParts = rule.selectors[0].split(" ").reverse()

        if (!match(element, selectorParts[0])) {
            continue
        }
        let j = 1
        for (let i = 0; i < elements.length; i++) {
            if (match(elements[i], selectorParts[j])) {
                j++
            }
        }
        if (j >= selectorParts.length) {
            matched = true
        }
        if (matched) {
            let sp = specificity(rule.selectors[0])
            let computedStyle = element.computedStyle
            for (let declaration of rule.declaration) {
                if (!computedStyle[declaration.property]) {
                    computedStyle[declaration.property] = {}
                }
                if (!computedStyle[declaration.specificity]) {
                    computedStyle[declaration.property].value = declaration.value
                    computedStyle[declaration.property].specificity = sp
                } else if (compare(computedStyle[declaration.property].specificity, sp) < 0) {
                    computedStyle[declaration.property].value = declaration.value
                    computedStyle[declaration.property].specificity = sp
                }
            }
        }
    }
}

function emit(token) {
    let top = stack[stack.length - 1]

    if (token.type == "startTag") {
        let element = {
            type: "element",
            children: [],
            attributes: []
        };

        element.tagName = token.tagName

        for (let p in token) {
            if (p != "type" && p != "tagName") {
                element.attributes.push({
                    name: p,
                    value: token[p]
                })
            }
        }
        computeCss(element)

        top.children.push(element)
        //element.parent = top

        if (!token.isSelfClosing) {
            stack.push(element)
        }

        currentTextNode = null

    } else if (token.type == "endTag") {
        if (top.tagName != token.tagName) {
            throw new Error("Tag start end doesn`t natch")
        } else {
            // 在结束标签中遇到style标签，执行添加css规则的操作
            // 此处解析css的rule时只考虑了style标签中和内敛的情况
            if (top.tagName === "style") {
                addCssRules(top.children[0].content)
            }
            stack.pop()
        }
        // 当遇到结束标签之后就进行排版，采用的是flex排版，flex布局需要知道子元素的相关属性
        layout(top)
        currentTextNode = null

    } else if (token.type === "text") {
        // 如果文本节点为空就创建一个新的文本节点
        if (currentTextNode == null) {
            currentTextNode = {
                type: "text",
                content: ""
            }
            top.children.push(currentTextNode)
        }
        // 如果文本节点不为空就将传入的token的内容加到文本节点中
        currentTextNode.content += token.content
    }
}

// 解析传入的字符时，如果字符开始为<则进入标签开始状态机，如果状态为EOF则为结束状态，其余字符依然进行该状态机的判断，包括>
function data(c) {
    if (c === "<") {
        return tagOpen;
    } else if (c === EOF) {
        emit({
            type: "EOF"
        })
        return
    } else {
        // 暂时将字符一个一个的传输出去
        emit({
            type: "text",
            content: c
        })
        return data
    }
}

function tagOpen(c) {
    if (c === "/") {
        // <之后如果为/就表示此时为结束标签开始
        return endTagOpen
    } else if (c.match(/^[a-zA-Z]$/)) {
        // <之后为字母就表示为标签名，跳转到标签名状态机
        currentToken = {
            type: "startTag",
            tagName: ""
        }
        return tagName(c)
    } else {
        emit({
            type: "text",
            content: c
        })
        return
    }
}

function tagName(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        // tagName之后紧跟着的是空白符就进入属性名状态
        return beforeAttributeName
    } else if (c === "/") {
        // tagName之后紧跟着/表示自封闭标签（如果是闭合标签中tagName后的/会报错，此处没有判断处理）
        return selfClosingStartTag
    } else if (c.match(/^[A-Z]$/)) {
        // 如果是字符串中是字母则表示依然为标签名
        currentToken.tagName += c
        return tagName
    } else if (c === ">") {
        // 如果标签名之后为>表示解析完成一个标签,进入下一个标签的判断
        emit(currentToken)
        return data
    } else {
        currentToken.tagName += c
        return tagName
    }
}

// 处理标签属性的状态
function beforeAttributeName(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        // 如果遇到的是空格就继续返回到处理标签属性的状态
        return beforeAttributeName
    } else if (c === "/" || c === ">" || c === EOF) {
        // 如果标签属性名之后遇到的是>或者/或者是EOF结束标志就表示属性获取完毕，进而跳转到属性名之后的状态机
        return afterAttributeName(c)
    } else if (c === "=") {
        // 一个标签的属性不会一开始就就是=，这是一种错误，不做处理
        //return beforeAttributeName
    } else {
        // 否则就会遇到一个空的字符
        currentAttribute = {
            name: "",
            value: ""
        }
        // 跳转到属性名的状态
        return attributeName(c)
    }
}

function attributeName(c) {
    if (c.match(/^[\t\n\f ]$/) || c === "/" || c === ">" || c === EOF) {
        // 属性名状态中遇到空格、/、>、EOF就进入到属性名之后的状态机，表示已经获取到了属性名
        return afterAttributeName(c)
    } else if (c === "=") {
        // 属性名后紧跟的是=就条状到属性值状态处理前
        return beforeAttributeValue
    } else if (c === "\u0000") {

    } else if (c === "\"" || c === "'" || c === "<") {

    } else {
        currentAttribute.name += c
        return attributeName
    }
}

function beforeAttributeValue(c) {
    if (c.match(/^[\t\n\f ]$/) || c === "/" || c === ">" || c === EOF) {
        return beforeAttributeValue
    } else if (c === "\"") {
        // 如果属性名后的=后接的是"开头的就跳转到双引号属性值状态
        return doubleQuotedAttributeValue
    } else if (c === "\u0000") {
        return singleQuotedAttributeValue
    } else if (c === ">") {
        return data
    } else {
        // 如果属性名后的=后接的不是空格、/、"、'开头的就跳转到无引号属性值状态
        return UnquotedAttributeValue(c)
    }
}

function doubleQuotedAttributeValue(c) {
    if (c === "\"") {
        // 在双引号属性值状态中如果此时以"结尾，此时需要将获取到的属性值赋值给属性
        currentToken[currentAttribute.name] = currentAttribute.value
        return afterQuotedAttributeValue
    } else if (c === "\u0000") {

    } else if (c === EOF) {

    } else {
        // 不然就保存获取到的属性值
        currentAttribute.value += c
        return doubleQuotedAttributeValue
    }

}

function singleQuotedAttributeValue(c) {
    if (c === "\"") {
        // 在双引号属性值状态中如果此时以'结尾，此时需要将获取到的属性值赋值给属性
        currentToken[currentAttribute.name] = currentAttribute.value
        return afterQuotedAttributeValue
    } else if (c === "\u0000") {

    } else if (c === EOF) {

    } else {
        // 不然就保存获取到的属性值
        currentAttribute.value += c
        return doubleQuotedAttributeValue
    }
}

function afterQuotedAttributeValue(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        return beforeAttributeName
    } else if (c === "/") {
        return selfClosingStartTag
    } else if (c === ">") {
        currentToken[currentAttribute.name] = currentAttribute.value
        emit(currentToken)
        return data
    } else if (c === EOF) {

    } else {
        currentAttribute.value += c
        return doubleQuotedAttributeValue
    }
}

function UnquotedAttributeValue(c) {

    if (c.match(/^[\t\n\f ]$/)) {
        currentToken[currentAttribute.name] = currentAttribute.value
        return beforeAttributeName
    } else if (c === "/") {
        currentToken[currentAttribute.name] = currentAttribute.value
        return selfClosingStartTag
    } else if (c === ">") {
        currentToken[currentAttribute.name] = currentAttribute.value
        emit(currentToken)
        return data
    } else if (c === "\u0000") {

    } else if (c === "\"" || c === "'" || c === "<" || c === "=" || c === "`") {

    } else if (c === EOF) {

    } else {
        currentAttribute.value += c
        return UnquotedAttributeValue

    }
}

function selfClosingStartTag(c) {
    if (c === ">") {
        // 自闭合标签后面只有接>才是有效的,其余的都是会报错
        currentToken.isSelfClosing = true
        emit(currentToken)
        return data
    } else if (c === "EOF") {

    } else {

    }
}

function endTagOpen(c) {
    if (c.match(/^[a-zA-Z]$/)) {
        // 结束标签开始后紧跟着的是字符就跳转到标签名，其余的都会报错
        currentToken = {
            type: "endTag",
            tagName: ""
        }
        return tagName(c)
    } else if (c === ">") {

    } else if (c === EOF) {

    } else {

    }
}

function afterAttributeName(c) {
    if (c.match(/^[\t\n\f ]$/)) {
        return afterAttributeName
    } else if (c === "/") {
        return selfClosingStartTag
    } else if (c === "=") {
        return beforeAttributeValue
    } else if (c === ">") {
        currentToken[currentAttribute.name] = currentAttribute.value
        emit(currentToken)
        return data
    } else if (c === EOF) {

    } else {
        currentToken[currentAttribute.name] = currentAttribute.value
        currentToken = {
            name: "",
            value: ""
        }
        return attributeName(c)
    }
}

module.exports.parseHTML = function parseHTML(html) {
    let state = data;
    for (let c of html) {
        state = state(c)
    }
    state = state(EOF)
    return stack[0]
}