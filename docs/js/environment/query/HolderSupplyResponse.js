import { AgentEventArgument } from "../data/AgentEvent";
export default class HolderSupplyResponse extends AgentEventArgument {
    constructor(id, resources) {
        super();
        this.id = id;
        this.resources = resources;
    }
}
