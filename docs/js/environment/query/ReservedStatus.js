import { AgentEventArgument } from "../data/AgentEvent.js";
export default class ReservedStatus extends AgentEventArgument {
    constructor(resources) {
        super();
        this.resources = resources;
    }
}
