import { AgentEventArgument } from "../data/AgentEvent.js";
export default class LogisticRobotMoveQuery extends AgentEventArgument {
    constructor(command, callback) {
        super();
        this.command = command;
        this.callback = callback;
    }
}
