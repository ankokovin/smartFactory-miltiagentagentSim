import ProcessInput from "../process/ProcessInput"
import ProcessOutput from "../process/ProcessOutput"

let idx = 0;

export default class ProcessType {
    processId: string
    input: ProcessInput[]
    output: ProcessOutput

    constructor(input: ProcessInput[], output: ProcessOutput) {
        this.processId = `Process-${++idx}`;
        this.input = input;
        this.output = output;
    }
}