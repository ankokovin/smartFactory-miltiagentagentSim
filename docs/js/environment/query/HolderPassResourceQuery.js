import { AgentEventArgument } from "../data/AgentEvent";
export default class HolderPassResourceQuery extends AgentEventArgument {
    constructor(resource, callback) {
        super();
        this.resource = resource;
        this.callback = callback;
    }
}
