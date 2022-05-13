import { AgentEventArgument, EventHandler } from "../data/AgentEvent";
import Detail from "../data/material/Detail";
import Product from "../data/material/Product";
import Point from "../data/Point";
import Capability from "../data/process/Capability";
import RandomInterval, { getRandomNumber } from "../data/RandomInterval";
import DetailType, { isDetailType } from "../data/types/DetailType";
import ProductionRobotType from "../data/types/ProductionRobotType";
import { isProductType } from "../data/types/ProductType";
import IAgent from "../interfaces/IAgent";
import ILocatable from "../interfaces/ILocatable";
import { randomInt } from "../utils";
import { ReservedHolder, ResourceCollection } from "./Holder";
import Process, { isProcess } from "./Process";

let idx = 0;

type getCapabilities = (a: ProductionRobot) => Capability[]

export default class ProductionRobot implements IAgent, ILocatable {
    constructor(type: ProductionRobotType, 
                getCapabilities: getCapabilities, 
                communicationDelay: RandomInterval,
                duration: RandomInterval,
                position? : Point) {
        this.id = `ProductionRobot-${++idx}`
        this.type = type
        this.getCapabilities = () => getCapabilities(this)
        this.isBusy = false
        this.position = position ?? {x: randomInt(0, 1000), y: randomInt(0, 1000)} 
        this.communicationDelay = communicationDelay
        this.duration = duration
        this.reservedInput = new ReservedHolder(communicationDelay, this.position)
    }
    private communicationDelay: RandomInterval;
    private duration: RandomInterval;
    id: string;
    type: ProductionRobotType;
    private isBusy: boolean;
    reservedInput: ReservedHolder;
    position: Point;    

    getCapabilities : () => Capability[]

    private availableForProcess(process: Process): boolean {
        return !this.isBusy && this.getCapabilities().some(c => c.processType === process.type)
    }

    manufacture : EventHandler = (time, addNewEvent, query) => {
        if (!(query instanceof StartManufactureQuery)) return
        console.log('manufacture', this.id, time)

        const process = query.process
        const count = process.processCount
        process.type.input.map(({type, quantity}) => { return {type, quantity: quantity * count} })
            .forEach(input => {
                const val = this.reservedInput.publicGetResource(input.type, input.quantity)
                if (!val || val.quantity < input.quantity) {
                    throw new Error()
                }
        })
        const outputType = process.type.output.type
        const outputQuantity = process.type.output.quantity * count
        addNewEvent({
            time: time + getRandomNumber(this.duration), 
            eventHandler: this.manifactureDone,
            object: new ManifactureDone(outputQuantity, outputType, query.callback)
        })
    }

    private manifactureDone: EventHandler = (time, addNewEvent, query) => {
        if (!(query instanceof ManifactureDone)) return
        console.log('manifactureDone', this.id, time)

        const outputType = query.type
        const outputQuantity = query.quantity
        let result: Detail | null = null
        if (isDetailType(outputType)) {
            result = new Detail(this.position, outputType, outputQuantity)
        } else if (isProductType(outputType)) {
            result = new Product(this.position, outputType, outputQuantity)
        }
        if (!result) throw new Error()
        this.isBusy = false
        addNewEvent({
            time: time + getRandomNumber(this.communicationDelay),
            eventHandler: query.callback,
            object: new ManifactureResult(result)
        })
    }

    handleProcessAnnouncement: EventHandler = (time, addNewEvent, process) => {
        if (!isProcess(process)) return
        addNewEvent({
            time: time + getRandomNumber(this.communicationDelay),
            object: new ProductionRobotReply(this.availableForProcess(process), this.id),
            eventHandler: process.handleProdAgentAnnouncementResponse
        })
    }

    handleReserve: EventHandler = (time, addNewEvent, process) => {
        if (!isProcess(process)) return
        addNewEvent({
            time: time + getRandomNumber(this.communicationDelay),
            eventHandler: process.handleReserveProductionResponse,
            object: new ProductionRobotReserveResult(this.id, !this.isBusy)
        })
        if (!this.isBusy) {
            this.isBusy = true
        }
    }

    handleUnreserve: EventHandler = (time, addNewEvent) => {
        this.isBusy = false
    }

    handleCurrentResourceStatus: EventHandler = (time, addNewEvent, query) => {
        if (!(query instanceof ReservedStatusQuery)) return
        const curReservedResources = this.reservedInput.getAllResources()
        addNewEvent({
            time: time + getRandomNumber(this.communicationDelay),
            eventHandler: query.callback,
            object: new ReservedStatus(curReservedResources)
        })
    }
}

export class ProductionRobotReply {
    isReady: boolean
    id: string
    constructor(isReady: boolean, id: string) {
        this.id = id
        this.isReady = isReady
    }
}

export class ProductionRobotReserveResult extends AgentEventArgument {
    id: string
    success: boolean
    constructor(id: string, success: boolean) {
        super()
        this.id = id
        this.success = success
    } 
}

export class StartManufactureQuery extends AgentEventArgument {
    process: Process
    callback: EventHandler
    constructor(process: Process, callback: EventHandler) {
        super()
        this.process = process
        this.callback = callback
    }
}

class ManifactureDone extends AgentEventArgument {
    quantity: number
    type: DetailType
    callback: EventHandler
    constructor(quantity: number, type: DetailType, callback: EventHandler) {
        super()
        this.quantity = quantity
        this.type = type
        this.callback = callback
    }
}

export class ManifactureResult extends AgentEventArgument {
    detail: Detail
    constructor(detail: Detail) {
        super()
        this.detail = detail
    }
}

export class ReservedStatusQuery extends AgentEventArgument {
    callback: EventHandler
    constructor(callback: EventHandler) {
        super()
        this.callback = callback
    }
}

export class ReservedStatus extends AgentEventArgument {
    resources: ResourceCollection
    constructor(resources: ResourceCollection) {
        super()
        this.resources = resources
    }
}

export function isProductionRobot(object: any) : object is ProductionRobot {
    return object?.id?.startsWith('ProductionRobot')
}