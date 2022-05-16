import { AgentEventArgument } from "../data/AgentEvent";
export default class ReservedStatus extends AgentEventArgument {
    constructor(resources) {
        super();
        this.resources = resources;
    }
}
