import { AgentEventArgument } from "../data/AgentEvent.js";
export default class ReservedStatusQuery extends AgentEventArgument {
    constructor(callback) {
        super();
        this.callback = callback;
    }
}
