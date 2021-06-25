import Order from "../data/Order.js";
import { randomNumber } from "../utils.js";
import Holder from "./Holder.js";
let idx = 0;
export default class Customer extends Holder {
    constructor(orderProbability) {
        super({ x: 0, y: 500 });
        this.id = `Customer-${++idx}`;
        this.orderProbability = orderProbability;
    }
    run() {
        if (Math.random() <= this.orderProbability) {
            return new Order(randomNumber(1, 10), `Product-${randomNumber(1, 10)}`, 'test');
        }
    }
    getResource(r, targetQuantity) {
        throw new Error("cannot get from customer");
    }
}
