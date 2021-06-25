import Resource from "../data/material/Resource";
import Point from "../data/Point";
import ProcessInput from "../data/process/ProcessInput";
import ResourceType from "../data/types/ResourceType";
import IAgent from "../interfaces/IAgent";
import ILocatable from "../interfaces/ILocatable";
import { randomInt } from "../utils";

let idx = 0;

export default class Holder implements IAgent, ILocatable {
    constructor(position?: Point) {
        this.id = `Holder-${++idx}`
        this.position = position ?? {x: randomInt(0, 1000), y: randomInt(0, 1000)}
    }
    position: Point;
    id: string;
    resources: Map<string, number> = new Map()

    addResource(r: Resource) {
        const key = r.type.id
        const val = this.resources.get(key) 
        if (val) {
            this.resources.set(key, val + r.quantity)
        } else {
            this.resources.set(key, r.quantity)
        }
    }

    getResource(r: ResourceType, targetQuantity: number) : Resource | null {
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

    updateResource(typeId: string, value: number) {
        if (value == 0) {
            this.resources.delete(typeId)
            return
        }
        this.resources.set(typeId, value);
    }

    run(turn?: number) {
    //    throw new Error("Not implemented")
    }

    announce(input: ProcessInput) : boolean {
        return this.resources.has(input.type.id)
    } 

}

export function isHolder(object: any) : object is Holder {
    return object?.id.startsWith('Holder')
}