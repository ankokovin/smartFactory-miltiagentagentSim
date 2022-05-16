import { AgentEventArgument } from "../data/AgentEvent.js";
export default class LogisticRobotReserveQuery extends AgentEventArgument {
    constructor(commandId, process) {
        super();
        this.commandId = commandId;
        this.process = process;
    }
}
