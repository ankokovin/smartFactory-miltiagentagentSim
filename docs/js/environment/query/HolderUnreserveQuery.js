import { AgentEventArgument } from "../data/AgentEvent.js";
export default class HolderUnreserveQuery extends AgentEventArgument {
    constructor(resource, source) {
        super();
        this.resource = resource;
        this.source = source;
    }
}
