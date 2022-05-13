import { AgentEventArgument, EventHandler } from "../data/AgentEvent";
import Detail from "../data/material/Detail";
import Resource from "../data/material/Resource";
import Point from "../data/Point";
import ProcessInput from "../data/process/ProcessInput";
import RandomInterval, { getRandomNumber } from "../data/RandomInterval";
import { isDetailType } from "../data/types/DetailType";
import ResourceType, { ResourceTypeId } from "../data/types/ResourceType";
import IAgent from "../interfaces/IAgent";
import ILocatable from "../interfaces/ILocatable";
import { randomInt } from "../utils";
import Process, { isProcess } from "./Process";
import Provider from "./Provider";

let idx = 0;

export default class Holder implements IAgent, ILocatable {
    constructor(communicationDelay: RandomInterval, position?: Point) {
        this.id = `Holder-${++idx}`
        this.position = position ?? {x: randomInt(0, 1000), y: randomInt(0, 1000)}
        this.communicationDelay = communicationDelay
    }
    communicationDelay: RandomInterval;
    position: Point;
    id: string;
    protected resources: ResourceCollection = new Map()

    protected addResource(r: Resource) {
        const key = r.type.id
        const val = this.resources.get(key) 
        if (val) {
            this.resources.set(key, val + r.quantity)
        } else {
            this.resources.set(key, r.quantity)
        }
    }

    protected getResource(r: ResourceType, targetQuantity: number) : Resource | null {
        const val = this.resources.get(r.id)
        if (!val) {
            return null
        }
        let res : Resource
        const getRes = (quantity: number) => {
            if (isDetailType(r)) return new Detail(this.position, r, quantity)
            return new Resource(this.position, r, quantity)
        }  
        if (val > targetQuantity) {
            res = getRes(targetQuantity)
                this.resources.set(r.id, val - targetQuantity)
            } else {
            res = getRes(val)
            this.resources.delete(r.id)
        }
        return res
    }

    private updateResource(typeId: string, value: number) {
        if (value == 0) {
            this.resources.delete(typeId)
            return
        }
        this.resources.set(typeId, value);
    }

    run() {
    //    throw new Error("Not implemented")
    }

    private hasInput(input: ProcessInput) : boolean {
        return this.resources.has(input.type.id)
    }

    handleReserveResource: EventHandler = (time, addNewEvent, query) => {
        if (!(query instanceof HolderReserveQuery)) return
        const res = this.getResource(query.type, query.targetQuantity)
        if (res) res.isReserved = true
        addNewEvent({
            time: time + getRandomNumber(this.communicationDelay), 
            eventHandler: query.source.handleReserveResourceResponse,
            object: new HolderReserveResponse(this.id, res, query.commandId)
        })
    }

    handleUnreserveResource: EventHandler = (_time, _addNewEvent, query) => {
        if (!(query instanceof HolderUnreserveQuery)) return
        console.assert(query.resource.position == this.position, 'Illegal unreserve resource: ' + JSON.stringify(query))
        this.addResource(query.resource)
    }
    
    handleProcessAnnouncementHolder: EventHandler = (time, addNewEvent, process) => {
        if (!isProcess(process)) return
        addNewEvent({
            time: time + getRandomNumber(this.communicationDelay),
            object: new HolderAnnoucementReply(
                this.id, 
                process.currentInputs
                    .reduce((map, input) => map.set(input, this.hasInput(input)), new Map())),
            eventHandler: process.handleHolderAgentAnnouncementResponse
        })
    }

    private getRawResources() : ResourceCollection {
        const result = new Map()
        for(const [typeId, count] of this.resources.entries()){
            if (typeId.startsWith('Detail')) continue
            result.set(typeId, count + (result.get(typeId) ?? 0))
        }
        return result
    }

    handleProviderQuery: EventHandler = (time, addNewEvent, query) => {
        if (!(query instanceof HolderSupplyQuery)) return
        addNewEvent({
            time: time + getRandomNumber(this.communicationDelay),
            object: new HolderSupplyResponse(this.id, this.getRawResources()),
            eventHandler: query.source.handleSupplyResponse
        })
    }
    
    handlePassResource: EventHandler = (time, addNewEvent, query) => {
        if (!(query instanceof HolderPassResourceQuery)) return
        query.resource.isBeingHeld = false
        this.addResource(query.resource)
        addNewEvent({
            time: time + getRandomNumber(this.communicationDelay),
            eventHandler: query.callback
        })
    }
}

export type ResourceCollection = Map<ResourceTypeId, number>

export class HolderReserveQuery extends AgentEventArgument {
    type: ResourceType
    targetQuantity: number
    source: Process
    commandId: string
    constructor(type: ResourceType, targetQuantity: number, source: Process, commandId: string) {
        super()
        this.type = type
        this.targetQuantity = targetQuantity
        this.source = source
        this.commandId = commandId
    }
}

export class HolderUnreserveQuery extends AgentEventArgument {
    resource: Resource
    source: Process
    constructor(resource: Resource, source: Process) {
        super()
        this.resource = resource
        this.source = source
    }
}

export class HolderReserveResponse extends AgentEventArgument {
    id: string
    result: Resource | null
    commandId: string
    constructor(id: string, result: Resource | null, commandId: string) {
        super()
        this.id = id
        this.result = result
        this.commandId = commandId
    }
}

export class HolderAnnoucementReply extends AgentEventArgument {
    id: string
    availableInputs: Map<ProcessInput, boolean>
    constructor(id: string, availableInputs: Map<ProcessInput, boolean>) {
        super()
        this.id = id
        this.availableInputs = availableInputs
    }
}

export class HolderSupplyQuery extends AgentEventArgument {
    source: Provider
    constructor(source: Provider) {
        super()
        this.source = source
    }
}

export class HolderSupplyResponse extends AgentEventArgument {
    id: string
    resources: ResourceCollection
    constructor(id: string, resources: ResourceCollection) {
        super()
        this.id = id
        this.resources = resources
    }
}

export class HolderPassResourceQuery extends AgentEventArgument {
    resource: Resource
    callback: EventHandler
    constructor(resource: Resource, callback: EventHandler) {
        super()
        this.resource = resource
        this.callback = callback
    }
}

export function isHolder(object: any) : object is Holder {
    return object?.id.startsWith('Holder')
}

export class ReservedHolder extends Holder {
    handleProcessAnnouncementHolder: EventHandler = () => {
        return;
    };
    publicGetResource(r: ResourceType, q: number) {
        return this.getResource(r, q);
    }
    getAllResources(): ResourceCollection {
        return this.resources
    }
    constructor(communicationDelay: RandomInterval, position: Point) {
        super(communicationDelay, position)
    }
}