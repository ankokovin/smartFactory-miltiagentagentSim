import { AgentEventArgument } from "../data/AgentEvent";


export default class DesignerBusinessReply extends AgentEventArgument {
    isReady: boolean;
    id: string;

    constructor(reply: boolean, id: string) {
        super();
        this.isReady = reply;
        this.id = id;
    }
}
