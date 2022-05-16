import { AgentEventArgument } from '../data/AgentEvent';
export default class LogisticRobotMoveResult extends AgentEventArgument {
    constructor(commandId) {
        super();
        this.commandId = commandId;
    }
}
