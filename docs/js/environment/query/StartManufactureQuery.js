import { AgentEventArgument } from "../data/AgentEvent";
export default class StartManufactureQuery extends AgentEventArgument {
    constructor(process, callback) {
        super();
        this.process = process;
        this.callback = callback;
    }
}
