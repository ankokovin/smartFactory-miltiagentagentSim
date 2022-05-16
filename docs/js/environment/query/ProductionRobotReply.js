import { AgentEventArgument } from "../data/AgentEvent.js";
export default class ProductionRobotReply extends AgentEventArgument {
    constructor(isReady, id) {
        super();
        this.id = id;
        this.isReady = isReady;
    }
}
