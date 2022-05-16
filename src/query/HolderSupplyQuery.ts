import Provider from "../agents/Provider";
import { AgentEventArgument } from "../data/AgentEvent";


export default class HolderSupplyQuery extends AgentEventArgument {
    source: Provider;
    constructor(source: Provider) {
        super();
        this.source = source;
    }
}
