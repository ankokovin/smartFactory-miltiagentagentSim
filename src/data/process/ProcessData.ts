import Order from "../Order";
import ProcessType from "../types/ProcessType";

export default interface ProcessData {
    type: ProcessType
    id?: string
    quantity: number
    source: Order
}