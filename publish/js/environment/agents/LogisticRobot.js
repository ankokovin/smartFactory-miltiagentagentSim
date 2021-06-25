import { randomInt } from "../utils.js";
let counter = 0;
export default class LogisticRobot {
    constructor(speed, position) {
        this.subscriber = undefined;
        this.id = `LogisticRobot-${++counter}`;
        this.position = position !== null && position !== void 0 ? position : { x: randomInt(0, 1000), y: randomInt(0, 1000) };
        this.speed = speed;
    }
    updatePosition(newPosition) {
        var _a;
        this.position = newPosition;
        if ((_a = this.resource) === null || _a === void 0 ? void 0 : _a.isBeingHeld) {
            this.resource.updatePosition(newPosition);
        }
    }
    run() {
        var _a, _b;
        if (this.target) {
            let vec = {
                x: this.target.x - this.position.x,
                y: this.target.y - this.position.y
            };
            let mag = vec.x * vec.x + vec.y * vec.y;
            if (mag <= this.speed * this.speed) {
                this.updatePosition({
                    x: this.target.x,
                    y: this.target.y
                });
                if (this.resource) {
                    this.resource.isBeingHeld = !this.resource.isBeingHeld;
                    if (!this.resource.isBeingHeld) {
                        console.log(`robot ${this.id} brought resource!`);
                        (_a = this.newPlace) === null || _a === void 0 ? void 0 : _a.addResource(this.resource);
                        this.resource = undefined;
                        this.newPlace = undefined;
                        this.target = undefined;
                        if (this.subscriber)
                            this.subscriber();
                        this.subscriber = undefined;
                    }
                    else {
                        this.target = (_b = this.newPlace) === null || _b === void 0 ? void 0 : _b.position;
                    }
                }
            }
            else {
                vec = {
                    x: vec.x * this.speed / Math.sqrt(mag),
                    y: vec.y * this.speed / Math.sqrt(mag)
                };
                this.updatePosition({
                    x: this.position.x + vec.x,
                    y: this.position.y + vec.y
                });
            }
        }
    }
    pickupResource(resource, newPlace, subscriber) {
        console.log(`robot ${this.id} goes to pickup ${JSON.stringify(resource)}`);
        this.resource = resource;
        this.target = resource.position;
        this.newPlace = newPlace;
        this.subscriber = subscriber;
    }
}
