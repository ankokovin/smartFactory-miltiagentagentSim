import { AgentEventArgument, EventHandler } from "../data/AgentEvent";
import Resource from "../data/material/Resource";


export default class HolderPassResourceQuery extends AgentEventArgument {
    resource: Resource;
    callback: EventHandler;
    constructor(resource: Resource, callback: EventHandler) {
        super();
        this.resource = resource;
        this.callback = callback;
    }
}
