import { AgentEventArgument } from "../data/AgentEvent";
export default class HolderAnnoucementReply extends AgentEventArgument {
    constructor(id, availableInputs) {
        super();
        this.id = id;
        this.availableInputs = availableInputs;
    }
}
