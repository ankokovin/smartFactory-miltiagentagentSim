import { AgentEventArgument } from '../data/AgentEvent';
export default class LogisticRobotBusyReply extends AgentEventArgument {
    constructor(isReady, id) {
        super();
        this.id = id;
        this.isReady = isReady;
    }
}
