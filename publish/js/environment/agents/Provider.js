import Resource from "../data/material/Resource.js";
import { isResourceType } from "../data/types/ResourceType.js";
import { randomInt } from "../utils.js";
import Holder from "./Holder.js";
let idx = 0;
export default class Provider extends Holder {
    constructor(getHolders, getProcesses, getResourceTypeById, position) {
        super();
        this.safety_multiplyer = 1.2;
        this.resourceOrders = [];
        this.id = `Provider-${++idx}`;
        this.position = position !== null && position !== void 0 ? position : { x: 1000, y: 1000 };
        this.getHolders = getHolders;
        this.getProcesses = getProcesses;
        this.getResourceTypeById = getResourceTypeById;
    }
    run(turn) {
        this.resourceOrders
            .filter(item => item.turn <= turn)
            .forEach(item => {
            this.addResource(new Resource(this.position, item.type, item.quantity));
        });
        this.resourceOrders = this.resourceOrders.filter(item => item.turn > turn);
        let deficit = [...this.getDeficit().entries()].map(item => {
            const key = item[0];
            const value = item[1];
            return {
                type: this.getResourceTypeById(key),
                quantity: value * this.safety_multiplyer,
                turn: turn + randomInt(1, 5)
            };
        });
        this.resourceOrders = [...this.resourceOrders, ...deficit];
    }
    updatePosition(newPosition) {
        throw new Error("Provider cannot move.");
    }
    getDemand() {
        let emptyProcessInputList = [];
        let emptyDemandMap = new Map();
        return this.getProcesses()
            .reduce((inputList, item) => {
            inputList = [...inputList, ...item.type.input];
            return inputList;
        }, emptyProcessInputList)
            .filter(input => isResourceType(input.type))
            .reduce((map, item) => {
            const key = item.type.id;
            const oldValue = map.get(key);
            if (oldValue) {
                map.set(key, oldValue + item.quantity);
            }
            else {
                map.set(key, item.quantity);
            }
            return map;
        }, emptyDemandMap);
    }
    getSupply() {
        return this.getHolders()
            .map(holder => holder.resources)
            .reduce((map, nmap) => {
            for (const [key, value] of nmap.entries()) {
                if (key.startsWith('Detail'))
                    continue;
                const oldValue = map.get(key);
                if (oldValue) {
                    map.set(key, oldValue - value);
                }
                else {
                    map.set(key, -value);
                }
            }
            return map;
        }, new Map());
    }
    getOrderedResources() {
        let emptyOrderMap = new Map();
        return this.resourceOrders
            .reduce((map, item) => {
            const key = item.type.id;
            const oldValue = map.get(key);
            if (oldValue) {
                map.set(key, oldValue - item.quantity);
            }
            else {
                map.set(key, -item.quantity);
            }
            return map;
        }, emptyOrderMap);
    }
    getDeficit() {
        let emptyDemandMap = new Map();
        let demand = this.getDemand();
        let supply = this.getSupply();
        let ordered = this.getOrderedResources();
        return new Map([...[...demand.entries(), ...supply.entries(), ...ordered.entries()]
                .reduce((map, item) => {
                const key = item[0];
                const oldValue = map.get(key);
                if (oldValue) {
                    map.set(key, oldValue + item[1]);
                }
                else {
                    map.set(key, item[1]);
                }
                return map;
            }, emptyDemandMap)
                .entries()]
            .filter(item => item[1] > 0));
    }
}
