import { AgentEventArgument } from "../data/AgentEvent";
import Resource from "../data/material/Resource";


export default class HolderReserveResponse extends AgentEventArgument {
    id: string;
    result: Resource | null;
    commandId: string;
    constructor(id: string, result: Resource | null, commandId: string) {
        super();
        this.id = id;
        this.result = result;
        this.commandId = commandId;
    }
}
