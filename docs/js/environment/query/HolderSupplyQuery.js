import { AgentEventArgument } from "../data/AgentEvent.js";
export default class HolderSupplyQuery extends AgentEventArgument {
    constructor(source) {
        super();
        this.source = source;
    }
}
