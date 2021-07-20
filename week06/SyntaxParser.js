import { scan } from "/LexParser.js";

/** 通过JSON描述BNF结构，便于后续处理 */
const syntax = {
    Program: [["StatementList", "EOF"]],
    StatementList: [["Statement"], ["StatementList", "Statement"]],
    Statement: [
        ["ExpressionStatement"],
        ["IfStatement"],
        ["VariableDeclaration"],
        ["FunctionDeclaration"]
    ],
    ExpressionStatement: [["Expression", ";"]],
    Expression: [["AssignmentExpression"]],
    AssignmentExpression: [
        // "LeftHandSideExpression", "=", "RightHandSideExpression"
        ["LeftHandSideExpression", "=", "LogicalORExpressio"],
        // "RightHandSideExpression"
        ["LogicalORExpressio"]
    ],
    LogicalORExpressio: [
        ["LogicalANDExpressio"],
        ["LogicalORExpressio", "||", "LogicalANDExpressio"]
    ],
    LogicalANDExpressio: [
        ["AdditiveExpression"],
        ["LogicalANDExpressio", "&&", "AdditiveExpression"]
    ],
    AdditiveExpression: [
        ["MutiplicativeExpression"],
        ["AdditiveExpression", "+", "MutiplicativeExpression"],
        ["AdditiveExpression", "-", "MutiplicativeExpression"]
    ],
    MutiplicativeExpression: [
        ["LeftHandSideExpression"],
        ["MutiplicativeExpression", "*", "LeftHandSideExpression"],
        ["MutiplicativeExpression", "/", "LeftHandSideExpression"]
    ],
    LeftHandSideExpression: [["NewExpression"], ["CallExpression"]],
    NewExpression: [["MemberExpression"], ["new", "NewExpression"]],
    CallExpression: [
        ["MemberExpression", "Arguments"],
        ["CallExpression", "Arguments"]
    ],
    MemberExpression: [
        ["PrimaryExpression"],
        ["MemberExpression", ".", "Identifier"],
        ["MemberExpression", "[", "Expression", "]"]
    ],
    PrimaryExpression: [["(", "Expression", ")"], ["Literal"], ["Identifier"]],
    Literal: [
        ["NumberLiteral"],
        ["StringLiteral"],
        ["BooleanLiteral"],
        ["NullLiteral"],
        ["RegularExpressionLiteral"],
        ["ObjectLiteral"],
        ["ArrayLiteral"]
    ],
    ObjectLiteral: [
        ["{", "}"],
        ["{", "PropertyList", "}"]
    ],
    PropertyList: [["Property"], ["PropertyList", ",", "Property"]],
    Property: [
        ["StringLiteral", ":", "AdditiveExpression"],
        ["Identifier", ":", "AdditiveExpression"]
    ],
    IfStatement: [["if", "(", "Expression", ")", "Statement"]],
    VariableDeclaration: [
        ["var", "Identifier", ";"],
        ["let", "Identifier", ";"]
    ],
    FunctionDeclaration: [
        ["function", "Identifier", "(", ")", "{", "StatementList", "}"]
    ]
};

// 记录已经出现的，处理回环情况
const hash = {};

// 广度优先搜索
function closure(state) {
    //   console.log(JSON.stringify(state));
    hash[JSON.stringify(state)] = state;

    const queue = [];
    for (let symbol in state) {
        if (symbol.match(/^$/)) {
            return;
        }
        queue.push(symbol);
    }

    while (queue.length) {
        let symbol = queue.shift();
        if (syntax[symbol]) {
            for (let rule of syntax[symbol]) {
                if (!state[rule[0]]) {
                    queue.push(rule[0]);
                    //   state[symbol] = true;
                }

                let current = state;
                for (let part of rule) {
                    if (!current[part]) {
                        current[part] = {};
                    }
                    current = current[part];
                }
                // 合成non-terminal symbol
                current.$reduceType = symbol;
                current.$reductLength = rule.length;
            }
        }
    }

    // 递归，此时state已经展开一层
    for (let symbol in state) {
        if (symbol.match(/^\$/)) {
            continue;
        }

        if (hash[JSON.stringify(state[symbol])]) {
            state[symbol] = hash[JSON.stringify(state[symbol])];
        } else {
            closure(state[symbol]);
        }
    }
}

let end = {
    $isEnd: true
};

let start = {
    Program: end
};

closure(start);
// console.log(JSON.stringify(start, null, "  "));

export function parse(sc) {
    const stack = [start];
    const symbolStack = [];

    function reduce() {
        const state = stack[stack.length - 1];

        if (state.$reduceType) {
            const children = [];
            for (let i = 0; i < state.$reductLength; i++) {
                stack.pop();
                children.push(symbolStack.pop());
            }
            /** create a non-terminal symbol and shift it */
            return {
                type: state.$reduceType,
                children: children.reverse()
            };
        }
    }

    function shift(symbol) {
        const state = stack[stack.length - 1];

        if (symbol.type /** terminal symbol */ in state) {
            stack.push(state[symbol.type]);
            symbolStack.push(symbol);
        } else {
            /** reduce to non-terminal symbol */
            shift(reduce());
            shift(symbol);
        }
    }

    for (let symbol of scan(sc)) {
        // if (!symbol) {
        //   continue;
        // }

        shift(symbol);
    }

    return reduce();
}