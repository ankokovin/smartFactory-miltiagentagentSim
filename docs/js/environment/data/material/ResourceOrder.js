import { AgentEventArgument } from "../AgentEvent.js";
export default class ResourceOrder extends AgentEventArgument {
    constructor(id, type, quantity) {
        super();
        this.id = id;
        this.type = type;
        this.quantity = quantity;
    }
}
