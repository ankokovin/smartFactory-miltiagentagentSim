import { AgentEventArgument } from "../data/AgentEvent";


export default class ProductionRobotReserveResult extends AgentEventArgument {
    id: string;
    success: boolean;
    constructor(id: string, success: boolean) {
        super();
        this.id = id;
        this.success = success;
    }
}
