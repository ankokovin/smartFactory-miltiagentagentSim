import { AgentEventArgument } from "../data/AgentEvent.js";
export default class DesignerBusinessReply extends AgentEventArgument {
    constructor(reply, id) {
        super();
        this.isReady = reply;
        this.id = id;
    }
}
