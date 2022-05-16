import { AgentEventArgument } from "../data/AgentEvent";
import { ResourceCollection } from "../data/ResourceCollection";


export default class ReservedStatus extends AgentEventArgument {
    resources: ResourceCollection;
    constructor(resources: ResourceCollection) {
        super();
        this.resources = resources;
    }
}
