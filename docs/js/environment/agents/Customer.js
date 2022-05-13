import Order from "../data/Order.js";
import Holder from "./Holder.js";
import ProductModel from "../data/ProductModel.js";
import ProductModelEnum from "../data/ProductModelEnum.js";
import { getRandomNumber } from "../data/RandomInterval.js";
import { getRandom, randomInt } from "../utils.js";
import { isProductType } from "../data/types/ProductType.js";
let idx = 0;
export default class Customer extends Holder {
    constructor(addNewOrderToEnvironment, communicationDelay, orderIntervalDelay, startOrderProportion, getProcessTypes) {
        super(communicationDelay, { x: 0, y: 500 });
        this.newOrderEvent = (currentTime, addNewEventHandler) => {
            const productProcesses = this.getProcessTypes().filter(processType => isProductType(processType.output.type));
            const hasProcess = productProcesses.length !== 0;
            let productModelType;
            const dice = randomInt(0, this.startOrderProportion.text
                + this.startOrderProportion.image
                + this.startOrderProportion.cad
                + (hasProcess ? this.startOrderProportion.process : 0)
                + 1);
            if (dice < this.startOrderProportion.text) {
                productModelType = ProductModelEnum.Text;
            }
            else if (dice < this.startOrderProportion.text + this.startOrderProportion.image) {
                productModelType = ProductModelEnum.Image;
            }
            else if (!hasProcess || dice < this.startOrderProportion.text + this.startOrderProportion.image + this.startOrderProportion.cad) {
                productModelType = ProductModelEnum.CAD;
            }
            else {
                productModelType = ProductModelEnum.Process;
            }
            const productId = hasProcess ? (getRandom(productProcesses)[0].output.type.id) : undefined;
            addNewEventHandler({
                time: currentTime + getRandomNumber(this.communicationDelay),
                eventHandler: (time) => {
                    const order = new Order(1, new ProductModel(productModelType), time, productId);
                    this.addNewOrderToEnvironment(order, time);
                }
            });
            addNewEventHandler({
                time: currentTime + getRandomNumber(this.newOrderDelay),
                eventHandler: this.newOrderEvent
            });
        };
        this.id = `Customer-${++idx}`;
        this.addNewOrderToEnvironment = addNewOrderToEnvironment;
        this.newOrderDelay = orderIntervalDelay;
        this.startOrderProportion = startOrderProportion;
        this.getProcessTypes = getProcessTypes;
    }
}
