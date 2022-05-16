import { EventHandler } from "../data/AgentEvent";
import Point from "../data/Point";
import RandomInterval from "../data/RandomInterval";
import ResourceType from "../data/types/ResourceType";
import Holder from "./Holder";
import { ResourceCollection } from "../data/ResourceCollection";


export class ReservedHolder extends Holder {
    handleProcessAnnouncementHolder: EventHandler = () => {
        return;
    };
    publicGetResource(r: ResourceType, q: number) {
        return this.getResource(r, q);
    }
    getAllResources(): ResourceCollection {
        return this.resources;
    }
    constructor(communicationDelay: RandomInterval, position: Point) {
        super(communicationDelay, position);
    }
}
