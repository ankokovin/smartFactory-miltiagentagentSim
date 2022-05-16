import { AgentEventArgument } from '../data/AgentEvent';
export default class LogisticRobotReserveQuery extends AgentEventArgument {
    constructor(commandId, process) {
        super();
        this.commandId = commandId;
        this.process = process;
    }
}
