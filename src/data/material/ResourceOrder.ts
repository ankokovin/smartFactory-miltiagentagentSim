import { AgentEventArgument } from "../AgentEvent";
import ResourceType from "../types/ResourceType";

export default class ResourceOrder extends AgentEventArgument {
    id: string
    type: ResourceType
    quantity: number
    constructor(id: string, type: ResourceType, quantity: number) {
        super()
        this.id = id
        this.type = type
        this.quantity = quantity
    }
}