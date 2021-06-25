import Resource from "../data/material/Resource";
import ResourceOrder from "../data/material/ResourceOrder";
import Point from "../data/Point";
import ProcessInput from "../data/process/ProcessInput";
import ResourceType, { isResourceType } from "../data/types/ResourceType";
import IAgent from "../interfaces/IAgent";
import ILocatable from "../interfaces/ILocatable";
import { randomInt } from "../utils";
import Holder from "./Holder";
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
        position? : Point) {
        super();
        this.id = `Provider-${++idx}`
        this.position = position ?? {x: 1000, y: 1000}
        this.getHolders = getHolders
        this.getProcesses = getProcesses;
        this.getResourceTypeById = getResourceTypeById;
    }
    id: string;

    safety_multiplyer: number = 1.2;

    run(turn: number) {
        this.resourceOrders
            .filter(item => item.turn <= turn)
            .forEach(item => {
                this.addResource(new Resource(this.position, item.type, item.quantity));
            })
        this.resourceOrders = this.resourceOrders.filter(item => item.turn > turn)
        let deficit = [...this.getDeficit().entries()].map(item => {
            const key = item[0];
            const value = item[1];
            return <ResourceOrder> {
                type: this.getResourceTypeById(key),
                quantity: value * this.safety_multiplyer,
                turn: turn + randomInt(1, 5)
            }
        })
        this.resourceOrders = [...this.resourceOrders, ...deficit]
    }
    position: Point;
    updatePosition(newPosition: Point): void {
        throw new Error("Provider cannot move.");
    }
    resourceOrders: ResourceOrder[] = [];

    getHolders: getHolders;
    getProcesses: getProcesses;
    getResourceTypeById: getResourceTypeById;


    getDemand() : Map<string, number> {
        let emptyProcessInputList : ProcessInput[] = []
        let emptyDemandMap: Map<string, number> = new Map()
        
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

    getSupply(): Map<string, number> {
        return this.getHolders()
            .map(holder => holder.resources)
            .reduce((map, nmap) => {
                for (const [key, value] of nmap.entries()) {
                    if (key.startsWith('Detail')) continue
                    const oldValue = map.get(key)
                    if (oldValue) {
                        map.set(key, oldValue - value)
                    } else {
                        map.set(key, -value)
                    }
                }
                return map
            }, new Map<string, number>())
            
    }

    getOrderedResources(): Map<string, number> {
        let emptyOrderMap: Map<string, number> = new Map()

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

    getDeficit() : Map<string, number> {
        let emptyDemandMap: Map<string, number> = new Map()
        let demand = this.getDemand()
        let supply = this.getSupply()
        let ordered = this.getOrderedResources()

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