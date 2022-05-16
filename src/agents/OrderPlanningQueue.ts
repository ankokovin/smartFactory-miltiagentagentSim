import PriorityQueue from 'typescript-collections/dist/lib/PriorityQueue';
import { EventHandler } from '../data/AgentEvent';
import Order, { isOrder } from '../data/Order';
import RandomInterval, { getRandomNumber } from '../data/RandomInterval';

import IAgent from "../interfaces/IAgent";
import Designer from './Designer';
import DesignerBusinessReply from "../query/DesignerBusinessReply";

export type GetAllDesigners = () => Designer[];

export let orderQueue: PriorityQueue<Order> 
let getAllDesigners: GetAllDesigners

export default class OrderPlanningQueue implements IAgent {
    id: string

    constructor(getDesigners: GetAllDesigners, communicationDelay: RandomInterval) {
        getAllDesigners = getDesigners;
        orderQueue = new PriorityQueue<Order>((a: Order, b: Order) => b.timeCreated - a.timeCreated)
        this.id =  "OrderPlanningQueue"
        this.communicationDelay = communicationDelay
    }
    communicationDelay: RandomInterval;

    handleAddOrder: EventHandler  = (currentTime, addNewEventHandler, order) => {
        if (!isOrder(order)) return;
        orderQueue.add(order)
        if (!orderQueue.size()) return
        getAllDesigners().map(designer => addNewEventHandler({
            time: currentTime + getRandomNumber(this.communicationDelay),
            eventHandler: designer.handleCheckBusy
        }))
    }

    handleDesignerCheckAnswer: EventHandler  = (currentTime, addNewEventHandler, answer) => {
        if (!(answer instanceof DesignerBusinessReply) || !answer.isReady) return
        const order = orderQueue.dequeue()
        if (!order) return
        const designer = getAllDesigners().filter(des => des.id === answer.id)[0] 
        if (!designer) return
        addNewEventHandler(
            {
                time: currentTime + getRandomNumber(this.communicationDelay),
                eventHandler: designer.handleOrder,
                object: order
            }
        )
    }
}