import { AgentEventArgument } from '../data/AgentEvent';
export default class LogisticRobotMoveQuery extends AgentEventArgument {
    constructor(command, callback) {
        super();
        this.command = command;
        this.callback = callback;
    }
}
