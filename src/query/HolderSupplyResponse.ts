import { AgentEventArgument } from "../data/AgentEvent";
import { ResourceCollection } from "../data/ResourceCollection";


export default class HolderSupplyResponse extends AgentEventArgument {
    id: string;
    resources: ResourceCollection;
    constructor(id: string, resources: ResourceCollection) {
        super();
        this.id = id;
        this.resources = resources;
    }
}
