import { AgentEventArgument } from "../data/AgentEvent.js";
export default class LogisticRobotReserveReply extends AgentEventArgument {
    constructor(id, success, commandId) {
        super();
        this.id = id;
        this.success = success;
        this.commandId = commandId;
    }
}
