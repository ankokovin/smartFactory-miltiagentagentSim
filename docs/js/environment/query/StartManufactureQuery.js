import { AgentEventArgument } from "../data/AgentEvent.js";
export default class StartManufactureQuery extends AgentEventArgument {
    constructor(process, callback) {
        super();
        this.process = process;
        this.callback = callback;
    }
}
