import Process from "../agents/Process";
import { AgentEventArgument, EventHandler } from "../data/AgentEvent";


export default class StartManufactureQuery extends AgentEventArgument {
    process: Process;
    callback: EventHandler;
    constructor(process: Process, callback: EventHandler) {
        super();
        this.process = process;
        this.callback = callback;
    }
}
