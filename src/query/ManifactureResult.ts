import { AgentEventArgument } from "../data/AgentEvent";
import Detail from "../data/material/Detail";


export default class ManifactureResult extends AgentEventArgument {
    detail: Detail;
    constructor(detail: Detail) {
        super();
        this.detail = detail;
    }
}
