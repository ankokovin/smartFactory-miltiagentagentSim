import { AgentEventArgument } from "../data/AgentEvent";
import Resource from "../data/material/Resource";
import Process from "../agents/Process";


export default class HolderUnreserveQuery extends AgentEventArgument {
    resource: Resource;
    source: Process;
    constructor(resource: Resource, source: Process) {
        super();
        this.resource = resource;
        this.source = source;
    }
}
