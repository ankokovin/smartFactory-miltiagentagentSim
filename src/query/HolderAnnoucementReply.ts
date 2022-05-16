import { AgentEventArgument } from "../data/AgentEvent";
import ProcessInput from "../data/process/ProcessInput";


export default class HolderAnnoucementReply extends AgentEventArgument {
    id: string;
    availableInputs: Map<ProcessInput, boolean>;
    constructor(id: string, availableInputs: Map<ProcessInput, boolean>) {
        super();
        this.id = id;
        this.availableInputs = availableInputs;
    }
}
