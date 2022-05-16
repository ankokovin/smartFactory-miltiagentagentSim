import { AgentEventArgument } from "../data/AgentEvent.js";
export default class HolderSupplyResponse extends AgentEventArgument {
    constructor(id, resources) {
        super();
        this.id = id;
        this.resources = resources;
    }
}
