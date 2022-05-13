import { AgentEventArgument } from "../data/AgentEvent.js";
import Detail from "../data/material/Detail.js";
import Product from "../data/material/Product.js";
import { getRandomNumber } from "../data/RandomInterval.js";
import { isDetailType } from "../data/types/DetailType.js";
import { isProductType } from "../data/types/ProductType.js";
import { randomInt } from "../utils.js";
import { ReservedHolder } from "./Holder.js";
import { isProcess } from "./Process.js";
let idx = 0;
export default class ProductionRobot {
    constructor(type, getCapabilities, communicationDelay, duration, position) {
        this.manufacture = (time, addNewEvent, query) => {
            if (!(query instanceof StartManufactureQuery))
                return;
            console.log('manufacture', this.id, time);
            const process = query.process;
            const count = process.processCount;
            process.type.input.map(({ type, quantity }) => { return { type, quantity: quantity * count }; })
                .forEach(input => {
                const val = this.reservedInput.publicGetResource(input.type, input.quantity);
                if (!val || val.quantity < input.quantity) {
                    throw new Error();
                }
            });
            const outputType = process.type.output.type;
            const outputQuantity = process.type.output.quantity * count;
            addNewEvent({
                time: time + getRandomNumber(this.duration),
                eventHandler: this.manifactureDone,
                object: new ManifactureDone(outputQuantity, outputType, query.callback)
            });
        };
        this.manifactureDone = (time, addNewEvent, query) => {
            if (!(query instanceof ManifactureDone))
                return;
            console.log('manifactureDone', this.id, time);
            const outputType = query.type;
            const outputQuantity = query.quantity;
            let result = null;
            if (isDetailType(outputType)) {
                result = new Detail(this.position, outputType, outputQuantity);
            }
            else if (isProductType(outputType)) {
                result = new Product(this.position, outputType, outputQuantity);
            }
            if (!result)
                throw new Error();
            this.isBusy = false;
            addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                eventHandler: query.callback,
                object: new ManifactureResult(result)
            });
        };
        this.handleProcessAnnouncement = (time, addNewEvent, process) => {
            if (!isProcess(process))
                return;
            addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                object: new ProductionRobotReply(this.availableForProcess(process), this.id),
                eventHandler: process.handleProdAgentAnnouncementResponse
            });
        };
        this.handleReserve = (time, addNewEvent, process) => {
            if (!isProcess(process))
                return;
            addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                eventHandler: process.handleReserveProductionResponse,
                object: new ProductionRobotReserveResult(this.id, !this.isBusy)
            });
            if (!this.isBusy) {
                this.isBusy = true;
            }
        };
        this.handleUnreserve = (time, addNewEvent) => {
            this.isBusy = false;
        };
        this.handleCurrentResourceStatus = (time, addNewEvent, query) => {
            if (!(query instanceof ReservedStatusQuery))
                return;
            const curReservedResources = this.reservedInput.getAllResources();
            addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                eventHandler: query.callback,
                object: new ReservedStatus(curReservedResources)
            });
        };
        this.id = `ProductionRobot-${++idx}`;
        this.type = type;
        this.getCapabilities = () => getCapabilities(this);
        this.isBusy = false;
        this.position = position !== null && position !== void 0 ? position : { x: randomInt(0, 1000), y: randomInt(0, 1000) };
        this.communicationDelay = communicationDelay;
        this.duration = duration;
        this.reservedInput = new ReservedHolder(communicationDelay, this.position);
    }
    availableForProcess(process) {
        return !this.isBusy && this.getCapabilities().some(c => c.processType === process.type);
    }
}
export class ProductionRobotReply {
    constructor(isReady, id) {
        this.id = id;
        this.isReady = isReady;
    }
}
export class ProductionRobotReserveResult extends AgentEventArgument {
    constructor(id, success) {
        super();
        this.id = id;
        this.success = success;
    }
}
export class StartManufactureQuery extends AgentEventArgument {
    constructor(process, callback) {
        super();
        this.process = process;
        this.callback = callback;
    }
}
class ManifactureDone extends AgentEventArgument {
    constructor(quantity, type, callback) {
        super();
        this.quantity = quantity;
        this.type = type;
        this.callback = callback;
    }
}
export class ManifactureResult extends AgentEventArgument {
    constructor(detail) {
        super();
        this.detail = detail;
    }
}
export class ReservedStatusQuery extends AgentEventArgument {
    constructor(callback) {
        super();
        this.callback = callback;
    }
}
export class ReservedStatus extends AgentEventArgument {
    constructor(resources) {
        super();
        this.resources = resources;
    }
}
export function isProductionRobot(object) {
    var _a;
    return (_a = object === null || object === void 0 ? void 0 : object.id) === null || _a === void 0 ? void 0 : _a.startsWith('ProductionRobot');
}
