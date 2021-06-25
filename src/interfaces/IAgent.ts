export default interface IAgent {
    id: string;
    run(turn?: number): any; 
}