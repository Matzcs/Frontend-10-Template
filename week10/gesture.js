/** 事件派发 */
export class Dispatcher {
    constructor(element) {
        this.element = element;
    }

    dispatch(type, properties) {
        let event = new Event(type);
        for (let name in properties) {
            event[name] = properties[name];
        }
        this.element.dispatchEvent(event);
    }
}

// 数据流向 listen => recognize => dispatch
// new Listener(new Recognizer(dispatch))

export class Listener {
    constructor(element, recognizer) {
        let contexts = new Map();
        // 避免mousemove mouseend 绑定多次
        let isListeningMouse = false;

        document.addEventListener("mousedown", (event) => {
            // event.button 鼠标按下的键位，可以基于此创建context
            let context = Object.create(null);
            contexts.set(`mouse${1 << event.button}`, context);

            recognizer.start(event, context);
            let mousemove = (event) => {
                // event.buttons 掩码 表示哪些键按下
                let button = 1;
                while (button <= event.buttons) {
                    if (button & event.buttons) {
                        // buttons的中键和右键 与 event.button中的不一致
                        let key;
                        if (button === 2) {
                            key = 4;
                        } else if (button === 4) {
                            key = 2;
                        } else {
                            key = button;
                        }

                        let context = contexts.get(`mouse${button}`);
                        recognizer.move(event, context);
                    }
                    button = button << 1;
                }
            };
            let mouseup = (event) => {
                let context = contexts.get(`mouse${1 << event.button}`);
                recognizer.end(event, context);
                contexts.delete(`mouse${1 << event.button}`);
                if (event.buttons === 0) {
                    document.removeEventListener("mousemove", mousemove);
                    document.removeEventListener("mouseup", mouseup);
                    isListeningMouse = false;
                }
            };

            if (!isListeningMouse) {
                document.addEventListener("mousemove", mousemove);
                document.addEventListener("mouseup", mouseup);
                isListeningMouse = true;
            }
        });

        // touch事件 start move 都会触发
        element.addEventListener("touchstart", (event) => {
            for (let touch of event.changedTouches) {
                let context = Object.create(null);
                contexts.set(touch.identifier, context);
                recognizer.start(touch, context);
            }
        });

        element.addEventListener("touchmove", (event) => {
            for (let touch of event.changedTouches) {
                let context = contexts.get(touch.identifier);
                recognizer.move(touch, context);
            }
        });

        element.addEventListener("touchend", (event) => {
            for (let touch of event.changedTouches) {
                let context = contexts.get(touch.identifier);
                recognizer.end(touch, context);
                contexts.delete(touch.identifier);
            }
        });

        // 如果move过程中出现弹窗中断触屏，则不会出现end事件，而是cancel
        element.addEventListener("touchcancel", (event) => {
            for (let touch of event.changedTouches) {
                let context = contexts.get(touch.identifier);
                recognizer.cancel(touch, context);
                contexts.delete(touch.identifier);
            }
        });
    }
}

export class Recognizer {
    constructor(dispatcher) {
        this.dispatcher = dispatcher;
    }

    start = (point, context) => {
        this.dispatcher.dispatch("start", {
            clientX: point.clientX,
            clientY: point.clientY
        });
        context.startX = point.clientX;
        context.startY = point.clientY;
        context.points = [
            {
                t: Date.now(),
                x: point.clientX,
                y: point.clientY
            }
        ];

        context.isTap = true;
        context.isPan = false;
        context.isPress = false;

        // 处理长按
        context.handler = setTimeout(() => {
            context.isTap = false;
            context.isPan = false;
            context.isPress = true;
            context.handler = null;
            this.dispatcher.dispatch("press", {});
        }, 500);
    };

    move = (point, context) => {
        // 移动超过10px -> pan
        let dx = point.clientX - context.startX,
            dy = point.clientY - context.startY;
        if (!context.isPan && dx ** 2 + dy ** 2 > 100) {
            context.isPan = true;
            context.isTap = false;
            context.isPress = false;
            context.isVertical = Math.abs(dx) < Math.abs(dy);
            this.dispatcher.dispatch("panstart", {
                startX: context.startX,
                startY: context.startY,
                clientX: point.clientX,
                clientY: point.clientY,
                isVertical: context.isVertical
            });
            clearTimeout(context.handler);
        }

        if (context.isPan) {
            this.dispatcher.dispatch("pan", {
                startX: context.startX,
                startY: context.startY,
                clientX: point.clientX,
                clientY: point.clientY,
                isVertical: context.isVertical
            });
        }

        // 仅存储半秒内的
        context.points = context.points.filter(
            (point) => Date.now() - point.t < 500
        );

        context.points.push({
            t: Date.now(),
            x: point.clientX,
            y: point.clientY
        });
    };

    end = (point, context) => {
        if (context.isTap) {
            this.dispatcher.dispatch("tap", {});
            clearTimeout(context.handler);
        }

        if (context.isPress) {
            this.dispatcher.dispatch("pressedn", {});
        }

        let v;
        context.points = context.points.filter(
            (point) => Date.now() - point.t < 500
        );
        if (!context.points.length) {
            v = 0;
        } else {
            // 计算速度
            let d = Math.sqrt(
                (point.clientX - context.points[0].x) ** 2 +
                (point.clientY - context.points[0].y) ** 2
            );
            v = d / (Date.now() - context.points[0].t);
        }

        if (v > 1.5) {
            this.dispatcher.dispatch("flick", {
                startX: context.startX,
                startY: context.startY,
                clientX: point.clientX,
                clientY: point.clientY,
                isVertical: context.isVertical,
                isFlick: context.isFlick,
                velocity: v
            });
            context.isFlick = true;
        } else {
            context.isFlick = false;
        }

        if (context.isPan) {
            this.dispatcher.dispatch("panend", {
                startX: context.startX,
                startY: context.startY,
                clientX: point.clientX,
                clientY: point.clientY,
                isVertical: context.isVertical,
                isFlick: context.isFlick,
                velocity: v
            });
        }

        this.dispatcher.dispatch("end", {
            startX: context.startX,
            startY: context.startY,
            clientX: point.clientX,
            clientY: point.clientY,
            isVertical: context.isVertical,
            isFlick: context.isFlick,
            velocity: v
        });
    };

    cancel = (point, context) => {
        clearTimeout(context.handler);
        this.dispatcher.dispatch("cancel", {});
    };
}

export function enableGesture(element) {
    new Listener(element, new Recognizer(new Dispatcher(element)));
}