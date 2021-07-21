import { Component, STATE, ATTRIBUTE } from "./framework.js";
import { enableGesture } from "./gesture.js";
import { Timeline, Animation } from "./animation.js";
import { ease } from "./cubicBezier";

export { STATE, ATTRIBUTE };

export class Carousel extends Component {
    constructor() {
        super();
    }

    render() {
        this.root = document.createElement("div");
        this.root.classList.add("carousel");
        for (let record of this[ATTRIBUTE].src) {
            let child = document.createElement("div");
            child.style.backgroundImage = `url(${record.img})`;
            this.root.appendChild(child);
        }

        enableGesture(this.root);

        let timeline = new Timeline();
        timeline.start();

        let children = this.root.children;

        let handler = null;

        this[STATE].position = 0;

        // 动画时间
        let t = Date.now();
        // 动画造成的偏移
        let ax = 0;

        const nextPicture = () => {
            let children = this.root.children;
            let nextIndex = (this[STATE].position + 1) % children.length;

            let current = children[this[STATE].position];
            let next = children[nextIndex];

            t = Date.now();

            timeline.add(
                new Animation(
                    current.style,
                    "transform",
                    -this[STATE].position * 500,
                    -500 - this[STATE].position * 500,
                    500,
                    0,
                    ease,
                    (v) => `translateX(${v}px)`
                )
            );
            timeline.add(
                new Animation(
                    next.style,
                    "transform",
                    500 - nextIndex * 500,
                    -nextIndex * 500,
                    500,
                    0,
                    ease,
                    (v) => `translateX(${v}px)`
                )
            );

            this[STATE].position = nextIndex;
            this.triggerEvent("change", { position: this[STATE].position });
        };

        this.root.addEventListener("start", (event) => {
            timeline.pause();
            clearInterval(handler);
            let progress = (Date.now() - t) / 500;
            if (progress < 1) {
                ax = ease(progress) * 500 - 500;
            } else {
                ax = 0;
            }
        });

        this.root.addEventListener("tap", (event) => {
            this.triggerEvent("click", {
                position: this[STATE].position,
                data: this[ATTRIBUTE].src[this[STATE].position]
            });
        });

        this.root.addEventListener("pan", (event) => {
            // 拖动的距离
            let x = event.clientX - event.startX - ax;
            let current = this[STATE].position - (x - (x % 500)) / 500;

            // 把前一个和后一个位置设置好
            for (let offset of [-1, 0, 1]) {
                let pos = current + offset;
                // 循环取余技巧 使结果总为正
                pos = ((pos % children.length) + children.length) % children.length;

                children[pos].style.transition = "none";
                children[pos].style.transform = `translateX(${-pos * 500 + offset * 500 + (x % 500)
                    }px)`;
            }
        });

        this.root.addEventListener("end", (event) => {
            timeline.reset();
            timeline.start();
            handler = setInterval(nextPicture, 3000);

            let x = event.clientX - event.startX - ax;
            let current = this[STATE].position - (x - (x % 500)) / 500;

            let direction = Math.round((x % 500) / 500);

            if (event.isFlick) {
                if (event.velocity < 0) {
                    direction = Math.ceil((x % 500) / 500);
                } else {
                    direction = Math.floor((x % 500) / 500);
                }
            }

            for (let offset of [-1, 0, 1]) {
                let pos = current + offset;
                // 循环取余技巧 使结果总为正
                pos = ((pos % children.length) + children.length) % children.length;

                children[pos].style.transition = "none";
                timeline.add(
                    new Animation(
                        children[pos].style,
                        "transform",
                        -pos * 500 + offset * 500 + (x % 500),
                        -pos * 500 + offset * 500 + direction * 500,
                        500,
                        0,
                        ease,
                        (v) => `translateX(${v}px)`
                    )
                );
            }

            this[STATE].position =
                this[STATE].position - (x - (x % 500)) / 500 - direction;
            this[STATE].position =
                ((this[STATE].position % children.length) + children.length) %
                children.length;
            this.triggerEvent("change", { position: this[STATE].position });
        });

        handler = setInterval(nextPicture, 3000);

        return this.root;
    }

    mountTo(parent) {
        parent.appendChild(this.render());
    }
}