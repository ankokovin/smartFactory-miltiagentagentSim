let idx = 0;
export class Command {
    constructor(source, destination, logistic, input) {
        this.source = source;
        this.destination = destination;
        this.logistic = logistic;
        this.input = input;
        this.id = `command-${++idx}`;
        this.logisticLocked = false;
        this.done = false;
    }
    setResource(resource) {
        this.resource = resource;
    }
    setLogisticLocked() {
        this.logisticLocked = true;
    }
}
