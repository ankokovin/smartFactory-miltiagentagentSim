import { AgentEventArgument } from "../data/AgentEvent";
import ResourceType from "../data/types/ResourceType";
import Process from "../agents/Process";


export default class HolderReserveQuery extends AgentEventArgument {
    type: ResourceType;
    targetQuantity: number;
    source: Process;
    commandId: string;
    constructor(type: ResourceType, targetQuantity: number, source: Process, commandId: string) {
        super();
        this.type = type;
        this.targetQuantity = targetQuantity;
        this.source = source;
        this.commandId = commandId;
    }
}
