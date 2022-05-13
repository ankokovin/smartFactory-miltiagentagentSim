import ProcessInput from "./process/ProcessInput";
import LogisticRobot from "../agents/LogisticRobot";
import Resource from "./material/Resource";
import Holder from "../agents/Holder";
import Point from "./Point";

let idx = 0

export class Command {
    id: string;
    source: Holder | Point;
    destination: Holder;
    resource?: Resource;
    logistic: LogisticRobot;
    input?: ProcessInput;
    logisticLocked: boolean;
    done: boolean
    constructor(source: Holder | Point, destination: Holder, logistic: LogisticRobot, input?: ProcessInput) {
        this.source = source
        this.destination = destination
        this.logistic = logistic
        this.input = input
        this.id = `command-${++idx}`
        this.logisticLocked = false
        this.done = false
    }

    setResource(resource: Resource){
        this.resource = resource
    }

    setLogisticLocked(){
        this.logisticLocked = true
    }
}
