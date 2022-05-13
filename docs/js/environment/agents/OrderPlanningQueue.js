import PriorityQueue from "../lib/typescript-collections/PriorityQueue.js"
import { isOrder } from "../data/Order.js";
import { getRandomNumber } from "../data/RandomInterval.js";
import { DesignerBusinessReply } from "./Designer.js";
export let orderQueue;
let getAllDesigners;
export default class OrderPlanningQueue {
    constructor(getDesigners, communicationDelay) {
        this.handleAddOrder = (currentTime, addNewEventHandler, order) => {
            if (!isOrder(order))
                return;
            orderQueue.add(order);
            if (!orderQueue.size())
                return;
            getAllDesigners().map(designer => addNewEventHandler({
                time: currentTime + getRandomNumber(this.communicationDelay),
                eventHandler: designer.handleCheckBusy
            }));
        };
        this.handleDesignerCheckAnswer = (currentTime, addNewEventHandler, answer) => {
            if (!(answer instanceof DesignerBusinessReply) || !answer.isReady)
                return;
            const order = orderQueue.dequeue();
            if (!order)
                return;
            const designer = getAllDesigners().filter(des => des.id === answer.id)[0];
            if (!designer)
                return;
            addNewEventHandler({
                time: currentTime + getRandomNumber(this.communicationDelay),
                eventHandler: designer.handleOrder,
                object: order
            });
        };
        getAllDesigners = getDesigners;
        orderQueue = new PriorityQueue((a, b) => b.timeCreated - a.timeCreated);
        this.id = "OrderPlanningQueue";
        this.communicationDelay = communicationDelay;
    }
}
