import { AgentEventArgument } from '../data/AgentEvent';


export default class LogisticRobotBusyReply extends AgentEventArgument {
    isReady: boolean;
    id: string;
    constructor(isReady: boolean, id: string) {
        super();
        this.id = id;
        this.isReady = isReady;
    }
}
