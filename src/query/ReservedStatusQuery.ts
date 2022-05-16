import { AgentEventArgument, EventHandler } from "../data/AgentEvent";


export default class ReservedStatusQuery extends AgentEventArgument {
    callback: EventHandler;
    constructor(callback: EventHandler) {
        super();
        this.callback = callback;
    }
}
