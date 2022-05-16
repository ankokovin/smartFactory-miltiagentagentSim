import Process from '../agents/Process';
import { AgentEventArgument } from '../data/AgentEvent';


export default class LogisticRobotReserveQuery extends AgentEventArgument {
    commandId: string;
    process: Process;
    constructor(commandId: string, process: Process) {
        super();
        this.commandId = commandId;
        this.process = process;
    }
}
