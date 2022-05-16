import { AgentEventArgument } from "../data/AgentEvent";
export default class HolderSupplyQuery extends AgentEventArgument {
    constructor(source) {
        super();
        this.source = source;
    }
}
