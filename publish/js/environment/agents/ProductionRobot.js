import Detail from "../data/material/Detail.js";
import Product from "../data/material/Product.js";
import { isDetailType } from "../data/types/DetailType.js";
import { isProductType } from "../data/types/ProductType.js";
import { randomInt } from "../utils.js";
import Holder from "./Holder.js";
let idx = 0;
export default class ProductionRobot extends Holder {
    constructor(type, getCapabilities, position) {
        super();
        this.id = `ProductionRobot-${++idx}`;
        this.type = type;
        this.position = position !== null && position !== void 0 ? position : { x: randomInt(0, 1000), y: randomInt(0, 1000) };
        this.getCapabilities = () => getCapabilities(this);
        this.isBusy = false;
        this.reserved = new Holder(this.position);
    }
    run() {
    }
    announceWork(process) {
        return !this.isBusy && this.getCapabilities().some(c => c.processType === process.type);
    }
    manufacture(process) {
        let count = process.processCount;
        process.type.input.map(({ type, quantity }) => { return { type, quantity: quantity * count }; })
            .forEach(input => {
            let val = this.reserved.resources.get(input.type.id);
            if (!val || val < input.quantity) {
                throw new Error();
            }
            this.reserved.updateResource(input.type.id, val - input.quantity);
        });
        let outputType = process.type.output.type;
        let outputQuantity = process.type.output.quantity * count;
        let result = null;
        if (isDetailType(outputType)) {
            result = new Detail(this.position, outputType, outputQuantity);
        }
        else if (isProductType(outputType)) {
            result = new Product(this.position, outputType, outputQuantity);
        }
        if (result != null) {
            this.addResource(result);
        }
        this.isBusy = false;
        return result;
    }
}
export function isProductionRobot(object) {
    var _a;
    return (_a = object === null || object === void 0 ? void 0 : object.id) === null || _a === void 0 ? void 0 : _a.startsWith('ProductionRobot');
}
