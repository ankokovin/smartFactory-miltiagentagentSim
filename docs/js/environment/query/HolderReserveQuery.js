import { AgentEventArgument } from "../data/AgentEvent.js";
export default class HolderReserveQuery extends AgentEventArgument {
    constructor(type, targetQuantity, source, commandId) {
        super();
        this.type = type;
        this.targetQuantity = targetQuantity;
        this.source = source;
        this.commandId = commandId;
    }
}
