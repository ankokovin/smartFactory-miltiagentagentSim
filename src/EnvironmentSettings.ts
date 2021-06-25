import Message from "./Message";

type LogFunction = (a: Message) => void;

export default interface EnvironmentSettings {
    logFunction: LogFunction,
    delay?: number,
    iterCount: number,
    productionRobotCount: number,
    logisticRobotCount: number,
    orderProbability: number,
    logisticRobotSpeed: number 
}