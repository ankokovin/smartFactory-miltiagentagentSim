import { AgentEventArgument } from "../data/AgentEvent.js";
export default class ManifactureResult extends AgentEventArgument {
    constructor(detail) {
        super();
        this.detail = detail;
    }
}
