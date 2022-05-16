import { AgentEventArgument } from "../data/AgentEvent.js";
import Detail from "../data/material/Detail.js";
import Product from "../data/material/Product.js";
import { getRandomNumber } from "../data/RandomInterval.js";
import { isDetailType } from "../data/types/DetailType.js";
import { isProductType } from "../data/types/ProductType.js";
import { randomInt } from "../utils.js";
import { ReservedHolder } from "./ReservedHolder.js";
import { isProcess } from "./Process.js";
import ProductionRobotReply from "../query/ProductionRobotReply.js";
import ManifactureResult from "../query/ManifactureResult.js";
import ProductionRobotReserveResult from "../query/ProductionRobotReserveResult.js";
import ReservedStatus from "../query/ReservedStatus.js";
import ReservedStatusQuery from "../query/ReservedStatusQuery.js";
import StartManufactureQuery from "../query/StartManufactureQuery.js";
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
class ManifactureDone extends AgentEventArgument {
    constructor(quantity, type, callback) {
        super();
        this.quantity = quantity;
        this.type = type;
        this.callback = callback;
    }
}
export function isProductionRobot(object) {
    var _a;
    return (_a = object === null || object === void 0 ? void 0 : object.id) === null || _a === void 0 ? void 0 : _a.startsWith('ProductionRobot');
}
