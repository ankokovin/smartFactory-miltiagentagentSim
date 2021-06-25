import Detail from "../data/material/Detail.js";
import Resource from "../data/material/Resource.js";
import { isDetailType } from "../data/types/DetailType.js";
import { randomInt } from "../utils.js";
let idx = 0;
export default class Holder {
    constructor(position) {
        this.resources = new Map();
        this.id = `Holder-${++idx}`;
        this.position = position !== null && position !== void 0 ? position : { x: randomInt(0, 1000), y: randomInt(0, 1000) };
    }
    addResource(r) {
        const key = r.type.id;
        const val = this.resources.get(key);
        if (val) {
            this.resources.set(key, val + r.quantity);
        }
        else {
            this.resources.set(key, r.quantity);
        }
    }
    getResource(r, targetQuantity) {
        const val = this.resources.get(r.id);
        if (!val) {
            return null;
        }
        let res;
        const getRes = (quantity) => {
            if (isDetailType(r))
                return new Detail(this.position, r, quantity);
            return new Resource(this.position, r, quantity);
        };
        if (val > targetQuantity) {
            res = getRes(targetQuantity);
            this.resources.set(r.id, val - targetQuantity);
        }
        else {
            res = getRes(val);
            this.resources.delete(r.id);
        }
        return res;
    }
    updateResource(typeId, value) {
        if (value == 0) {
            this.resources.delete(typeId);
            return;
        }
        this.resources.set(typeId, value);
    }
    run(turn) {
        //    throw new Error("Not implemented")
    }
    announce(input) {
        return this.resources.has(input.type.id);
    }
}
export function isHolder(object) {
    return object === null || object === void 0 ? void 0 : object.id.startsWith('Holder');
}
