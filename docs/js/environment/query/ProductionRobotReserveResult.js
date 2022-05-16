import { AgentEventArgument } from "../data/AgentEvent.js";
export default class ProductionRobotReserveResult extends AgentEventArgument {
    constructor(id, success) {
        super();
        this.id = id;
        this.success = success;
    }
}
