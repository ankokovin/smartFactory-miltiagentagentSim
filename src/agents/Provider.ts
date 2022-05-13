import { EventHandler } from "../data/AgentEvent";
import Resource from "../data/material/Resource";
import ResourceOrder from "../data/material/ResourceOrder";
import Point from "../data/Point";
import ProcessInput from "../data/process/ProcessInput";
import RandomInterval, { getRandomNumber } from "../data/RandomInterval";
import ResourceType, { isResourceType, ResourceTypeId } from "../data/types/ResourceType";
import IAgent from "../interfaces/IAgent";
import ILocatable from "../interfaces/ILocatable";
import Holder, { HolderReserveQuery, HolderSupplyQuery, HolderSupplyResponse, ResourceCollection } from "./Holder";
import Process from "./Process";

let idx = 0;

type getHolders = () => Holder[]
type getProcesses = () => Process[]
type getResourceTypeById = (a: string) => ResourceType | undefined

export default class Provider extends Holder implements IAgent, ILocatable {
    constructor(
        getHolders: getHolders, 
        getProcesses: getProcesses, 
        getResourceTypeById: getResourceTypeById,
        communicationDelay: RandomInterval,
        position? : Point) {
        super(communicationDelay);
        this.id = `Provider-${++idx}`
        this.position = position ?? {x: 1000, y: 1000}
        this.getHolders = getHolders
        this.getProcesses = getProcesses;
        this.getResourceTypeById = getResourceTypeById;
        this.currentSupply = new Map();
        this.expectingHolderAnswers = false
    }
    id: string;
    expectingHolderAnswers: boolean
    safety_multiplyer = 1.2;

    checkOrders: EventHandler = (time, addNewEvent) => {
        this.currentSupply.clear()
        this.expectingHolderAnswers = true
        this.getHolders()
            .forEach(holder => addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                object: new HolderSupplyQuery(this),
                eventHandler: holder.handleProviderQuery
            }))
        addNewEvent({
            time: time + 10,
            eventHandler: this.createNewSupplyOrders
        })
        addNewEvent({
            time: time + 20,
            eventHandler: this.checkOrders
        })
    }

    private createNewSupplyOrder(typeId: string, reqCount: number): ResourceOrder {
        const type = this.getResourceTypeById(typeId)
        if (!type) throw Error('unexpected typeId ' + typeId)
        const quantity = reqCount * this.safety_multiplyer
        return new ResourceOrder(
            `supply order ${++idx}`,
            type,
            quantity
        )
    }

    createNewSupplyOrders: EventHandler = (time, addNewEvent) => {
        this.expectingHolderAnswers = false
        const newSupplyOrders : ResourceOrder[] = [...this.getDeficit().entries()]
            .map(([typeId, count]) => this.createNewSupplyOrder(typeId, count))
        this.resourceOrders = [...this.resourceOrders, ...newSupplyOrders]
        newSupplyOrders.forEach(order => addNewEvent({
            time: time + 5,
            eventHandler: this.handleSupplyOrderCame,
            object: order
        }))
    }

    handleSupplyOrderCame: EventHandler = (_time, _addNewEvent, supOrder) => {
        if (!(supOrder instanceof ResourceOrder)) return
        this.addResource(new Resource(this.position, supOrder.type, supOrder.quantity))
        this.resourceOrders = this.resourceOrders.filter(order => order.id != supOrder.id)
    }

    position: Point;
    updatePosition(newPosition: Point): void {
        throw new Error("Provider cannot move.");
    }
    resourceOrders: ResourceOrder[] = [];

    getHolders: getHolders;
    getProcesses: getProcesses;
    getResourceTypeById: getResourceTypeById;


    private getDemand() : Map<ResourceTypeId, number> {
        const emptyProcessInputList : ProcessInput[] = []
        const emptyDemandMap: Map<ResourceTypeId, number> = new Map()
        
        return this.getProcesses()
            .reduce((inputList, item) => {
                inputList = [...inputList, ...item.type.input]
                return inputList
            }, emptyProcessInputList)
            .filter(input => isResourceType(input.type))
            .reduce((map, item) => {
                const key = item.type.id
                const oldValue = map.get(key)
                if (oldValue) {
                    map.set(key, oldValue + item.quantity)
                } else {
                    map.set(key, item.quantity)
                }
                return map
            }, emptyDemandMap)
    }

    private currentSupply: ResourceCollection

    handleSupplyResponse: EventHandler = (_time, _addNewEvent, response) => {
        if (!(response instanceof HolderSupplyResponse) || !this.expectingHolderAnswers) return
        for (const [typeId, count] of response.resources.entries()) {
            const curCount = this.currentSupply.get(typeId)
            this.currentSupply.set(typeId, count + (curCount ?? 0))
        }
    }

    private getOrderedResources(): Map<string, number> {
        const emptyOrderMap: Map<string, number> = new Map()

        return this.resourceOrders
        .reduce((map, item) => {
            const key = item.type.id
            const oldValue = map.get(key)
            if (oldValue) {
                map.set(key, oldValue - item.quantity)
            } else {
                map.set(key, -item.quantity)
            }
            return map
        }, emptyOrderMap)
    }

    private getDeficit() : Map<string, number> {
        const emptyDemandMap: Map<string, number> = new Map()
        const demand = this.getDemand()
        const supply = this.currentSupply
        const ordered = this.getOrderedResources()

        return new Map([...[...demand.entries(), ...supply.entries(), ...ordered.entries()]
            .reduce((map, item) => {
                const key = item[0]
                const oldValue = map.get(key)
                if (oldValue) {
                    map.set(key, oldValue + item[1])
                } else {
                    map.set(key, item[1])
                }
                return map
            }, emptyDemandMap)
            .entries()]
            .filter(item => item[1] > 0));
    }
}