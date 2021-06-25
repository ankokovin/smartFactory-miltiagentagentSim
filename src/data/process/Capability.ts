import ProductionRobotType from "../types/ProductionRobotType";
import ProcessType from "../types/ProcessType";

export default interface Capability {
    productionRobotType: ProductionRobotType
    processType: ProcessType
}