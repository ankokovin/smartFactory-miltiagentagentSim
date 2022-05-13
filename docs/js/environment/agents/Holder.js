import { AgentEventArgument } from "../data/AgentEvent.js";
import Detail from "../data/material/Detail.js";
import Resource from "../data/material/Resource.js";
import { getRandomNumber } from "../data/RandomInterval.js";
import { isDetailType } from "../data/types/DetailType.js";
import { randomInt } from "../utils.js";
import { isProcess } from "./Process.js";
let idx = 0;
export default class Holder {
    constructor(communicationDelay, position) {
        this.resources = new Map();
        this.handleReserveResource = (time, addNewEvent, query) => {
            if (!(query instanceof HolderReserveQuery))
                return;
            const res = this.getResource(query.type, query.targetQuantity);
            if (res)
                res.isReserved = true;
            addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                eventHandler: query.source.handleReserveResourceResponse,
                object: new HolderReserveResponse(this.id, res, query.commandId)
            });
        };
        this.handleUnreserveResource = (_time, _addNewEvent, query) => {
            if (!(query instanceof HolderUnreserveQuery))
                return;
            console.assert(query.resource.position == this.position, 'Illegal unreserve resource: ' + JSON.stringify(query));
            this.addResource(query.resource);
        };
        this.handleProcessAnnouncementHolder = (time, addNewEvent, process) => {
            if (!isProcess(process))
                return;
            addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                object: new HolderAnnoucementReply(this.id, process.currentInputs
                    .reduce((map, input) => map.set(input, this.hasInput(input)), new Map())),
                eventHandler: process.handleHolderAgentAnnouncementResponse
            });
        };
        this.handleProviderQuery = (time, addNewEvent, query) => {
            if (!(query instanceof HolderSupplyQuery))
                return;
            addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                object: new HolderSupplyResponse(this.id, this.getRawResources()),
                eventHandler: query.source.handleSupplyResponse
            });
        };
        this.handlePassResource = (time, addNewEvent, query) => {
            if (!(query instanceof HolderPassResourceQuery))
                return;
            query.resource.isBeingHeld = false;
            this.addResource(query.resource);
            addNewEvent({
                time: time + getRandomNumber(this.communicationDelay),
                eventHandler: query.callback
            });
        };
        this.id = `Holder-${++idx}`;
        this.position = position !== null && position !== void 0 ? position : { x: randomInt(0, 1000), y: randomInt(0, 1000) };
        this.communicationDelay = communicationDelay;
    }
    addResource(r) {
        const key = r.type.id;
        const val = this.resources.get(key);
        if (val) {
            this.resources.set(key, val + r.quantity);
        }
        else {
            this.resources.set(key, r.quantity);
        }
    }
    getResource(r, targetQuantity) {
        const val = this.resources.get(r.id);
        if (!val) {
            return null;
        }
        let res;
        const getRes = (quantity) => {
            if (isDetailType(r))
                return new Detail(this.position, r, quantity);
            return new Resource(this.position, r, quantity);
        };
        if (val > targetQuantity) {
            res = getRes(targetQuantity);
            this.resources.set(r.id, val - targetQuantity);
        }
        else {
            res = getRes(val);
            this.resources.delete(r.id);
        }
        return res;
    }
    updateResource(typeId, value) {
        if (value == 0) {
            this.resources.delete(typeId);
            return;
        }
        this.resources.set(typeId, value);
    }
    run() {
        //    throw new Error("Not implemented")
    }
    hasInput(input) {
        return this.resources.has(input.type.id);
    }
    getRawResources() {
        var _a;
        const result = new Map();
        for (const [typeId, count] of this.resources.entries()) {
            if (typeId.startsWith('Detail'))
                continue;
            result.set(typeId, count + ((_a = result.get(typeId)) !== null && _a !== void 0 ? _a : 0));
        }
        return result;
    }
}
export class HolderReserveQuery extends AgentEventArgument {
    constructor(type, targetQuantity, source, commandId) {
        super();
        this.type = type;
        this.targetQuantity = targetQuantity;
        this.source = source;
        this.commandId = commandId;
    }
}
export class HolderUnreserveQuery extends AgentEventArgument {
    constructor(resource, source) {
        super();
        this.resource = resource;
        this.source = source;
    }
}
export class HolderReserveResponse extends AgentEventArgument {
    constructor(id, result, commandId) {
        super();
        this.id = id;
        this.result = result;
        this.commandId = commandId;
    }
}
export class HolderAnnoucementReply extends AgentEventArgument {
    constructor(id, availableInputs) {
        super();
        this.id = id;
        this.availableInputs = availableInputs;
    }
}
export class HolderSupplyQuery extends AgentEventArgument {
    constructor(source) {
        super();
        this.source = source;
    }
}
export class HolderSupplyResponse extends AgentEventArgument {
    constructor(id, resources) {
        super();
        this.id = id;
        this.resources = resources;
    }
}
export class HolderPassResourceQuery extends AgentEventArgument {
    constructor(resource, callback) {
        super();
        this.resource = resource;
        this.callback = callback;
    }
}
export function isHolder(object) {
    return object === null || object === void 0 ? void 0 : object.id.startsWith('Holder');
}
export class ReservedHolder extends Holder {
    constructor(communicationDelay, position) {
        super(communicationDelay, position);
        this.handleProcessAnnouncementHolder = () => {
            return;
        };
    }
    publicGetResource(r, q) {
        return this.getResource(r, q);
    }
    getAllResources() {
        return this.resources;
    }
}
