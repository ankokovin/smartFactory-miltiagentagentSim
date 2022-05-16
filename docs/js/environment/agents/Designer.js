import { isOrder } from "../data/Order.js";
import ProductModelEnum from "../data/ProductModelEnum.js";
import { getRandomNumber } from "../data/RandomInterval.js";
import DesignerBusinessReply from "../query/DesignerBusinessReply.js";
export const designsInWorks = new Map();
export const designsDone = new Map();
export function resetDesignsCounts() {
    designsInWorks.set(ProductModelEnum.Text, 0);
    designsInWorks.set(ProductModelEnum.Image, 0);
    designsInWorks.set(ProductModelEnum.CAD, 0);
    designsDone.set(ProductModelEnum.Text, 0);
    designsDone.set(ProductModelEnum.Image, 0);
    designsDone.set(ProductModelEnum.CAD, 0);
}
let idx = 0;
export default class Designer {
    constructor(getOrderQueue, getProcessMaker, communicationDelay, plannerDurations) {
        this.isBusy = false;
        this.handleOrder = (currentTime, addNewEventHandler, order) => {
            var _a;
            if (!isOrder(order)) {
                return;
            }
            const delay = this.plannerDurations.get(order.currentProductModel.type);
            const timeToAdd = delay ? getRandomNumber(delay) : 1;
            designsInWorks.set(order.currentProductModel.type, ((_a = designsInWorks.get(order.currentProductModel.type)) !== null && _a !== void 0 ? _a : 0) + 1);
            const nextHandler = (newProductModelEnum) => {
                const handler = (currentTime, addNewEventHandler, order) => {
                    var _a, _b;
                    if (!isOrder(order))
                        return;
                    designsInWorks.set(order.currentProductModel.type, ((_a = designsInWorks.get(order.currentProductModel.type)) !== null && _a !== void 0 ? _a : 1) - 1);
                    designsDone.set(order.currentProductModel.type, ((_b = designsDone.get(order.currentProductModel.type)) !== null && _b !== void 0 ? _b : 0) + 1);
                    order.currentProductModel.type = newProductModelEnum;
                    return this.handleOrder(currentTime, addNewEventHandler, order);
                };
                return handler;
            };
            if (order.currentProductModel.type === ProductModelEnum.Text) {
                this.isBusy = true;
                addNewEventHandler({
                    time: currentTime + timeToAdd,
                    object: order,
                    eventHandler: nextHandler(ProductModelEnum.Image),
                });
            }
            if (order.currentProductModel.type === ProductModelEnum.Image) {
                this.isBusy = true;
                addNewEventHandler({
                    time: currentTime + timeToAdd,
                    object: order,
                    eventHandler: nextHandler(ProductModelEnum.CAD)
                });
            }
            if (order.currentProductModel.type === ProductModelEnum.CAD) {
                this.isBusy = true;
                addNewEventHandler({
                    time: currentTime + timeToAdd,
                    object: order,
                    eventHandler: nextHandler(ProductModelEnum.Process)
                });
            }
            if (order.currentProductModel.type === ProductModelEnum.Process) {
                addNewEventHandler({
                    time: currentTime + getRandomNumber(this.communicationDelay),
                    object: order,
                    eventHandler: this.getProcessMaker().handleNewProcess
                });
                this.isBusy = false;
            }
        };
        this.handleCheckBusy = (currentTime, addNewEventHandler) => {
            addNewEventHandler({
                time: currentTime + getRandomNumber(this.communicationDelay),
                eventHandler: this.getOrderQueue().handleDesignerCheckAnswer,
                object: new DesignerBusinessReply(!this.isBusy, this.id)
            });
        };
        this.id = `Designer-${++idx}`;
        this.getOrderQueue = getOrderQueue;
        this.getProcessMaker = getProcessMaker;
        this.communicationDelay = communicationDelay;
        this.plannerDurations = plannerDurations;
    }
}
