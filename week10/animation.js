const TICK = Symbol("tick");
const TICK_HANDLER = Symbol("tick-handler");
const ANIMATIONS = Symbol("animations");
const START_TIME = Symbol("start-time");
const PAUSE_START = Symbol("pause-start");
const PAUSE_TIME = Symbol("pause-time");

export class Timeline {
    constructor() {
        // 状态管理，使时间线功能健壮性提升
        this.state = "inited";

        // animation队列
        this[ANIMATIONS] = new Set();
        // 每个动画的开始时间（在timeline start之后add进来的动画时间不一致）
        this[START_TIME] = new Map();
    }

    start() {
        if (this.state !== "inited") {
            return;
        }
        this.state = "started";

        this.startTime = Date.now();
        // 暂停时间
        this[PAUSE_TIME] = 0;
        this[TICK] = () => {
            let now = Date.now();
            for (let animation of this[ANIMATIONS]) {
                let t;
                if (this[START_TIME].get(animation) < this.startTime) {
                    t = now - this.startTime - this[PAUSE_TIME] - animation.delay;
                } else {
                    t =
                        now -
                        this[START_TIME].get(animation) -
                        this[PAUSE_TIME] -
                        animation.delay;
                }

                if (t > animation.duration) {
                    this[ANIMATIONS].delete(animation);
                    t = animation.duration;
                }

                if (t > 0) {
                    animation.receive(t);
                }
            }
            this[TICK_HANDLER] = requestAnimationFrame(this[TICK]);
        };
        this[TICK]();
    }

    /** 播放速率 */
    //   get rate() {}
    //   set rate() {}

    pause() {
        if (this.state !== "started") {
            return;
        }
        this.state = "paused";
        // 暂停时记录当时时间，为了resume时使用
        this[PAUSE_START] = Date.now();
        cancelAnimationFrame(this[TICK_HANDLER]);
    }
    resume() {
        if (this.state !== "paused") {
            return;
        }
        this.state = "started";
        this[PAUSE_TIME] += Date.now() - this[PAUSE_START];
        this[TICK]();
    }

    reset() {
        this.pause();
        this.state = "inited";
        this[PAUSE_TIME] = 0;
        this[ANIMATIONS] = new Set();
        this[START_TIME] = new Map();
        this[PAUSE_START] = 0;
        this[TICK_HANDLER] = null;
    }

    add(animation, startTime) {
        if (arguments.length < 2) {
            startTime = Date.now();
        }
        this[ANIMATIONS].add(animation);
        // 时间线已经开始执行，再add的情况，记录开始时间
        this[START_TIME].set(animation, startTime);
    }
    remove() { }
}

export class Animation {
    constructor(
        object,
        property,
        startValue,
        endValue,
        duration,
        delay,
        timingFunction,
        template
    ) {
        timingFunction = timingFunction || ((v) => v);
        template = template || ((v) => v);

        this.object = object;
        this.property = property;
        this.startValue = startValue;
        this.endValue = endValue;
        this.duration = duration;
        this.delay = delay;
        // 控制非匀速的效果
        this.timingFunction = timingFunction;
        this.template = template;
    }

    receive(time) {
        let range = this.endValue - this.startValue;
        let progress = this.timingFunction(time / this.duration);
        this.object[this.property] = this.template(
            this.startValue + range * progress
        );
    }
}