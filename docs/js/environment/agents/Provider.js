import Resource from "../data/material/Resource.js";
import ResourceOrder from "../data/material/ResourceOrder.js";
import { getRandomNumber } from "../data/RandomInterval.js";
import { isResourceType } from "../data/types/ResourceType.js";
import Holder, { HolderSupplyQuery, HolderSupplyResponse } from "./Holder.js";
let idx = 0;
export default class Provider extends Holder {
    constructor(getHolders, getProcesses, getResourceTypeById, communicationDelay, providerArgs, position) {
        super(communicationDelay);
        this.checkOrders = (time, addNewEvent) => {
            this.currentSupply.clear();
            this.expectingHolderAnswers = true;
            this.getHolders()
                .forEach(holder => addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                object: new HolderSupplyQuery(this),
                eventHandler: holder.handleProviderQuery
            }));
            addNewEvent({
                time: time + getRandomNumber(this.providerArgs.supplyQueryTimeout),
                eventHandler: this.createNewSupplyOrders
            });
        };
        this.createNewSupplyOrders = (time, addNewEvent) => {
            this.expectingHolderAnswers = false;
            const newSupplyOrders = [...this.getDeficit().entries()]
                .map(([typeId, count]) => this.createNewSupplyOrder(typeId, count));
            this.resourceOrders = [...this.resourceOrders, ...newSupplyOrders];
            newSupplyOrders.forEach(order => addNewEvent({
                time: time + getRandomNumber(this.providerArgs.supplyOrderDuration),
                eventHandler: this.handleSupplyOrderCame,
                object: order
            }));
            addNewEvent({
                time: time + getRandomNumber(this.providerArgs.supplyOrderTimeout),
                eventHandler: this.checkOrders
            });
        };
        this.handleSupplyOrderCame = (_time, _addNewEvent, supOrder) => {
            if (!(supOrder instanceof ResourceOrder))
                return;
            this.addResource(new Resource(this.position, supOrder.type, supOrder.quantity));
            this.resourceOrders = this.resourceOrders.filter(order => order.id != supOrder.id);
        };
        this.resourceOrders = [];
        this.handleSupplyResponse = (_time, _addNewEvent, response) => {
            if (!(response instanceof HolderSupplyResponse) || !this.expectingHolderAnswers)
                return;
            for (const [typeId, count] of response.resources.entries()) {
                const curCount = this.currentSupply.get(typeId);
                this.currentSupply.set(typeId, count + (curCount !== null && curCount !== void 0 ? curCount : 0));
            }
        };
        this.id = `Provider-${++idx}`;
        this.position = position !== null && position !== void 0 ? position : { x: 1000, y: 1000 };
        this.getHolders = getHolders;
        this.getProcesses = getProcesses;
        this.getResourceTypeById = getResourceTypeById;
        this.currentSupply = new Map();
        this.expectingHolderAnswers = false;
        this.providerArgs = providerArgs;
    }
    createNewSupplyOrder(typeId, reqCount) {
        const type = this.getResourceTypeById(typeId);
        if (!type)
            throw Error('unexpected typeId ' + typeId);
        const quantity = reqCount * this.providerArgs.safetyMultiplyer;
        return new ResourceOrder(`supply order ${++idx}`, type, quantity);
    }
    updatePosition(newPosition) {
        throw new Error("Provider cannot move.");
    }
    getDemand() {
        const emptyProcessInputList = [];
        const emptyDemandMap = new Map();
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
    getOrderedResources() {
        const emptyOrderMap = new Map();
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
        const emptyDemandMap = new Map();
        const demand = this.getDemand();
        const supply = this.currentSupply;
        const ordered = this.getOrderedResources();
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
