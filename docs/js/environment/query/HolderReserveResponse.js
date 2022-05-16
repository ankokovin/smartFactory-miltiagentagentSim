import { AgentEventArgument } from "../data/AgentEvent.js";
export default class HolderReserveResponse extends AgentEventArgument {
    constructor(id, result, commandId) {
        super();
        this.id = id;
        this.result = result;
        this.commandId = commandId;
    }
}
