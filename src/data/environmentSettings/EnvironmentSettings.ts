import ProductModelEnum from "../ProductModelEnum";
import RandomInterval from "../RandomInterval";
import Message from "../../Message";
import ProductionRobotArgs from "./ProductionRobotArgs";
import ProcessMakerRandomParams from "./ProcessMakerRandomParams";
import ProcessRandomParam from "./ProcessRandomParams";
import StartOrderProportion from "./StartOrderProportion";
import LogisticRobotArgs from "./LogisticRobotArgs";

type LogFunction = (a: Message) => void;

export default interface EnvironmentSettings {
    logFunction: LogFunction,
    delay?: number,
    iterCount: number,
    productionRobotArgs: ProductionRobotArgs,
    logisticRobotArgs: LogisticRobotArgs,
    holderCount: number,
    defaultInternalEventDelay: RandomInterval,
    defaultCommunicationDelay: RandomInterval,
    customerNewOrderDelay: RandomInterval,
    processMakerRandomParams: ProcessMakerRandomParams,
    processRandomParam: ProcessRandomParam,
    startOrderProportion: StartOrderProportion,
    plannerCount: number,
    plannerDurations: Map<ProductModelEnum, RandomInterval>,
    detailTypeCount: number,
    resourceTypeCount: number
}