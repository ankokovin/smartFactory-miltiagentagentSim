import { AgentEventArgument } from "../data/AgentEvent.js";
export default class LogisticRobotMoveResult extends AgentEventArgument {
    constructor(commandId) {
        super();
        this.commandId = commandId;
    }
}
