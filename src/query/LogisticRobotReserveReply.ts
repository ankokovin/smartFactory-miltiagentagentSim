import { AgentEventArgument } from '../data/AgentEvent';


export default class LogisticRobotReserveReply extends AgentEventArgument {
    success: boolean;
    id: string;
    commandId: string;
    constructor(id: string, success: boolean, commandId: string) {
        super();
        this.id = id;
        this.success = success;
        this.commandId = commandId;
    }
}
