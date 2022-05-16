import { AgentEventArgument } from "../data/AgentEvent";
export default class ReservedStatusQuery extends AgentEventArgument {
    constructor(callback) {
        super();
        this.callback = callback;
    }
}
