let idx = 0;
export default class ProcessType {
    constructor(input, output) {
        this.processId = `Process-${++idx}`;
        this.input = input;
        this.output = output;
    }
}
