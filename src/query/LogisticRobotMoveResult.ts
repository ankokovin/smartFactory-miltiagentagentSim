import { AgentEventArgument } from '../data/AgentEvent';


export default class LogisticRobotMoveResult extends AgentEventArgument {
    commandId: string;
    constructor(commandId: string) {
        super();
        this.commandId = commandId;
    }
}
