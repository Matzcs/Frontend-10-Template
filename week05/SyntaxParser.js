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
    Expression: [["AdditiveExpression"]],
    AdditiveExpression: [
        ["MutiplicativeExpression"],
        ["AdditiveExpression", "+", "MutiplicativeExpression"],
        ["AdditiveExpression", "-", "MutiplicativeExpression"]
    ],
    MutiplicativeExpression: [
        ["PrimaryExpression"],
        ["MutiplicativeExpression", "*", "PrimaryExpression"],
        ["MutiplicativeExpression", "/", "PrimaryExpression"]
    ],
    PrimaryExpression: [["(", "Expression", ")"], ["Literal"], ["Identifier"]],
    Literal: [
        ["Number"],
        ["String"],
        ["Boolean"],
        ["Null"],
        ["RegularExpression"]
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
            return;
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

function parse(sc) {
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

const evaluator = {
    Program(node) {
        return evaluate(node.children[0]);
    },
    StatementList(node) {
        if (node.children.length === 1) {
            // ["Statement"]
            return evaluate(node.children[0]);
        } else {
            // ["StatementList", "Statement"]
            evaluate(node.children[0]);
            return evaluate(node.children[1]);
        }
    },
    Statement(node) {
        return evaluate(node.children[0]);
    },
    VariableDeclaration(node) {
        // ["var", "Identifier", ";"] 处理第二项的声明信息
        console.log("Declare variable", node.children[1].name);
    },
    EOF() {
        return null;
    }
};

function evaluate(node) {
    if (evaluator[node.type]) {
        return evaluator[node.type](node);
    }
}

const source = `
 for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let cell = document.createElement("div");
      cell.classList.add("cell");
      cell.innerText =
        pattern[i * 3 + j] == 2 ? "❌" : pattern[i * 3 + j] == 1 ? "⭕️" : "";
      cell.addEventListener("click", () => userMove(j, i));
      board.appendChild(cell);
    }
    board.appendChild(document.createElement("br"));
  }
`;

const source2 = `
  let foo;
  var bar;
`;

// parse(source);
const tree = parse(source2);

evaluate(tree);