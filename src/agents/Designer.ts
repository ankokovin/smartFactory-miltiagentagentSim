import IAgent from "../interfaces/IAgent";
import { isOrder } from "../data/Order";
import { AddNewEvent, AgentEventArgument, EventHandler, Time } from "../data/AgentEvent";
import ProductModelEnum from "../data/ProductModelEnum";
import OrderPlanningQueue from "./OrderPlanningQueue";
import { ProcessMaker } from "./ProcessMaker";
import RandomInterval, { getRandomNumber } from "../data/RandomInterval";

export let designsInWorks = new Map<ProductModelEnum,number>()
export let designsDone = new Map<ProductModelEnum, number>() 
export function resetDesignsCounts() {
    designsInWorks.set(ProductModelEnum.Text, 0)
    designsInWorks.set(ProductModelEnum.Image, 0)
    designsInWorks.set(ProductModelEnum.CAD, 0)
    designsDone.set(ProductModelEnum.Text, 0)
    designsDone.set(ProductModelEnum.Image, 0)
    designsDone.set(ProductModelEnum.CAD, 0)
}



export type getOrderQueue = () => OrderPlanningQueue
export type getProcessMaker = () => ProcessMaker
let idx = 0

export default class Designer implements IAgent {

    constructor(
            getOrderQueue: getOrderQueue, 
            getProcessMaker: getProcessMaker, 
            communicationDelay: RandomInterval, 
            plannerDurations: Map<ProductModelEnum, RandomInterval>) {
        this.id = `Designer-${++idx}`
        this.getOrderQueue = getOrderQueue
        this.getProcessMaker = getProcessMaker
        this.communicationDelay = communicationDelay
        this.plannerDurations = plannerDurations
    }
    private communicationDelay: RandomInterval;
    private plannerDurations: Map<ProductModelEnum, RandomInterval>;
    id: string;
    
    private isBusy = false;
    
    private getOrderQueue: getOrderQueue
    private getProcessMaker: getProcessMaker

    handleOrder: EventHandler  = (currentTime: Time, addNewEventHandler: AddNewEvent, order?: AgentEventArgument) => {
        if (!isOrder(order)) {
            return
        }
        const delay = this.plannerDurations.get(order.currentProductModel.type)
        const timeToAdd = delay ? getRandomNumber(delay) : 1
        designsInWorks.set(order.currentProductModel.type, (designsInWorks.get(order.currentProductModel.type) ?? 0) + 1)
        const nextHandler = (newProductModelEnum: ProductModelEnum) => {
            const handler : EventHandler = (currentTime, addNewEventHandler, order) => {
                if (!isOrder(order)) return
                designsInWorks.set(order.currentProductModel.type, (designsInWorks.get(order.currentProductModel.type) ?? 1) - 1)
                designsDone.set(order.currentProductModel.type, (designsDone.get(order.currentProductModel.type) ?? 0) + 1)
                order.currentProductModel.type = newProductModelEnum
                return this.handleOrder(currentTime, addNewEventHandler, order)
            }
            return handler
        }
        if (order.currentProductModel.type === ProductModelEnum.Text) {
            this.isBusy = true
            addNewEventHandler({
                time: currentTime + timeToAdd,
                object: order,
                eventHandler: nextHandler(ProductModelEnum.Image),
            })
        }
        if (order.currentProductModel.type === ProductModelEnum.Image) {
            this.isBusy = true
            addNewEventHandler({
                time: currentTime + timeToAdd,
                object: order,
                eventHandler: nextHandler(ProductModelEnum.CAD)
            })
        }
        if (order.currentProductModel.type === ProductModelEnum.CAD) {
            this.isBusy = true
            addNewEventHandler({
                time: currentTime + timeToAdd,
                object: order,
                eventHandler: nextHandler(ProductModelEnum.Process)
            })
        }
        if (order.currentProductModel.type === ProductModelEnum.Process) {
            addNewEventHandler({
                time: currentTime + getRandomNumber(this.communicationDelay),
                object: order,
                eventHandler: this.getProcessMaker().handleNewProcess
            })
            this.isBusy = false
        }
    }
    
    handleCheckBusy: EventHandler = (currentTime, addNewEventHandler) => {
        addNewEventHandler({
            time: currentTime + getRandomNumber(this.communicationDelay),
            eventHandler: this.getOrderQueue().handleDesignerCheckAnswer,
            object: new DesignerBusinessReply(!this.isBusy, this.id)
        })
    }
}

export class DesignerBusinessReply extends AgentEventArgument {
    isReady: boolean
    id: string

    constructor(reply: boolean, id: string) {
        super()
        this.isReady = reply;
        this.id = id;
    }
}