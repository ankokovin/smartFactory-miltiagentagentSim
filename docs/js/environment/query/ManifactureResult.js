import { AgentEventArgument } from "../data/AgentEvent";
export default class ManifactureResult extends AgentEventArgument {
    constructor(detail) {
        super();
        this.detail = detail;
    }
}
